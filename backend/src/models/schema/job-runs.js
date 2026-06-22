import mongoose, { Schema } from "mongoose";

/**
 * Cross-process dedup lock for recurring jobs.
 *
 * Each row represents a single (jobName, periodKey) attempt. The compound
 * unique index makes a parallel attempt fail-fast with a duplicate key
 * error — that is the lock acquisition signal used by `withJobLock`.
 *
 * status:
 *   running   → a process is currently executing this job for this period
 *   succeeded → the job completed; future attempts for the same period are no-ops
 *   failed    → the job threw; status keeps a fingerprint so the same process can retry
 *
 * periodKey shape is job-specific but always a short string, e.g.:
 *   accrual:           "2026-06"
 *   payroll-finalize:  "run:1834"
 *   carry-forward:     "year:2026"
 */
const jobRunSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    jobName: { type: String, required: true, index: true },
    periodKey: { type: String, required: true },
    status: {
      type: String,
      enum: ["running", "succeeded", "failed"],
      default: "running",
      required: true,
      index: true,
    },
    startedAt: { type: Date, default: Date.now, required: true },
    finishedAt: { type: Date },
    hostname: { type: String },
    pid: { type: Number },
    error: { type: String },
    /** Optional summary of what the job did (counts, ids, etc.). */
    result: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

jobRunSchema.index({ jobName: 1, periodKey: 1 }, { unique: true });

const JobRuns = mongoose.models.JobRuns || mongoose.model("JobRuns", jobRunSchema);
const jobRunsTable = JobRuns;

export { JobRuns, jobRunsTable };
