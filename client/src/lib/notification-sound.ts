/**
 * Client-side notification chime (`/notification.mp3`).
 *
 * Browsers only allow media playback after a user gesture, so the module
 * arms the Audio element on the first pointer/key gesture and silently skips
 * plays before that (matching how Telegram behaves straight after login).
 * Rapid bursts are throttled so a sync flood cannot machine-gun the chime.
 */

const SOUND_URL = "/notification.mp3";
const THROTTLE_MS = 300;

let audio: HTMLAudioElement | null = null;
let lastPlayed = 0;
let initialized = false;

const arm = (): void => {
  if (audio || typeof window === "undefined") return;
  try {
    audio = new Audio(SOUND_URL);
    audio.preload = "auto";
    audio.volume = 1;
    audio.loop = false;
  } catch {
    audio = null;
  }
};

/**
 * Hooks the autoplay-policy unlock. Call once from the app root (SocketProvider).
 * The first gesture also plays a zero-volume copy of the chime, which grants
 * the origin audio permission so later `play()` calls (outside a gesture) work.
 */
export const initNotificationSound = (): void => {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  const unlock = () => {
    // A muted play inside the gesture unlocks audio for the whole page.
    try {
      const silent = new Audio(SOUND_URL);
      silent.volume = 0;
      const p = silent.play();
      if (p) p.catch(() => undefined);
    } catch {
      /* policy unchanged — keep skipping until a later gesture */
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("visibilitychange", unlock);
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
  // Some browsers also unlock on first tab focus.
  window.addEventListener("visibilitychange", unlock);
};

/** Plays the chime if the browser has granted audio permission. */
export const playNotificationSound = (): void => {
  if (!audio) arm();
  if (!audio) return;

  const now = Date.now();
  if (now - lastPlayed < THROTTLE_MS) return;
  lastPlayed = now;

  try {
    audio.currentTime = 0;
    const p = audio.play();
    if (p) p.catch(() => undefined);
  } catch {
    /* not unlocked yet */
  }
};