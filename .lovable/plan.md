

## Fix Plan: Ringing Sound Glitch + Clickable Links

### 1. Replace Ringing Sound with Synthesized Discord-Style Ringtone

**Problem:** The current ringing uses `notification.mp3` with `HTMLAudioElement.loop = true`. When `startLoop` is called multiple times (triggered by realtime events), multiple overlapping `Audio` elements play simultaneously at different phases, creating the "speeding up / glitching" effect.

**Fix:** Replace the `HTMLAudioElement`-based looping system with a Web Audio API synthesized ringtone that mimics Discord's ringing pattern -- a repeating two-tone "ring-ring... pause... ring-ring..." pattern using oscillators and a `setInterval` for repetition.

Changes in `src/lib/soundManager.ts`:
- Remove the `HTMLAudioElement`-based `startLoop`/`stopLoop` entirely
- Create `startSynthLoop(key)` that uses a `setInterval` to play a two-tone burst every ~3 seconds (outgoing) or ~2 seconds (incoming), using `playSyntheticTone` under the hood
- Use different frequencies for outgoing (higher, calmer) vs incoming (more urgent)
- Track the interval ID and an `AbortController` (or simple flag) to cleanly stop
- `stopLoop` clears the interval
- This eliminates the multi-Audio overlap bug entirely

**Outgoing ring pattern** (calmer, like Discord): Two gentle tones (523Hz, 659Hz) played for 0.4s, repeating every 3s.

**Incoming ring pattern** (more urgent): Two tones (587Hz, 784Hz) played for 0.35s, repeating every 2s.

### 2. Make Links Clickable in All Chat Views

**Problem:** In `Chat.tsx`, `GroupChat.tsx`, and `ServerChannelChat.tsx`, message content is rendered as plain text. URLs are not detected or wrapped in anchor tags.

**Fix:** Create a shared utility function `renderLinkedText(text: string)` in a new file `src/lib/renderLinkedText.tsx` that:
- Splits text using a URL regex pattern (matching `http://`, `https://`, and bare `www.` URLs)
- Wraps matched URLs in `<a>` tags with `target="_blank"`, `rel="noopener noreferrer"`, and styled with `underline text-blue-400 hover:text-blue-300`
- Returns a React fragment with mixed text nodes and anchor elements

Then update the three chat views to use it:

| File | Current | After |
|------|---------|-------|
| `src/pages/Chat.tsx` (line 595) | `{msg.content}` | `{renderLinkedText(msg.content)}` |
| `src/pages/GroupChat.tsx` (line 457) | `{msg.content}` | `{renderLinkedText(msg.content)}` |
| `src/components/server/ServerChannelChat.tsx` (line 368) | `{renderMessageContent(msg.content, ...)}` | Update `renderMessageContent` to also handle URLs within each text part |

---

### Technical Details

**New file:** `src/lib/renderLinkedText.tsx`

```tsx
import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

export function renderLinkedText(text: string): React.ReactNode {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer"
           className="underline text-blue-400 hover:text-blue-300"
           onClick={(e) => e.stopPropagation()}>
          {part}
        </a>
      );
    }
    return part;
  });
}
```

**`soundManager.ts` ringing rewrite** -- key structure:

```typescript
const loopIntervals: Partial<Record<string, number>> = {};

export function startLoop(key: "outgoing_ring" | "incoming_ring"): void {
  stopLoop(key);
  const isOutgoing = key === "outgoing_ring";
  const freqs = isOutgoing ? [523, 659] : [587, 784];
  const interval = isOutgoing ? 3000 : 2000;

  // Play immediately, then repeat
  playSyntheticTone(freqs, 0.4, 0.18, "sine");
  loopIntervals[key] = window.setInterval(() => {
    playSyntheticTone(freqs, 0.4, 0.18, "sine");
  }, interval);
}

export function stopLoop(key: "outgoing_ring" | "incoming_ring"): void {
  const id = loopIntervals[key];
  if (id != null) {
    clearInterval(id);
    delete loopIntervals[key];
  }
}
```

**Files to modify:**
- `src/lib/soundManager.ts` -- replace HTMLAudioElement loops with synthesized ringtone intervals
- `src/lib/renderLinkedText.tsx` -- new shared utility
- `src/pages/Chat.tsx` -- use `renderLinkedText` for message content
- `src/pages/GroupChat.tsx` -- use `renderLinkedText` for message content
- `src/components/server/ServerChannelChat.tsx` -- integrate URL rendering into `renderMessageContent`

