/**
 * Sound Manager — plays audio cues for call events and UI interactions.
 * All sounds are loaded lazily and cached. Looping sounds (ring tones)
 * are tracked so they can be stopped at any time.
 */

type SoundKey =
  | "outgoing_ring"
  | "incoming_ring"
  | "call_end"
  | "mute"
  | "unmute"
  | "deafen"
  | "undeafen";

// Map each sound to a public URL (using Discord-like tone patterns via Web Audio API for ring tones,
// and short synthetic tones for UI clicks — all generated inline so no extra assets are needed).
// For ringtones we use the existing /notification.mp3 as a base and generate synthetic UI sounds.

const SOUND_URLS: Record<SoundKey, string | null> = {
  outgoing_ring: "/notification.mp3",  // Will loop — represents outgoing dial tone
  incoming_ring: "/notification.mp3",  // Will loop — represents incoming ring
  call_end: null,        // Synthetic: descending tone
  mute: null,            // Synthetic: short low beep
  unmute: null,          // Synthetic: short high beep
  deafen: null,          // Synthetic: double low beep
  undeafen: null,        // Synthetic: double high beep
};

// AudioContext for synthetic sounds
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/**
 * Play a synthetic tone using Web Audio API.
 */
function playSyntheticTone(
  frequencies: number[],
  duration: number,
  gainValue = 0.18,
  type: OscillatorType = "sine"
): void {
  try {
    const ctx = getAudioContext();
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
      gainNode.gain.linearRampToValueAtTime(gainValue, now + i * stepDuration + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, now + (i + 1) * stepDuration - 0.01);

      oscillator.start(now + i * stepDuration);
      oscillator.stop(now + (i + 1) * stepDuration);
    });
  } catch {
    // Audio context not available
  }
}

// Looping audio elements (for ringtones)
const loopingAudios: Partial<Record<SoundKey, HTMLAudioElement>> = {};

/**
 * Start looping a sound (e.g., a ringtone). Call stopLoop() to stop it.
 */
export function startLoop(key: "outgoing_ring" | "incoming_ring"): void {
  stopLoop(key); // Stop any existing loop first
  const url = SOUND_URLS[key];
  if (!url) return;
  try {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.6;
    audio.play().catch(() => {});
    loopingAudios[key] = audio;
  } catch {
    // Audio not available
  }
}

/**
 * Stop a looping sound.
 */
export function stopLoop(key: "outgoing_ring" | "incoming_ring"): void {
  const audio = loopingAudios[key];
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    delete loopingAudios[key];
  }
}

/**
 * Stop all looping sounds.
 */
export function stopAllLoops(): void {
  (["outgoing_ring", "incoming_ring"] as const).forEach(stopLoop);
}

/**
 * Play a one-shot sound effect.
 */
export function playSound(key: SoundKey): void {
  switch (key) {
    case "call_end":
      // Descending 3-note tone
      playSyntheticTone([880, 660, 440], 0.45, 0.2, "sine");
      break;
    case "mute":
      // Single low short beep
      playSyntheticTone([440], 0.12, 0.15, "sine");
      break;
    case "unmute":
      // Single higher short beep
      playSyntheticTone([660], 0.12, 0.15, "sine");
      break;
    case "deafen":
      // Two descending beeps
      playSyntheticTone([660, 440], 0.22, 0.15, "sine");
      break;
    case "undeafen":
      // Two ascending beeps
      playSyntheticTone([440, 660], 0.22, 0.15, "sine");
      break;
    case "outgoing_ring":
    case "incoming_ring":
      // These are handled via startLoop/stopLoop
      break;
  }
}
