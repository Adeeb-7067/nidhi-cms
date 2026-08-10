"use client";

import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Upload, CheckCircle2, FileText, Briefcase, MapPin, Sparkles } from "lucide-react";
import type { JobPosition } from "@/data/careers";
import { submitContact } from "@/lib/contact";
import { useOverlayScrollLock } from "@/hooks/useOverlayScrollLock";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { easeExpoOut } from "@/lib/motion";

type Status = "idle" | "submitting" | "success" | "error";

export function JobApplicationModal({
  position,
  open,
  onClose,
}: {
  position: JobPosition | null;
  open: boolean;
  onClose: () => void;
}) {
  useOverlayScrollLock(open);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open || !position) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Resume file must be under 5MB.");
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const portfolio = String(formData.get("portfolio") ?? "");
    const coverNote = String(formData.get("coverNote") ?? "");

    const message = [
      `Application for position: ${position.title} (${position.department})`,
      `Location: ${position.location}`,
      phone ? `Phone: ${phone}` : null,
      portfolio ? `Portfolio/LinkedIn: ${portfolio}` : null,
      selectedFile ? `Resume File: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : null,
      "",
      coverNote ? `Cover Note:\n${coverNote}` : "No cover note provided.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await submitContact({
      name,
      email,
      message,
      intent: "job-application",
      page: `/careers/open-positions#${position.slug}`,
    });

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error || "Failed to submit application. Please try again.");
      return;
    }

    setStatus("success");
  };

  const resetAndClose = () => {
    setStatus("idle");
    setErrorMsg(null);
    setSelectedFile(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="job-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6"
      >
        {/* Backdrop */}
        <button
          type="button"
          onClick={resetAndClose}
          aria-label="Close modal"
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          key="job-modal-window"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.28, ease: easeExpoOut }}
          role="dialog"
          aria-modal
          aria-label={`Apply for ${position.title}`}
          data-lenis-prevent
          className="relative z-10 flex max-h-[min(880px,92dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/14 bg-[#090d16] text-foreground shadow-[0_32px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
        >
          {/* Header */}
          <header className="flex items-start justify-between gap-4 border-b border-border/60 bg-surface/80 p-5 md:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-meta text-brand-cyan">
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-cyan/10 px-2 py-0.5 text-[11px] font-medium text-brand-cyan">
                  <Briefcase className="h-3 w-3" /> {position.department}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {position.location}
                </span>
              </div>
              <h2 className="mt-2 font-display text-[22px] font-bold leading-tight text-foreground md:text-[26px]">
                {position.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Scrollable Content */}
          <div className="scrollbar-hide flex-1 overflow-y-auto p-5 md:p-6">
            {status === "success" ? (
              <div className="py-12 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                >
                  <CheckCircle2 className="h-8 w-8" />
                </motion.div>
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Application Received!
                </h3>
                <p className="mx-auto mt-2 max-w-md text-small text-muted-foreground">
                  Thank you for applying to the <strong className="text-foreground">{position.title}</strong> role. Our engineering team reviews candidate profiles weekly and will be in touch shortly.
                </p>
                <PremiumButton onClick={resetAndClose} className="mt-6">
                  Close & Continue Exploring
                </PremiumButton>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Role Details */}
                <div className="rounded-xl border border-border/60 bg-surface/50 p-4 text-small space-y-3">
                  <p className="text-foreground leading-relaxed">{position.summary}</p>
                  <div>
                    <h4 className="font-medium text-foreground text-[13px] uppercase tracking-wider mb-1">
                      Key Responsibilities
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[13px]">
                      {position.responsibilities.slice(0, 3).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="app-name" className="mb-1.5 block text-label text-secondary-foreground">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="app-name"
                        name="name"
                        required
                        placeholder="e.g. Alex Morgan"
                        disabled={status === "submitting"}
                        className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
                      />
                    </div>
                    <div>
                      <label htmlFor="app-email" className="mb-1.5 block text-label text-secondary-foreground">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="app-email"
                        name="email"
                        type="email"
                        required
                        placeholder="alex@example.com"
                        disabled={status === "submitting"}
                        className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="app-phone" className="mb-1.5 block text-label text-secondary-foreground">
                        Phone Number
                      </label>
                      <input
                        id="app-phone"
                        name="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        disabled={status === "submitting"}
                        className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
                      />
                    </div>
                    <div>
                      <label htmlFor="app-portfolio" className="mb-1.5 block text-label text-secondary-foreground">
                        LinkedIn / GitHub / Portfolio
                      </label>
                      <input
                        id="app-portfolio"
                        name="portfolio"
                        type="url"
                        placeholder="https://github.com/username"
                        disabled={status === "submitting"}
                        className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
                      />
                    </div>
                  </div>

                  {/* Resume Upload Picker */}
                  <div>
                    <label className="mb-1.5 block text-label text-secondary-foreground">
                      Attach Resume / CV (.pdf, .docx, max 5MB)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border bg-surface p-3.5 transition-colors hover:border-brand-blue/60"
                    >
                      {selectedFile ? (
                        <div className="flex items-center gap-2 text-small text-foreground">
                          <FileText className="h-4 w-4 text-brand-cyan" />
                          <span className="font-medium">{selectedFile.name}</span>
                          <span className="text-meta text-muted-foreground">
                            ({(selectedFile.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-small text-muted-foreground">
                          <Upload className="h-4 w-4 text-brand-blue" />
                          <span>Click to select PDF or Word document</span>
                        </div>
                      )}
                      <span className="text-meta text-label text-brand-blue">Browse</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="app-cover" className="mb-1.5 block text-label text-secondary-foreground">
                      Why Satyakabir & what craft do you bring?
                    </label>
                    <textarea
                      id="app-cover"
                      name="coverNote"
                      rows={3}
                      placeholder="Briefly introduce yourself, your signature projects, or why this position caught your eye..."
                      disabled={status === "submitting"}
                      className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-small text-red-400" role="alert">
                      {errorMsg}
                    </p>
                  )}

                  <div className="pt-2">
                    <PremiumButton
                      type="submit"
                      disabled={status === "submitting"}
                      className="w-full justify-center"
                    >
                      {status === "submitting" ? "Submitting Application..." : "Submit Application"}
                    </PremiumButton>
                  </div>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
