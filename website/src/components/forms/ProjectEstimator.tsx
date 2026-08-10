"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Sparkles,
  Bot,
  Globe,
  Smartphone,
  Cloud,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  DollarSign,
  ShieldCheck,
  Send,
} from "lucide-react";
import { submitContact } from "@/lib/contact";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { easeExpoOut } from "@/lib/motion";

type ServiceType = {
  id: string;
  title: string;
  desc: string;
  icon: typeof Bot;
  baseCost: number;
};

const SERVICES: ServiceType[] = [
  {
    id: "ai-agent",
    title: "AI & Autonomous Agents",
    desc: "Agentic workflows, RAG knowledge search, LLM fine-tuning, and evals.",
    icon: Bot,
    baseCost: 25000,
  },
  {
    id: "web-app",
    title: "High-Performance Web App",
    desc: "Next.js App Router, React, responsive design, and API backends.",
    icon: Globe,
    baseCost: 18000,
  },
  {
    id: "mobile-app",
    title: "Mobile Application",
    desc: "Native iOS/Android or cross-platform Flutter/React Native experience.",
    icon: Smartphone,
    baseCost: 22000,
  },
  {
    id: "cloud-infra",
    title: "Cloud & DevOps Estate",
    desc: "Kubernetes, Terraform IaC, landing zones, and SRE pipelines.",
    icon: Cloud,
    baseCost: 20000,
  },
  {
    id: "enterprise-suite",
    title: "Enterprise ERP / CRM",
    desc: "Custom modular operations suite with compliance and audit trails.",
    icon: Building2,
    baseCost: 35000,
  },
];

type ScaleType = {
  id: string;
  title: string;
  desc: string;
  multiplier: number;
  weeks: string;
};

const SCALES: ScaleType[] = [
  {
    id: "mvp",
    title: "Focused Slice / MVP",
    desc: "First release to test market hypothesis with speed and low overhead.",
    multiplier: 1.0,
    weeks: "4 - 6 weeks",
  },
  {
    id: "production",
    title: "Production Scale",
    desc: "Full-featured platform built for active customer growth and high traffic.",
    multiplier: 1.8,
    weeks: "8 - 12 weeks",
  },
  {
    id: "enterprise",
    title: "Enterprise System",
    desc: "Multi-tenant architecture with SOC2 compliance, SLA, and 24/7 ops.",
    multiplier: 2.8,
    weeks: "3 - 6 months",
  },
];

type FeatureOption = {
  id: string;
  label: string;
  cost: number;
};

const FEATURES: FeatureOption[] = [
  { id: "auth", label: "Zero-Trust Auth & RBAC", cost: 3500 },
  { id: "ai-assistant", label: "Embedded AI Chat / Copilot", cost: 6500 },
  { id: "analytics", label: "Realtime Analytics & Telemetry", cost: 4000 },
  { id: "messaging", label: "Realtime WebSockets & Push", cost: 4500 },
  { id: "integrations", label: "Third-Party API & ERP Mesh", cost: 5500 },
  { id: "compliance", label: "HIPAA / SOC2 Audit Evidence", cost: 7000 },
];

