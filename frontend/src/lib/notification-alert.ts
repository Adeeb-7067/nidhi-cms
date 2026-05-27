/**
 * Short notification alert: three beeps, then silence (no repeating loop).
 */

const ALERT_BEEP_COUNT = 3;
const ALERT_BEEP_GAP_MS = 650;

let beepTimeoutId: ReturnType<typeof setTimeout> | null = null;
let beepsPlayed = 0;
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

function scheduleNextBeep(): void {
  beepTimeoutId = setTimeout(() => {
    beepTimeoutId = null;
    if (beepsPlayed >= ALERT_BEEP_COUNT) return;
    playAlertBeep();
    beepsPlayed += 1;
    if (beepsPlayed < ALERT_BEEP_COUNT) {
      scheduleNextBeep();
    }
  }, ALERT_BEEP_GAP_MS);
}

export function isAlertPlaying(): boolean {
  return beepTimeoutId !== null || (beepsPlayed > 0 && beepsPlayed < ALERT_BEEP_COUNT);
}

/** Play exactly three alert beeps, then stop. */
export function playNotificationAlert(): void {
  stopPersistentAlert();
  playAlertBeep();
  beepsPlayed = 1;
  if (ALERT_BEEP_COUNT > 1) {
    scheduleNextBeep();
  }
}

/** Cancel any scheduled beeps (e.g. when all notifications are read). */
export function stopPersistentAlert(): void {
  if (beepTimeoutId !== null) {
    clearTimeout(beepTimeoutId);
    beepTimeoutId = null;
  }
  beepsPlayed = 0;
}

/** @deprecated Use playNotificationAlert */
export const startPersistentAlert = playNotificationAlert;
