import { Link } from "@tanstack/react-router";
import { Briefcase, MapPin, Clock } from "lucide-react";
import type { JobListItem } from "@/lib/jobs/queries";

const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  apprenticeship: "Apprenticeship",
  fellowship: "Fellowship",
  temporary: "Temporary",
  volunteer: "Volunteer",
};

const REMOTE_LABEL: Record<string, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

type Props = { job: JobListItem };

export function JobCard({ job }: Props) {
  return (
    <article className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1">
          <Briefcase className="size-3 text-leaf" />
          {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
        </span>
        <span className="rounded-full bg-surface px-2.5 py-1">
          {REMOTE_LABEL[job.remoteType] ?? job.remoteType}
        </span>
        {job.featured ? (
          <span className="rounded-full border border-leaf/30 bg-leaf/10 px-2.5 py-1 text-leaf">
            Featured
          </span>
        ) : null}
        {job.verified ? (
          <span className="rounded-full border border-border px-2.5 py-1">Verified</span>
        ) : null}
      </div>

      <h3 className="mt-3 font-display text-lg font-bold leading-snug">
        <Link to="/job-and-internship/$slug" params={{ slug: job.slug }} className="hover:text-leaf">
          {job.title}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {job.organizationName}
        {job.categoryName ? ` · ${job.categoryName}` : ""}
      </p>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="size-3.5 text-leaf" />
        {job.location || job.city || "India"}
      </p>

      {job.jobType === "internship" && job.durationMonths != null ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5 text-leaf" />
          {job.durationMonths} months
          {job.certificateOffered ? " · Certificate offered" : ""}
        </p>
      ) : null}

      {job.deadline ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Apply by {new Date(job.deadline).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      ) : null}

      <div className="mt-4">
        <Link
          to="/job-and-internship/$slug"
          params={{ slug: job.slug }}
          className="text-sm font-semibold text-primary hover:underline"
        >
          View role →
        </Link>
      </div>
    </article>
  );
}

export { JOB_TYPE_LABEL, REMOTE_LABEL };
