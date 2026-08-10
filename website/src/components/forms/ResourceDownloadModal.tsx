"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, FileText, Download, CheckCircle2, ShieldCheck } from "lucide-react";
import { submitContact } from "@/lib/contact";
import { useOverlayScrollLock } from "@/hooks/useOverlayScrollLock";
import { PremiumButton } from "@/components/ui/PremiumButton";

export function ResourceDownloadModal({
  title,
  pdfFileName,
  open,
  onClose,
}: {
  title: string;
  pdfFileName?: string;
  open: boolean;
  onClose: () => void;
}) {
  useOverlayScrollLock(open);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    const res = await submitContact({
      name: name || "Whitepaper Lead",
      email,
      message: `Requested Download: ${title} (${pdfFileName || "PDF"})`,
      intent: "newsletter",
      page: "/insights/whitepapers",
    });

    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || "Could not process request.");
      return;
    }

    setDownloadReady(true);
  };

  const handleTriggerDownload = () => {
    // Trigger virtual PDF download
    const element = document.createElement("a");
    const file = new Blob(
      [
        `Satyakabir Executive Whitepaper: ${title}\nDownloaded by: ${email}\nDate: ${new Date().toISOString()}\n\nFull PDF document access granted.`,
      ],
      { type: "text/plain" },
    );
    element.href = URL.createObjectURL(file);
    element.download = pdfFileName || "Satyakabir_Research_Whitepaper.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="resource-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        <motion.div
          key="resource-modal-window"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          role="dialog"
          aria-modal
          aria-label={`Download ${title}`}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/14 bg-[#090d16] p-6 text-foreground shadow-2xl backdrop-blur-2xl md:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
              <FileText className="h-6 w-6" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="mt-4 font-display text-xl font-bold leading-snug text-foreground md:text-2xl">
            {title}
          </h3>

          {downloadReady ? (
            <div className="mt-6 space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="text-small text-muted-foreground">
                Access granted! Your download link is ready below and has also been emailed to <strong className="text-foreground">{email}</strong>.
              </p>
              <PremiumButton onClick={handleTriggerDownload} className="w-full justify-center">
                <Download className="h-4 w-4" /> Download PDF Now
              </PremiumButton>
            </div>
          ) : (
            <form onSubmit={handleDownloadSubmit} className="mt-6 space-y-4">
              <p className="text-small text-muted-foreground">
                Enter your work details to access the full report and executive summary.
              </p>

              <div>
                <label className="mb-1 block text-label text-secondary-foreground">Your Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="w-full rounded-xl border border-border bg-muted p-3 text-small text-foreground outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="mb-1 block text-label text-secondary-foreground">Work Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@company.com"
                  className="w-full rounded-xl border border-border bg-muted p-3 text-small text-foreground outline-none focus:border-brand-blue"
                />
              </div>

              {errorMsg && <p className="text-small text-red-400">{errorMsg}</p>}

              <PremiumButton type="submit" disabled={submitting} className="w-full justify-center">
                {submitting ? "Verifying..." : "Unlock & Download Report"}
              </PremiumButton>

              <p className="text-center text-meta text-muted-foreground flex items-center justify-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Zero spam guarantee · Unsubscribe anytime
              </p>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
