"use client";

import { SectionWrapper, SectionPanel } from "./SectionWrapper";
import {
  SiReact,
  SiNextdotjs,
  SiTypescript,
  SiNodedotjs,
  SiPython,
  SiTensorflow,
  SiPytorch,
  SiGo,
  SiRust,
  SiGraphql,
  SiPostgresql,
  SiRedis,
  SiDigitalocean,
  SiGooglecloud,
  SiCloudflare,
  SiDocker,
  SiKubernetes,
  SiTerraform,
  SiGithub,
  SiPrometheus,
  SiGrafana,
  SiElasticsearch,
} from "react-icons/si";
import type { IconType } from "react-icons";
import { coreStack, infrastructure, partners } from "@/data/mock";

const coreIcons: Record<string, IconType> = {
  React: SiReact,
  "Next.js": SiNextdotjs,
  TypeScript: SiTypescript,
  "Node.js": SiNodedotjs,
  Python: SiPython,
  TensorFlow: SiTensorflow,
  PyTorch: SiPytorch,
  Go: SiGo,
  Rust: SiRust,
  GraphQL: SiGraphql,
  PostgreSQL: SiPostgresql,
  Redis: SiRedis,
};

const infraIcons: Record<string, IconType> = {
  AWS: SiDigitalocean,
  GCP: SiGooglecloud,
  Azure: SiCloudflare,
  Docker: SiDocker,
  Kubernetes: SiKubernetes,
  Terraform: SiTerraform,
  "GitHub Actions": SiGithub,
  Prometheus: SiPrometheus,
  Grafana: SiGrafana,
  Elasticsearch: SiElasticsearch,
};

export function TechnologiesSection({ currentFrame }: { currentFrame: number }) {
  return (
    <SectionWrapper currentFrame={currentFrame} startFrame={142} endFrame={173} fadeFrames={4}>
      <div className="absolute inset-0 bg-[#020305]/82 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="net" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2B6BFF" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#00D9FF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#7649FF" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <g stroke="url(#net)" strokeWidth="0.15" fill="none">
            <path d="M10 40 L50 20 L90 45" />
            <path d="M15 70 L50 50 L85 75" />
            <path d="M50 20 L50 80" />
            <circle cx="50" cy="50" r="1.2" fill="#00D9FF" fillOpacity="0.5" stroke="none" />
            <circle cx="50" cy="20" r="0.8" fill="#2B6BFF" fillOpacity="0.6" stroke="none" />
            <circle cx="85" cy="75" r="0.8" fill="#7649FF" fillOpacity="0.6" stroke="none" />
          </g>
        </svg>
      </div>

      <SectionPanel align="center">
        <div className="text-center mb-5">
          <p className="text-eyebrow text-muted-foreground mb-2">
            Chapter 04 · Ecosystem
          </p>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] text-white mb-2">
            Built with conviction
          </h2>
          <p className="text-[13px] text-white/50 max-w-md mx-auto">
            An interactive stack for AI systems, cloud platforms, and product surfaces.
          </p>
        </div>

        <div className="relative mx-auto max-w-3xl">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-brand-blue/30 blur-[1px]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-brand-cyan/15" />

          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {coreStack.map((name, index) => {
              const Icon = coreIcons[name];
              const visible = currentFrame >= 144 + index;
              return (
                <div
                  key={name}
                  className="glass-panel rounded-full px-3 py-2 flex items-center gap-2"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: `scale(${visible ? 1 : 0.92})`,
                    transition: "all 0.4s var(--ease-expo)",
                  }}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-brand-blue" />}
                  <span className="text-meta text-white/80">{name}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {infrastructure.map((name, index) => {
              const Icon = infraIcons[name];
              const visible = currentFrame >= 156 + index;
              return (
                <div
                  key={name}
                  className="rounded-full border border-white/10 bg-[#070A10]/90 px-3 py-2 flex items-center gap-2"
                  style={{
                    opacity: visible ? 1 : 0,
                    transition: "opacity 0.4s var(--ease-expo)",
                  }}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-brand-green" />}
                  <span className="text-meta text-white/75">{name}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            {partners.map((p) => (
              <span
                key={p}
                className="font-deco text-[12px] tracking-[0.06em] text-white/35 uppercase"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </SectionPanel>
    </SectionWrapper>
  );
}
