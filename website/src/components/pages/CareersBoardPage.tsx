"use client";

import { useState, useMemo } from "react";
import { JOB_POSITIONS, type JobPosition, type JobDepartment } from "@/data/careers";
import { JobApplicationModal } from "@/components/forms/JobApplicationModal";
import { MarketingShell } from "@/components/pages/MarketingShell";
import { breadcrumbsFor } from "@/data/navigation";
import { MapPin, Briefcase, Sparkles, Search, ArrowRight, Check } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";

const DEPARTMENTS: ("All" | JobDepartment)[] = [
  "All",
  "Artificial Intelligence",
  "Engineering",
  "Cloud & DevOps",
  "Product & Design",
  "Quality & Security",
];

export function CareersBoardPage({ isInternshipOnly = false }: { isInternshipOnly?: boolean }) {
  const [selectedDept, setSelectedDept] = useState<"All" | JobDepartment>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeJob, setActiveJob] = useState<JobPosition | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const crumbs = breadcrumbsFor(isInternshipOnly ? "/careers/internships" : "/careers/open-positions");

  const filteredJobs = useMemo(() => {
    return JOB_POSITIONS.filter((job) => {
      if (isInternshipOnly && !job.isInternship) return false;
      if (!isInternshipOnly && job.isInternship) return false; // Show full-time under open-positions
      if (selectedDept !== "All" && job.department !== selectedDept) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          job.title.toLowerCase().includes(q) ||
          job.summary.toLowerCase().includes(q) ||
          job.department.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [isInternshipOnly, selectedDept, searchQuery]);

  const openApplyModal = (job: JobPosition) => {
    setActiveJob(job);
    setModalOpen(true);
  };

  return (
    <MarketingShell crumbs={crumbs}>
      {/* Header Banner */}
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-border bg-surface px-6 py-10 md:mb-14 md:rounded-3xl md:px-12 md:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-4 top-0 font-deco text-[clamp(5rem,18vw,12rem)] leading-none text-foreground/5 select-none"
        >
          {isInternshipOnly ? "INTERN" : "CAREERS"}
        </div>
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-3 py-1 text-meta text-brand-cyan">
            <Sparkles className="h-3.5 w-3.5" />
            {isInternshipOnly ? "Apprenticeship & Internships" : "Open Positions · Satyakabir"}
          </span>
          <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-tight text-foreground">
            {isInternshipOnly ? "Start Your Craft With Us" : "Build Systems That Matter"}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
            {isInternshipOnly
              ? "Immersive 6-month engineering internships with direct mentorship from senior leaders and fast-track conversion to full-time roles."
              : "Remote-first roles with Bengaluru HQ gravity. Work with principals who care deeply about code quality, system longevity, and autonomous execution."}
          </p>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by role, stack, or location..."
              className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
            />
          </div>

          <p className="text-meta text-muted-foreground">
            Showing <strong className="text-foreground">{filteredJobs.length}</strong> available position{filteredJobs.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Department Tabs */}
        <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-small font-medium transition-colors ${
                selectedDept === dept
                  ? "bg-foreground text-background"
                  : "border border-border bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid gap-4 md:gap-6">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            id={job.slug}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-blue/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-blue">
                    <Briefcase className="h-3 w-3" /> {job.department}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {job.location}
                  </span>
                  <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {job.type}
                  </span>
                </div>

                <h2 className="font-display text-[20px] font-bold text-foreground md:text-[22px]">
                  {job.title}
                </h2>

                <p className="text-small text-muted-foreground leading-relaxed">
                  {job.summary}
                </p>

                {/* Key perks preview */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {job.requirements.slice(0, 2).map((req, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-meta text-muted-foreground">
                      <Check className="h-3 w-3 text-emerald-400" /> {req}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="shrink-0 pt-2 md:pt-0">
                <PremiumButton onClick={() => openApplyModal(job)} className="w-full sm:w-auto">
                  Apply Now <ArrowRight className="h-4 w-4" />
                </PremiumButton>
              </div>
            </div>
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-12 text-center">
            <h3 className="font-display text-lg font-semibold text-foreground">No open roles found</h3>
            <p className="mt-1 text-small text-muted-foreground">
              Try adjusting your search query or department filters.
            </p>
          </div>
        )}
      </div>

      {/* Application Modal */}
      <JobApplicationModal
        position={activeJob}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setActiveJob(null);
        }}
      />
    </MarketingShell>
  );
}