export function ProjectEstimator() {
  const [step, setStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<ServiceType>(SERVICES[0]);
  const [selectedScale, setSelectedScale] = useState<ScaleType>(SCALES[1]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "auth",
    "analytics",
  ]);

  // Lead submission details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleFeature = (id: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  // Calculate live estimate
  const featuresTotal = selectedFeatures.reduce((acc, fId) => {
    const feat = FEATURES.find((f) => f.id === fId);
    return acc + (feat ? feat.cost : 0);
  }, 0);

  const rawEstimate = Math.round(
    (selectedService.baseCost + featuresTotal) * selectedScale.multiplier,
  );
  const estLow = Math.round(rawEstimate * 0.9);
  const estHigh = Math.round(rawEstimate * 1.15);

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMsg("Please enter your name and work email.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const featureNames = selectedFeatures
      .map((fId) => FEATURES.find((f) => f.id === fId)?.label)
      .filter(Boolean)
      .join(", ");

    const summaryText = [
      `Scope Estimate Request:`,
      `- Primary Focus: ${selectedService.title}`,
      `- Target Scale: ${selectedScale.title} (${selectedScale.weeks})`,
      `- Features: ${featureNames || "Basic"}`,
      `- Estimated Range: $${estLow.toLocaleString()} - $${estHigh.toLocaleString()}`,
      company ? `- Company: ${company}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await submitContact({
      name,
      email,
      message: summaryText,
      intent: "get-quote",
      page: "/contact/get-quote",
    });

    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || "Could not submit estimate.");
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="w-full space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-between border-b border-border pb-4 text-small">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue/10 text-meta font-bold text-brand-blue">
            {step}
          </span>
          <span className="font-medium text-foreground">
            {step === 1 && "Select Primary Solution"}
            {step === 2 && "Choose Target Scale"}
            {step === 3 && "Select Core Features"}
            {step === 4 && "Review & Submit Brief"}
          </span>
        </div>

        <span className="text-meta text-muted-foreground">Step {step} of 4</span>
      </div>

      {/* Main Steps Content */}
      <div className="min-h-[380px]">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold text-foreground">
              What primary software system are you building?
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {SERVICES.map((srv) => {
                const Icon = srv.icon;
                const active = selectedService.id === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedService(srv)}
                    className={`flex items-start gap-4 rounded-2xl border p-5 text-left transition-all ${
                      active
                        ? "border-brand-blue bg-brand-blue/10 shadow-sm"
                        : "border-border bg-surface hover:border-foreground/30"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        active ? "bg-brand-blue text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-foreground">{srv.title}</p>
                      <p className="mt-1 text-small text-muted-foreground leading-snug">{srv.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold text-foreground">
              What is your target scale and deployment urgency?
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {SCALES.map((scale) => {
                const active = selectedScale.id === scale.id;
                return (
                  <button
                    key={scale.id}
                    type="button"
                    onClick={() => setSelectedScale(scale)}
                    className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                      active
                        ? "border-brand-blue bg-brand-blue/10 shadow-sm"
                        : "border-border bg-surface hover:border-foreground/30"
                    }`}
                  >
                    <div>
                      <p className="font-display font-bold text-foreground">{scale.title}</p>
                      <p className="mt-2 text-small text-muted-foreground leading-relaxed">{scale.desc}</p>
                    </div>

                    <div className="mt-6 flex items-center gap-1.5 text-meta text-brand-cyan">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{scale.weeks}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold text-foreground">
              Select core feature modules & infrastructure:
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((feat) => {
                const active = selectedFeatures.includes(feat.id);
                return (
                  <button
                    key={feat.id}
                    type="button"
                    onClick={() => toggleFeature(feat.id)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                      active
                        ? "border-brand-blue bg-brand-blue/10"
                        : "border-border bg-surface hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-small font-medium text-foreground">{feat.label}</span>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        active ? "border-brand-blue bg-brand-blue text-white" : "border-border"
                      }`}
                    >
                      {active && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            {submitted ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                <h3 className="mt-3 font-display text-2xl font-bold text-foreground">
                  Scope Brief Sent!
                </h3>
                <p className="mx-auto mt-2 max-w-md text-small text-muted-foreground">
                  A Satyakabir principal will review your architecture parameters and send a formal proposal within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendQuote} className="space-y-4">
                <h3 className="font-display text-xl font-bold text-foreground">
                  Receive Detailed Proposal
                </h3>
                <p className="text-small text-muted-foreground">
                  Enter your contact info to receive an explicit breakdown of squad sizing, deliverables, and architecture strategy.
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-label text-secondary-foreground">Your Name *</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
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
                      placeholder="alex@company.com"
                      className="w-full rounded-xl border border-border bg-muted p-3 text-small text-foreground outline-none focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-label text-secondary-foreground">Company Name</label>
                    <input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Corp"
                      className="w-full rounded-xl border border-border bg-muted p-3 text-small text-foreground outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>

                {errorMsg && <p className="text-small text-red-400">{errorMsg}</p>}

                <PremiumButton type="submit" disabled={submitting} className="w-full justify-center">
                  {submitting ? "Sending Scope Brief..." : "Submit Scope Brief & Book Principal Call"}
                </PremiumButton>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Live Estimate Summary Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-meta text-muted-foreground">Estimated Investment Range</p>
          <p className="font-display text-2xl font-bold text-foreground">
            ${estLow.toLocaleString()} – ${estHigh.toLocaleString()}
            <span className="text-small font-normal text-muted-foreground"> USD</span>
          </p>
          <p className="mt-0.5 text-meta text-brand-cyan">
            Target Timeline: {selectedScale.weeks}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-small font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}

          {step < 4 && (
            <PremiumButton onClick={() => setStep((s) => s + 1)}>
              Next Step <ArrowRight className="h-4 w-4" />
            </PremiumButton>
          )}
        </div>
      </div>
    </div>
  );
}
