"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send, X, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { easeExpoOut } from "@/lib/motion";
import { SK_ASSIST_OPEN_EVENT } from "@/data/mission-control";
import { useOverlayScrollLock } from "@/hooks/useOverlayScrollLock";
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
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 28, scale: 0.94, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 18, scale: 0.96, filter: "blur(8px)" }}
            transition={{ duration: 0.42, ease: easeExpoOut }}
            className="pointer-events-auto flex h-[min(520px,70dvh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-[0_28px_80px_-28px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
            role="dialog"
            aria-label="SK Assist chat"
            data-lenis-prevent
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2B6BFF,#00D9FF)] text-white shadow-[0_0_24px_-6px_rgba(43,107,255,0.8)]">
                  <Bot className="h-4 w-4" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-brand-green" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-foreground">SK Assist</p>
                  <p className="text-[11px] text-muted-foreground">Usually replies instantly</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-secondary-foreground transition-[border-color,color,transform] duration-300 hover:border-border hover:text-foreground active:scale-95"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div
              ref={listRef}
              className="scrollbar-hide flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.35, ease: easeExpoOut }}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                        m.role === "user"
                          ? "rounded-br-md bg-brand-blue text-white shadow-[0_8px_24px_-12px_rgba(43,107,255,0.8)]"
                          : "rounded-bl-md border border-border bg-muted text-foreground",
                      )}
                    >
                      <p>{m.text}</p>
                      {m.link ? (
                        <Link
                          href={m.link.href}
                          className="mt-2 inline-flex text-[12px] font-medium text-brand-cyan transition-colors hover:text-foreground"
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
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="rounded-2xl rounded-bl-md border border-border bg-muted px-3.5 py-3">
                    <span className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-white/50"
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
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => pushUserAndReply(prompt)}
                      className="rounded-full border border-border bg-muted px-3 py-1.5 text-[11px] text-secondary-foreground transition-[border-color,color,background-color,transform] duration-300 hover:border-border hover:bg-muted hover:text-foreground active:scale-[0.97]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-2 py-1.5 pl-3.5 transition-[border-color,box-shadow] duration-300 focus-within:border-brand-cyan/40 focus-within:shadow-[0_0_0_3px_rgba(0,217,255,0.12)]">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask SK Assist…"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2B6BFF,#00D9FF)] text-white transition-[opacity,transform] duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
