import { motion } from "framer-motion";

type LoginLottieProps = {
  className?: string;
};

const ORBITALS = [
  { rx: 118, ry: 42, duration: 14, reverse: false },
  { rx: 132, ry: 52, duration: 18, reverse: true },
] as const;

const SPHERES = [
  { className: "left-[8%] top-[18%] h-3 w-3 bg-violet-400/70", delay: 0 },
  { className: "right-[6%] top-[28%] h-4 w-4 bg-blue-400/80", delay: 0.4 },
  { className: "left-[18%] bottom-[22%] h-2.5 w-2.5 bg-indigo-300/70", delay: 0.8 },
  { className: "right-[14%] bottom-[18%] h-3.5 w-3.5 bg-violet-500/60", delay: 1.2 },
  { className: "left-[42%] top-[6%] h-2 w-2 bg-blue-300/60", delay: 0.6 },
] as const;

/** Hero graphic matching login reference — 3D chart tile with orbital rings (replaces Lottie JSON). */
export function LoginLottie({ className = "h-[160px] w-full max-w-[300px]" }: LoginLottieProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className={`relative mx-auto flex items-center justify-center ${className}`}
      aria-hidden
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute h-40 w-40 rounded-full bg-blue-500/25 blur-3xl"
        animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbital rings */}
      <svg
        className="absolute h-full w-full max-w-[280px] overflow-visible"
        viewBox="0 0 280 160"
        fill="none"
      >
        {ORBITALS.map((ring, i) => (
          <motion.ellipse
            key={i}
            cx="140"
            cy="80"
            rx={ring.rx}
            ry={ring.ry}
            stroke="url(#orbitGrad)"
            strokeWidth="1.5"
            strokeOpacity="0.55"
            animate={{ rotate: ring.reverse ? -360 : 360 }}
            transition={{ duration: ring.duration, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "140px 80px" }}
          />
        ))}
        <defs>
          <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating spheres */}
      {SPHERES.map((s) => (
        <motion.span
          key={s.className}
          className={`absolute rounded-full shadow-lg shadow-blue-500/20 ${s.className}`}
          animate={{ y: [0, -10, 0], x: [0, 4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
        />
      ))}

      {/* 3D chart tile */}
      <motion.div
        className="relative z-10"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative h-[88px] w-[88px] rounded-[22px] bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-2xl shadow-blue-600/40 ring-1 ring-white/30 sm:h-[96px] sm:w-[96px] sm:rounded-3xl">
          <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-white/25 via-transparent to-transparent" />
          <div className="absolute -inset-1 rounded-[inherit] bg-blue-400/20 blur-md" />

          <svg
            className="absolute inset-0 h-full w-full p-4"
            viewBox="0 0 64 64"
            fill="none"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M8 48 L20 36 L32 42 L44 22 L56 28"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0.6 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
            />
            <motion.path
              d="M8 48 L20 36 L32 42 L44 22 L56 28 L56 52 L8 52 Z"
              fill="url(#chartFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              transition={{ duration: 1.2, delay: 1 }}
            />
            <defs>
              <linearGradient id="chartFill" x1="8" y1="22" x2="56" y2="52" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0.5" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[
              { cx: 20, cy: 36, delay: 1.2 },
              { cx: 32, cy: 42, delay: 1.35 },
              { cx: 44, cy: 22, delay: 1.5 },
              { cx: 56, cy: 28, delay: 1.65 },
            ].map((dot) => (
              <motion.circle
                key={dot.cx}
                cx={dot.cx}
                cy={dot.cy}
                r="3"
                fill="white"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: dot.delay, type: "spring", stiffness: 400, damping: 18 }}
              />
            ))}
          </svg>
        </div>

        {/* Tile shadow / depth */}
        <div className="absolute -bottom-3 left-1/2 h-4 w-[70%] -translate-x-1/2 rounded-full bg-blue-900/15 blur-md" />
      </motion.div>
    </motion.div>
  );
}
