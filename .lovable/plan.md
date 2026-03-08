

## Scroll-to-Bottom Button for All Chat Views

### Problem
When opening a chat, users need to land at the absolute bottom. When scrolling up, there's no way to quickly jump back down.

### Approach
The `useInfiniteMessages` hook already scrolls to bottom on initial load (line 109-121). The missing piece is a **scroll-to-bottom button** that appears when the user scrolls up.

### Changes

**1. `src/hooks/useInfiniteMessages.ts`** — Add `showScrollToBottom` state and `scrollToBottom` function:
- Track a boolean `showScrollToBottom` via a scroll event listener on `scrollRef.current`
- Show the button when `distanceFromBottom > 200px`
- Expose `scrollToBottom()` that smoothly scrolls to the end
- Expose `showScrollToBottom` boolean
- Also ensure initial load uses a more reliable double-rAF to guarantee bottom scroll

**2. `src/pages/Chat.tsx`**, **`src/pages/GroupChat.tsx`**, **`src/components/server/ServerChannelChat.tsx`** — Add the floating button:
- Destructure `showScrollToBottom` and `scrollToBottom` from `useInfiniteMessages`
- Render a floating `ChevronDown` button positioned at the bottom-center of the messages container, just above the input area
- Only visible when `showScrollToBottom` is true
- Styled as a small circular button with smooth fade-in/out animation

The button will be a simple inline element in each chat view (not a separate component) — roughly 5 lines of JSX each:
```tsx
{showScrollToBottom && (
  <button onClick={scrollToBottom} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-opacity animate-fade-in">
    <ChevronDown className="h-5 w-5" />
  </button>
)}
```

The messages container `div` will need `relative` added to its className to position the button.

