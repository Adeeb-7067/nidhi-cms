import { motion } from "framer-motion";

const ORBS = [
  { className: "left-[6%] top-[10%] h-56 w-56", duration: 18, delay: 0 },
  { className: "right-[8%] top-[18%] h-44 w-44", duration: 14, delay: 2 },
  { className: "bottom-[12%] left-[20%] h-52 w-52", duration: 16, delay: 1 },
  { className: "bottom-[6%] right-[14%] h-64 w-64", duration: 20, delay: 3 },
] as const;

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${10 + ((i * 19) % 80)}%`,
  top: `${8 + ((i * 27) % 84)}%`,
  size: 2 + (i % 2),
  duration: 4 + (i % 4),
  delay: i * 0.3,
}));

/** Theme-aware animated backdrop for app loading states. */
export function LoadingBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-background to-primary/[0.12]" />

      <motion.div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.08) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
        animate={{ backgroundPosition: ["0px 0px", "40px 40px"] }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />

      {ORBS.map((orb) => (
        <motion.div
          key={orb.className}
          className={`absolute rounded-full bg-primary/15 blur-3xl ${orb.className}`}
          animate={{
            x: [0, 28, -18, 0],
            y: [0, -22, 12, 0],
            scale: [1, 1.1, 0.92, 1],
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
          className="absolute rounded-full bg-primary/40"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -16, 0], opacity: [0.15, 0.55, 0.15] }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
