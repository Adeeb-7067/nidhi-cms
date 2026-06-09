import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatVoiceDuration } from "@/lib/chat-voice-recorder";
import { cn } from "@/lib/utils";

type VoiceMessagePlayerProps = {
  src: string;
  className?: string;
  compact?: boolean;
  variant?: "sent" | "received";
};

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return formatVoiceDuration(Math.floor(seconds));
}

export function VoiceMessagePlayer({
  src,
  className,
  compact,
  variant = "received",
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const sent = variant === "sent";

  const syncDuration = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
      setLoadError(false);
    }
  }, []);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setLoadError(false);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTimeUpdate = () => setCurrent(audio.currentTime);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onError = () => setLoadError(true);
    const onLoadedMetadata = () => syncDuration();
    const onDurationChange = () => syncDuration();

    const onLoadedData = () => syncDuration();

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("loadeddata", onLoadedData);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("loadeddata", onLoadedData);
    };
  }, [src, syncDuration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || loadError) return;
    try {
      if (playing) {
        audio.pause();
        setPlaying(false);
        return;
      }
      await audio.play();
      setPlaying(true);
      syncDuration();
    } catch {
      setLoadError(true);
      setPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const next = Number(e.target.value);
    audio.currentTime = next;
    setCurrent(next);
  };

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const timeLabel = playing || current > 0 ? formatAudioTime(current) : formatAudioTime(duration);

  return (
    <div
      className={cn(
        "flex min-w-[11rem] max-w-[min(100%,16rem)] items-center gap-2",
        compact && "min-w-[9rem] max-w-[min(100%,13rem)] gap-1.5",
        className,
      )}
    >
      <button
        type="button"
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        disabled={loadError}
        onClick={() => void togglePlay()}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:opacity-40",
          compact ? "h-8 w-8" : "h-9 w-9",
          sent ? "bg-emerald-700/20 text-emerald-950 dark:text-emerald-100" : "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
        )}
      >
        {playing ? (
          <Pause className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} fill="currentColor" />
        ) : (
          <Play className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} fill="currentColor" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(current, duration || 0)}
          disabled={loadError || duration <= 0}
          onChange={handleSeek}
          aria-label="Voice message progress"
          className={cn(
            "voice-progress block h-1.5 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-40",
            sent ? "accent-emerald-800 dark:accent-emerald-300" : "accent-emerald-600",
          )}
          style={{
            background: `linear-gradient(to right, ${
              sent ? "rgb(6 95 70 / 0.55)" : "rgb(5 150 105 / 0.55)"
            } ${progress}%, rgb(0 0 0 / 0.12) ${progress}%)`,
          }}
        />
        <p
          className={cn(
            "mt-1 tabular-nums leading-none",
            compact ? "text-[10px]" : "text-[11px]",
            sent ? "text-emerald-950/70 dark:text-emerald-100/80" : "text-muted-foreground",
            loadError && "text-destructive",
          )}
        >
          {loadError ? "Unable to play" : timeLabel}
        </p>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
}
