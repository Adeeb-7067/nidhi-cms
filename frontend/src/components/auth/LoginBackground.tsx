import { motion } from "framer-motion";

const ORBS = [
  { className: "left-[8%] top-[12%] h-64 w-64 bg-blue-400/25", duration: 18, delay: 0 },
  { className: "right-[10%] top-[20%] h-48 w-48 bg-indigo-400/20", duration: 14, delay: 2 },
  { className: "bottom-[15%] left-[25%] h-56 w-56 bg-violet-400/20", duration: 16, delay: 1 },
  { className: "bottom-[8%] right-[18%] h-72 w-72 bg-cyan-400/15", duration: 20, delay: 3 },
] as const;

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${8 + ((i * 17) % 84)}%`,
  top: `${6 + ((i * 23) % 88)}%`,
  size: 2 + (i % 3),
  duration: 4 + (i % 5),
  delay: i * 0.35,
}));

export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/95 to-indigo-100/90" />

      <motion.div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
        animate={{ backgroundPosition: ["0px 0px", "48px 48px"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {ORBS.map((orb) => (
        <motion.div
          key={orb.className}
          className={`absolute rounded-full blur-3xl ${orb.className}`}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 15, 0],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}

      {PARTICLES.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-blue-500/30"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}

      <motion.div
        className="absolute -right-20 top-1/3 h-[420px] w-[420px] rounded-full border border-white/40 bg-gradient-to-br from-white/20 to-transparent"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
