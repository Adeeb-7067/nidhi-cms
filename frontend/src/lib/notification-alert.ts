/**
 * Repeating alert tone until explicitly stopped (e.g. when unread notifications = 0).
 */

let intervalId: ReturnType<typeof setInterval> | null = null;
let audioCtx: AudioContext | null = null;
let beepToggle = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Single harsh beep (square wave). */
export function playAlertBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  beepToggle = !beepToggle;
  const freq = beepToggle ? 1200 : 900;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
}

export function isAlertPlaying(): boolean {
  return intervalId !== null;
}

/** Start repeating alert every ~2s until stopPersistentAlert(). */
export function startPersistentAlert(): void {
  if (intervalId !== null) return;
  playAlertBeep();
  intervalId = setInterval(playAlertBeep, 2000);
}

export function stopPersistentAlert(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
