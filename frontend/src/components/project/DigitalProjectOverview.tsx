import type { LucideIcon } from "lucide-react";
import {
  ExternalLink,
  Facebook,
  Film,
  Gauge,
  HardDrive,
  Instagram,
  Linkedin,
  Megaphone,
  Palette,
  Pencil,
  FileText,
  Search,
  Share2,
  Target,
  Twitter,
  Youtube,
  Globe2,
  MessageCircle,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Project } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProjectTeamPanel } from "@/components/project/ProjectTeamPanel";
import { PlatformIconBadge } from "@/modules/marketing/components";
import {
  DIGITAL_SERVICE_OPTIONS,
  DIGITAL_SOCIAL_LINK_FIELDS,
  normalizeDigitalServicesForm,
  normalizeSocialLinksForm,
  type DigitalServiceKey,
  type SocialLinkKey,
} from "@/lib/project-type-fields";
import { PACKAGE_LABELS, formatCompactCurrency } from "@/modules/marketing/constants";
import type { MarketingPackage, MarketingPlatform } from "@/modules/marketing/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  scoping: "Scoping",
  in_progress: "In progress",
  on_hold: "On hold",
  uat: "UAT",
  completed: "Completed",
  maintenance: "Maintenance",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const SOCIAL_ICONS: Record<SocialLinkKey, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  tiktok: Share2,
  pinterest: Globe2,
  whatsapp: MessageCircle,
  other: ExternalLink,
};

const SOCIAL_TINT: Record<SocialLinkKey, string> = {
  facebook: "border-blue-500/25 bg-blue-500/8 text-blue-700 hover:border-blue-500/50",
  instagram: "border-pink-500/25 bg-pink-500/8 text-pink-700 hover:border-pink-500/50",
  linkedin: "border-sky-500/25 bg-sky-500/8 text-sky-700 hover:border-sky-500/50",
  twitter: "border-foreground/20 bg-muted/40 text-foreground hover:border-foreground/40",
  youtube: "border-red-500/25 bg-red-500/8 text-red-600 hover:border-red-500/50",
  tiktok: "border-violet-500/25 bg-violet-500/8 text-violet-700 hover:border-violet-500/50",
  pinterest: "border-rose-500/25 bg-rose-500/8 text-rose-700 hover:border-rose-500/50",
  whatsapp: "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 hover:border-emerald-500/50",
  other: "border-border bg-muted/30 text-foreground hover:border-primary/40",
};

const SERVICE_META: Record<
  DigitalServiceKey,
  { icon: LucideIcon; accent: string; hrefSuffix: string }
> = {
  seo: {
    icon: Search,
    accent: "border-emerald-500/30 bg-emerald-500/[0.07]",
    hrefSuffix: "/marketing/seo",
  },
  metaAds: {
    icon: Megaphone,
    accent: "border-blue-500/30 bg-blue-500/[0.07]",
    hrefSuffix: "/marketing/meta-ads",
  },
  googleAds: {
    icon: Target,
    accent: "border-amber-500/30 bg-amber-500/[0.07]",
    hrefSuffix: "/marketing/google-ads",
  },
};

type AccountLike = {
  package: string;
  monthlyBudgetInr?: number | null;
  accountManager?: string | null;
  status: string;
  platforms?: string[];
  performanceScore?: number;
  renewalDate?: string | null;
  industry?: string | null;
  city?: string | null;
  usage?: {
    graphics: { used: number; quota: number };
    ugc: { used: number; quota: number };
    reels: { used: number; quota: number };
    blogs: { used: number; quota: number };
  } | null;
};

type ModuleLink = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href: string;
};

