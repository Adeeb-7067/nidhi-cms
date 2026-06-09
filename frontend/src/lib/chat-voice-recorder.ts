import { useCallback, useEffect, useRef, useState } from "react";

const VOICE_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

export const VOICE_MAX_SECONDS = 120;
export const VOICE_MIN_SECONDS = 1;

function pickVoiceMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return VOICE_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function voiceExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function voiceBlobToFile(blob: Blob, mimeType: string): File {
  const ext = voiceExtension(mimeType);
  return new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType || blob.type });
}

export function formatVoiceDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function useVoiceRecorder(maxSeconds = VOICE_MAX_SECONDS) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopResolverRef = useRef<((file: File | null) => void) | null>(null);

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    stopResolverRef.current?.(null);
    stopResolverRef.current = null;
    cleanupStream();
    setIsRecording(false);
    setSeconds(0);
  }, [cleanupStream]);

  const start = useCallback(async () => {
    if (isRecording) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Voice recording is not supported in this browser.");
    }
    const mimeType = pickVoiceMimeType();
    if (!mimeType) {
      throw new Error("Voice recording is not supported in this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      const file = blob.size > 0 ? voiceBlobToFile(blob, mimeTypeRef.current) : null;
      cleanupStream();
      setIsRecording(false);
      setSeconds(0);
      stopResolverRef.current?.(file);
      stopResolverRef.current = null;
    };

    recorder.start(250);
    setIsRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => Math.min(prev + 1, maxSeconds));
    }, 1000);
  }, [cleanupStream, isRecording, maxSeconds]);

  const stop = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      stopResolverRef.current = resolve;
      recorder.stop();
    });
  }, []);

  return { isRecording, seconds, start, stop, cancel };
}
