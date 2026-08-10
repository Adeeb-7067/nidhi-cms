"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send, X, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { easeExpoOut } from "@/lib/motion";
import { SK_ASSIST_OPEN_EVENT } from "@/data/mission-control";
import { useOverlayScrollLock } from "@/hooks/useOverlayScrollLock";
import { Logo } from "@/components/brand/Logo";
import Link from "next/link";

type ChatRole = "bot" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  link?: { href: string; label: string };
};

const QUICK_PROMPTS = [
  "What services do you offer?",
  "Tell me about AI",
  "How do we start a project?",
  "Where are you based?",
] as const;

function replyTo(input: string): Omit<ChatMessage, "id" | "role"> {
  const q = input.toLowerCase();

  if (q.includes("service") || q.includes("offer") || q.includes("do you")) {
    return {
      text: "We build AI systems, cloud platforms, product engineering, and enterprise solutions — from agentic workflows to mobile and web products.",
      link: { href: "/services", label: "Explore services" },
    };
  }
  if (q.includes("ai") || q.includes("llm") || q.includes("agent")) {
    return {
      text: "Our AI practice ships production agents, RAG platforms, and evaluation harnesses with human-in-the-loop controls.",
      link: { href: "/services/agentic-ai", label: "Agentic AI" },
    };
  }
  if (q.includes("project") || q.includes("start") || q.includes("contact") || q.includes("hire")) {
    return {
      text: "Share your ambition — a principal usually replies within one business day. You can also open the contact flow on the site.",
      link: { href: "/contact", label: "Start a project" },
    };
  }
  if (q.includes("where") || q.includes("location") || q.includes("office") || q.includes("based")) {
    return {
      text: "We’re Bengaluru-rooted and remote-first, with delivery across global time zones.",
      link: { href: "/company", label: "About Satyakabir" },
    };
  }
  if (q.includes("work") || q.includes("case") || q.includes("portfolio")) {
    return {
      text: "Browse selected product and platform work across industries — healthcare, finance, education, and more.",
      link: { href: "/work", label: "View work" },
    };
  }
  if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
    return {
      text: "Hello — I’m SK Assist. Ask about services, AI, careers, or how to begin a project.",
    };
  }

  return {
    text: "I can help with services, AI, work examples, or starting a project. Try a quick prompt below, or ask in your own words.",
    link: { href: "/contact", label: "Talk to a human" },
  };
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hi — I’m SK Assist. Ask about our capabilities, or pick a prompt to begin.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 280);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(SK_ASSIST_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SK_ASSIST_OPEN_EVENT, onOpen);
  }, []);

  // Lock page scroll only on touch devices — desktop can keep reading behind the panel.
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useOverlayScrollLock(open && coarse);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, open]);

  const pushUserAndReply = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    setMessages((prev) => [...prev, { id: uid(), role: "user", text: trimmed }]);
    setInput("");
    setTyping(true);

    window.setTimeout(() => {
      const answer = replyTo(trimmed);
      setMessages((prev) => [...prev, { id: uid(), role: "bot", ...answer }]);
      setTyping(false);
    }, 650 + Math.random() * 450);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    pushUserAndReply(input);
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 14, scale: 0.97, filter: "blur(6px)" }}
            transition={{ duration: 0.3, ease: easeExpoOut }}
            className="pointer-events-auto flex h-[min(520px,72dvh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#090d16] shadow-[0_24px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
            role="dialog"
            aria-label="SK Assist chat"
            data-lenis-prevent
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
          >
            {/* Top edge highlight */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b0f19]/80 px-4 py-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1b2333] border border-white/10 p-1 shadow-sm">
                  <Logo size="sm" className="h-full w-full object-contain" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#090d16] bg-emerald-400" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-display text-[13.5px] font-semibold tracking-tight text-white">SK Assist</p>
                    <span className="text-[10px] font-normal text-slate-400">· AI</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-normal">Satyakabir Assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
                aria-label="Close chat"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>

            <div
              ref={listRef}
              className="scrollbar-hide flex-1 space-y-3 overflow-y-auto px-4 py-3.5"
            >
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.25, ease: easeExpoOut }}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                        m.role === "user"
                          ? "rounded-br-xs bg-[#2b6bff] font-normal text-white"
                          : "rounded-bl-xs border border-white/10 bg-[#121826] text-slate-200",
                      )}
                    >
                      <p>{m.text}</p>
                      {m.link ? (
                        <Link
                          href={m.link.href}
                          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand-cyan transition-colors hover:text-white hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          {m.link.label} →
                        </Link>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {typing ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="rounded-2xl rounded-bl-xs border border-white/10 bg-[#121826] px-3.5 py-2.5">
                    <span className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-slate-400"
                          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 0.7,
                            repeat: Infinity,
                            delay: i * 0.12,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </span>
                  </div>
                </motion.div>
              ) : null}

              {messages.length < 4 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => pushUserAndReply(prompt)}
                      className="rounded-lg border border-white/10 bg-[#121826] px-3 py-1.5 text-[11px] font-normal text-slate-300 transition-colors duration-200 hover:border-white/20 hover:bg-[#182032] hover:text-white active:scale-[0.98]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="border-t border-white/10 p-3 bg-[#070a12]">
              <div className="flex items-center gap-2 rounded-full border border-white/12 bg-[#0c101a] px-2 py-1.5 pl-4 transition-colors duration-200 focus-within:border-white/25">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask SK Assist…"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-slate-500 font-normal"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white text-black font-semibold transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.button
            key="trigger-btn"
            type="button"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.25, ease: easeExpoOut }}
            onClick={() => setOpen(true)}
            className="pointer-events-auto group relative flex items-center gap-2.5 rounded-full border border-white/12 bg-[#090d16] px-3.5 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-200 hover:border-white/25 hover:bg-[#0f1422] hover:shadow-[0_16px_44px_rgba(0,0,0,0.7)] active:scale-[0.98]"
            aria-label="Open SK Assist AI Assistant"
          >
            {/* Specular top highlight */}
            <span aria-hidden className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Avatar Orb */}
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e2638] border border-white/10 p-1 shadow-sm">
              <Logo size="sm" className="h-full w-full object-contain" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#090d16] bg-emerald-400" />
            </span>

            {/* Typography */}
            <div className="flex flex-col items-start text-left pr-0.5">
              <span className="text-[12.5px] font-semibold leading-none tracking-tight text-white group-hover:text-slate-100">
                SK Assist
              </span>
              <span className="mt-0.5 text-[10.5px] font-normal leading-none text-slate-400">
                AI Assistant
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