export function DigitalProjectOverview({
  project,
  projectId,
  companyLabel,
  account,
  accountLoading,
  accountQuery,
  canEditServices,
  canEditWorkspace,
  canViewClientBudget = false,
  canManageTeam,
  onEditServices,
  onEditWorkspace,
  moduleLinks,
}: {
  project: Project;
  projectId: number;
  companyLabel: string;
  account: AccountLike | null;
  accountLoading?: boolean;
  accountQuery: string;
  canEditServices: boolean;
  canEditWorkspace: boolean;
  /** Client retainer amount — super_admin only */
  canViewClientBudget?: boolean;
  canManageTeam: boolean;
  onEditServices: () => void;
  onEditWorkspace: () => void;
  moduleLinks: ModuleLink[];
}) {
  const services = normalizeDigitalServicesForm(project.digitalServices);
  const socialLinks = normalizeSocialLinksForm(project.socialLinks);
  const filledSocial = DIGITAL_SOCIAL_LINK_FIELDS.filter((f) => Boolean(socialLinks[f.key]));
  const activeServiceCount = DIGITAL_SERVICE_OPTIONS.filter((s) => services[s.key]).length;

  return (
    <div className="space-y-5">
      {/* Identity + timeline */}
      <section className="rounded-xl border border-border/80 bg-card overflow-hidden">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Client workspace
              </p>
              <h2 className="text-base font-semibold tracking-tight text-balance sm:text-lg">
                {project.name}
              </h2>
              <p className="text-xs text-muted-foreground">{companyLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {STATUS_LABELS[project.status] ?? project.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-normal">
                {PRIORITY_LABELS[project.priority] ?? project.priority} priority
              </Badge>
              {activeServiceCount > 0 ? (
                <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] font-normal hover:bg-primary/15">
                  {activeServiceCount} service{activeServiceCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-0 sm:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4 p-4 sm:p-5 sm:border-r border-border/60">
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-3">
                <span className="text-xs text-muted-foreground">Delivery progress</span>
                <span className="text-sm font-semibold tabular-nums">
                  {project.completionPct ?? 0}%
                </span>
              </div>
              <Progress value={project.completionPct ?? 0} className="h-2" />
            </div>
            {project.description?.trim() ? (
              <p className="text-xs leading-relaxed text-muted-foreground text-pretty whitespace-pre-wrap">
                {project.description}
              </p>
            ) : (
              <p className="text-xs italic text-muted-foreground">No project brief yet.</p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-px bg-border/50 sm:grid-cols-1">
            {(
              [
                [
                  "Start",
                  project.startDate
                    ? format(new Date(project.startDate), "MMM d, yyyy")
                    : "—",
                ],
                [
                  "Deadline",
                  project.deadline
                    ? format(new Date(project.deadline), "MMM d, yyyy")
                    : "—",
                ],
                ["Channels", String(filledSocial.length)],
                ["Team size", String(project.memberCount ?? 0)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-card px-4 py-3 sm:px-5">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Services */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Services</h3>
            <p className="text-[11px] text-muted-foreground">
              What we manage for this client — SEO, Meta Ads, and Google Ads.
            </p>
          </div>
          {canEditServices ? (
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onEditServices}>
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {DIGITAL_SERVICE_OPTIONS.map((opt) => {
            const active = services[opt.key];
            const meta = SERVICE_META[opt.key];
            const Icon = meta.icon;
            return (
              <div
                key={opt.key}
                className={cn(
                  "relative flex flex-col rounded-xl border p-4 transition-colors",
                  active ? meta.accent : "border-dashed border-border/80 bg-muted/15",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border",
                      active ? "border-transparent bg-background/80" : "border-border/60 bg-background/50",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-foreground" : "text-muted-foreground")} />
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      active
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {active ? "Managing" : "Not set"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold">{opt.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{opt.description}</p>
                {active ? (
                  <Link
                    href={`${meta.hrefSuffix}${accountQuery}`}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    Open workspace
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : canEditServices ? (
                  <button
                    type="button"
                    onClick={onEditServices}
                    className="mt-3 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Enable this service →
                  </button>
                ) : (
                  <span className="mt-3 text-[11px] text-muted-foreground">Not in scope</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Social profiles */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Social profiles</h3>
            <p className="text-[11px] text-muted-foreground">
              Client pages and channels linked to this digital project.
            </p>
          </div>
          {canEditServices ? (
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onEditServices}>
              <Pencil className="h-3 w-3" />
              {filledSocial.length ? "Manage links" : "Add links"}
            </Button>
          ) : null}
        </div>

        {filledSocial.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 py-8 text-center">
            <Share2 className="mx-auto h-5 w-5 text-muted-foreground/70" />
            <p className="mt-2 text-sm font-medium">No social profiles yet</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Add Facebook, Instagram, LinkedIn, X, YouTube, and more so the team can jump straight to client pages.
            </p>
            {canEditServices ? (
              <Button size="sm" className="mt-3 h-8 text-xs" onClick={onEditServices}>
                Add social links
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {filledSocial.map((field) => {
              const Icon = SOCIAL_ICONS[field.key];
              const href = socialLinks[field.key];
              return (
                <a
                  key={field.key}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                    SOCIAL_TINT[field.key],
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{field.label}</span>
                    <span className="block truncate text-[10px] opacity-70 group-hover:opacity-100">
                      {href.replace(/^https?:\/\//, "")}
                    </span>
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Workspace + usage */}
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Digital workspace</h3>
            {account && canEditWorkspace ? (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onEditWorkspace}>
                Edit workspace
              </Button>
            ) : null}
          </div>
          {accountLoading && !account ? (
            <p className="mt-4 text-xs text-muted-foreground">Loading workspace…</p>
          ) : account ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Package</dt>
                <dd className="mt-0.5 font-medium">
                  {PACKAGE_LABELS[account.package as MarketingPackage] ?? account.package}
                </dd>
              </div>
              {canViewClientBudget && account.monthlyBudgetInr != null ? (
                <div>
                  <dt className="text-muted-foreground">Monthly budget</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {formatCompactCurrency(account.monthlyBudgetInr)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">Account manager</dt>
                <dd className="mt-0.5 font-medium">{account.accountManager ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-0.5">
                  <Badge variant="secondary" className="text-[10px] capitalize font-normal">
                    {account.status}
                  </Badge>
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground mb-1.5">Platforms</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {(account.platforms ?? []).length === 0 ? (
                    <span className="text-muted-foreground">None set</span>
                  ) : (
                    account.platforms!.map((p) => (
                      <PlatformIconBadge key={p} platform={p as MarketingPlatform} />
                    ))
                  )}
                </dd>
              </div>
              {(account.industry || account.city || account.renewalDate) && (
                <div className="col-span-2 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                  {account.industry ? (
                    <div>
                      <dt className="text-muted-foreground">Industry</dt>
                      <dd className="mt-0.5 font-medium">{account.industry}</dd>
                    </div>
                  ) : null}
                  {account.city ? (
                    <div>
                      <dt className="text-muted-foreground">City</dt>
                      <dd className="mt-0.5 font-medium">{account.city}</dd>
                    </div>
                  ) : null}
                  {account.renewalDate ? (
                    <div>
                      <dt className="text-muted-foreground">Renewal</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {format(new Date(account.renewalDate), "MMM d, yyyy")}
                      </dd>
                    </div>
                  ) : null}
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">Workspace not provisioned yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold tracking-tight">Package usage</h3>
          {account?.usage ? (
            <div className="mt-4 space-y-3">
              {(
                [
                  ["Graphics", account.usage.graphics, Palette],
                  ["UGC", account.usage.ugc, Share2],
                  ["Reels", account.usage.reels, Film],
                  ["Blogs", account.usage.blogs, FileText],
                ] as const
              ).map(([label, u, Icon]) => {
                const pct = u.quota > 0 ? Math.min(100, Math.round((u.used / u.quota) * 100)) : 0;
                return (
                  <div key={label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {label}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {u.used}/{u.quota}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Usage meters appear once the digital workspace package is active.
            </p>
          )}
        </div>
      </section>

      <ProjectTeamPanel
        projectId={projectId}
        variant="digital"
        canManage={canManageTeam}
      />

      {/* Module shortcuts */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Jump to modules</h3>
          <p className="text-[11px] text-muted-foreground">
            Production, media, SEO, and performance scoped to this project.
          </p>
        </div>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {moduleLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl border border-border/80 bg-card px-3 py-3 transition-colors hover:border-primary/35 hover:bg-muted/20"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 transition-colors group-hover:bg-primary/10">
                <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-base font-semibold tabular-nums leading-tight">{item.value}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Re-export icons used by parent when building moduleLinks */
export const digitalOverviewModuleIcons = {
  Palette,
  Film,
  FileText,
  HardDrive,
  Share2,
  Search,
  Gauge,
};
