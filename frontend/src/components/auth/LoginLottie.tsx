import React, { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import loginHeroAnimation from "@/assets/lottie/login-hero.json";

const Lottie = lazy(() => import("lottie-react"));

type LoginLottieProps = {
  className?: string;
};

function LottieFallback({ className }: { className?: string }) {
  return (
    <div className={className ?? "flex h-[140px] w-full items-center justify-center"}>
      <motion.div
        className="h-28 w-28 rounded-3xl bg-gradient-to-br from-blue-400/30 to-indigo-500/20 shadow-xl shadow-blue-500/10"
        animate={{ y: [0, -12, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export function LoginLottie({ className = "h-[140px] w-full max-w-[280px]" }: LoginLottieProps) {
  return (
    <Suspense fallback={<LottieFallback className={className} />}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full shrink-0"
      >
        <Lottie animationData={loginHeroAnimation} loop className={className} aria-hidden />
      </motion.div>
    </Suspense>
  );
}
