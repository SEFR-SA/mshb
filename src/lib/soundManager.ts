/**
 * Sound Manager — plays audio cues for call events and UI interactions.
 * Pre-warms AudioContext on first user gesture for instant playback.
 */

type SoundKey =
  | "outgoing_ring"
  | "incoming_ring"
  | "call_end"
  | "mute"
  | "unmute"
  | "deafen"
  | "undeafen";

const SOUND_URLS: Record<SoundKey, string | null> = {
  outgoing_ring: "/notification.mp3",
  incoming_ring: "/notification.mp3",
  call_end: null,
  mute: null,
  unmute: null,
  deafen: null,
  undeafen: null,
};

// Singleton AudioContext — created and resumed eagerly on first user gesture
let audioCtx: AudioContext | null = null;
let warmedUp = false;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/**
 * Pre-warm the AudioContext so subsequent playSound() calls are instant.
 * Called once on the first user click/keydown anywhere in the app.
 */
function warmUp() {
  if (warmedUp) return;
  warmedUp = true;
  const ctx = getAudioContext();
  // Resume immediately — we're inside a user gesture handler
  ctx.resume().catch(() => {});
  // Play a silent buffer to fully unlock the context on all browsers
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {}
}

// Attach warm-up listeners once — they self-remove after first trigger
if (typeof window !== "undefined") {
  const onGesture = () => {
    warmUp();
    window.removeEventListener("click", onGesture, true);
    window.removeEventListener("keydown", onGesture, true);
    window.removeEventListener("pointerdown", onGesture, true);
  };
  window.addEventListener("click", onGesture, true);
  window.addEventListener("keydown", onGesture, true);
  window.addEventListener("pointerdown", onGesture, true);
}

/**
 * Play a synthetic tone using Web Audio API — synchronous scheduling,
 * no awaits needed because context is pre-warmed.
 */
function playSyntheticTone(
  frequencies: number[],
  duration: number,
  gainValue = 0.25,
  type: OscillatorType = "sine"
): void {
  try {
    const ctx = getAudioContext();
    // Ensure resumed (should already be from warmUp, but just in case)
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const stepDuration = duration / frequencies.length;

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, now + i * stepDuration);

      gainNode.gain.setValueAtTime(0, now + i * stepDuration);
      gainNode.gain.linearRampToValueAtTime(gainValue, now + i * stepDuration + 0.005);
      gainNode.gain.linearRampToValueAtTime(0, now + (i + 1) * stepDuration - 0.005);

      oscillator.start(now + i * stepDuration);
      oscillator.stop(now + (i + 1) * stepDuration);
    });
  } catch {
    // Audio context not available
  }
}

// Synthesized looping ringtones (replaces HTMLAudioElement to prevent overlap glitch)
const loopIntervals: Partial<Record<string, number>> = {};

export function startLoop(key: "outgoing_ring" | "incoming_ring"): void {
  stopLoop(key);
  const isOutgoing = key === "outgoing_ring";
  // Outgoing: calmer two-tone, incoming: more urgent
  const freqs = isOutgoing ? [523, 659] : [587, 784];
  const interval = isOutgoing ? 3000 : 2000;
  const duration = isOutgoing ? 0.4 : 0.35;

  // Play immediately, then repeat on interval
  playSyntheticTone(freqs, duration, 0.18, "sine");
  loopIntervals[key] = window.setInterval(() => {
    playSyntheticTone(freqs, duration, 0.18, "sine");
  }, interval);
}

export function stopLoop(key: "outgoing_ring" | "incoming_ring"): void {
  const id = loopIntervals[key];
  if (id != null) {
    clearInterval(id);
    delete loopIntervals[key];
  }
}

export function stopAllLoops(): void {
  (["outgoing_ring", "incoming_ring"] as const).forEach(stopLoop);
}

/**
 * Play a one-shot sound effect — fully synchronous, instant playback.
 * Works anywhere in the app (calls, voice channels, or standalone).
 */
export function playSound(key: SoundKey): void {
  // Ensure context is alive on every call (covers edge cases)
  warmUp();

  switch (key) {
    case "call_end":
      playSyntheticTone([880, 660, 440], 0.45, 0.25, "sine");
      break;
    case "mute":
      playSyntheticTone([440], 0.15, 0.22, "sine");
      break;
    case "unmute":
      playSyntheticTone([660], 0.15, 0.22, "sine");
      break;
    case "deafen":
      playSyntheticTone([660, 440], 0.25, 0.22, "sine");
      break;
    case "undeafen":
      playSyntheticTone([440, 660], 0.25, 0.22, "sine");
      break;
    case "outgoing_ring":
    case "incoming_ring":
      break;
  }
}
