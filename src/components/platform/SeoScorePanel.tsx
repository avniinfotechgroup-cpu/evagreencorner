import { cn } from "@/lib/utils";

export type SeoInput = {
  title?: string;
  keywords?: string;
  description?: string;
  focusKeyword?: string;
  /** Optional body/content for focus-keyword-in-content check (Yoast-style). */
  content?: string;
};

export type SeoCheckItem = {
  id: string;
  label: string;
  status: "good" | "ok" | "bad";
  tip: string;
};

export type SeoScore = {
  score: number;
  grade: "good" | "ok" | "bad";
  label: string;
  checks: SeoCheckItem[];
};

/** Yoast-style SEO score for meta fields. */
export function scoreServiceSeo(input: SeoInput): SeoScore {
  const title = (input.title || "").trim();
  const keywords = (input.keywords || "").trim();
  const description = (input.description || "").trim();
  const content = (input.content || "").trim();
  const focus = (
    input.focusKeyword ||
    keywords.split(",")[0] ||
    ""
  )
    .trim()
    .toLowerCase();

  const checks: SeoCheckItem[] = [];

  // Title length
  if (!title) {
    checks.push({
      id: "title-empty",
      label: "SEO title (meta tag)",
      status: "bad",
      tip: "Add a meta title (aim 50–60 characters).",
    });
  } else if (title.length < 30) {
    checks.push({
      id: "title-short",
      label: "SEO title length",
      status: "ok",
      tip: `Title is short (${title.length} chars). Aim for 50–60.`,
    });
  } else if (title.length <= 60) {
    checks.push({
      id: "title-good",
      label: "SEO title length",
      status: "good",
      tip: `Good title length (${title.length}/60).`,
    });
  } else if (title.length <= 70) {
    checks.push({
      id: "title-longish",
      label: "SEO title length",
      status: "ok",
      tip: `Slightly long (${title.length}). Prefer ≤60 characters.`,
    });
  } else {
    checks.push({
      id: "title-long",
      label: "SEO title length",
      status: "bad",
      tip: `Too long (${title.length}). Google may truncate past ~60 chars.`,
    });
  }

  // Description length
  if (!description) {
    checks.push({
      id: "desc-empty",
      label: "Meta description",
      status: "bad",
      tip: "Add a meta description (aim 120–160 characters).",
    });
  } else if (description.length < 70) {
    checks.push({
      id: "desc-short",
      label: "Meta description length",
      status: "ok",
      tip: `Description is short (${description.length}). Aim 120–160.`,
    });
  } else if (description.length <= 160) {
    checks.push({
      id: "desc-good",
      label: "Meta description length",
      status: "good",
      tip: `Good description length (${description.length}/160).`,
    });
  } else if (description.length <= 200) {
    checks.push({
      id: "desc-longish",
      label: "Meta description length",
      status: "ok",
      tip: `A bit long (${description.length}). Prefer ≤160 characters.`,
    });
  } else {
    checks.push({
      id: "desc-long",
      label: "Meta description length",
      status: "bad",
      tip: `Too long (${description.length}). Truncation risk in SERPs.`,
    });
  }

  // Keywords
  const kwList = keywords
    .split(/[,|]/)
    .map((k) => k.trim())
    .filter(Boolean);
  if (kwList.length === 0) {
    checks.push({
      id: "kw-empty",
      label: "Keywords",
      status: "bad",
      tip: "Add 2–6 comma-separated keywords.",
    });
  } else if (kwList.length < 2) {
    checks.push({
      id: "kw-few",
      label: "Keywords",
      status: "ok",
      tip: "Add a few more related keywords (2–6 total).",
    });
  } else if (kwList.length <= 8) {
    checks.push({
      id: "kw-good",
      label: "Keywords",
      status: "good",
      tip: `${kwList.length} keywords set.`,
    });
  } else {
    checks.push({
      id: "kw-many",
      label: "Keywords",
      status: "ok",
      tip: "Too many keywords can look spammy — keep 2–6 strong ones.",
    });
  }

  // Focus keyword (keyphrase)
  if (!focus) {
    checks.push({
      id: "focus-empty",
      label: "Focus keyphrase",
      status: "ok",
      tip: "Set a focus keyphrase (first keyword is used if empty).",
    });
  } else {
    const inTitle = title.toLowerCase().includes(focus);
    const inDesc = description.toLowerCase().includes(focus);
    if (inTitle && inDesc) {
      checks.push({
        id: "focus-both",
        label: "Focus keyphrase in meta",
        status: "good",
        tip: `“${focus}” appears in title and description.`,
      });
    } else if (inTitle || inDesc) {
      checks.push({
        id: "focus-one",
        label: "Focus keyphrase in meta",
        status: "ok",
        tip: `Use “${focus}” in both title and description.`,
      });
    } else {
      checks.push({
        id: "focus-missing",
        label: "Focus keyphrase in meta",
        status: "bad",
        tip: `Include “${focus}” in the title and description.`,
      });
    }

    if (content) {
      if (content.toLowerCase().includes(focus)) {
        checks.push({
          id: "focus-content",
          label: "Focus keyphrase in content",
          status: "good",
          tip: `“${focus}” appears in the listing content.`,
        });
      } else {
        checks.push({
          id: "focus-content-missing",
          label: "Focus keyphrase in content",
          status: "bad",
          tip: `Mention “${focus}” in the job description.`,
        });
      }
    }

    // Title starts with focus (Yoast-style bonus tip)
    if (title && title.toLowerCase().startsWith(focus)) {
      checks.push({
        id: "focus-title-start",
        label: "Keyphrase at start of title",
        status: "good",
        tip: "Title starts with the focus keyphrase.",
      });
    } else if (title && inTitle) {
      checks.push({
        id: "focus-title-mid",
        label: "Keyphrase at start of title",
        status: "ok",
        tip: "Consider starting the SEO title with the focus keyphrase.",
      });
    }
  }

  const points = checks.reduce((sum, c) => {
    if (c.status === "good") return sum + 2;
    if (c.status === "ok") return sum + 1;
    return sum;
  }, 0);
  const max = checks.length * 2 || 1;
  const score = Math.round((points / max) * 100);
  const grade: SeoScore["grade"] =
    score >= 80 ? "good" : score >= 50 ? "ok" : "bad";
  const label =
    grade === "good" ? "SEO: Good" : grade === "ok" ? "SEO: Needs improvement" : "SEO: Poor";

  return { score, grade, label, checks };
}

const DOT: Record<SeoScore["grade"], string> = {
  good: "bg-emerald-500",
  ok: "bg-amber-400",
  bad: "bg-rose-500",
};

const TEXT: Record<SeoScore["grade"], string> = {
  good: "text-emerald-700",
  ok: "text-amber-700",
  bad: "text-rose-700",
};

export function SeoScorePanel({
  title,
  keywords,
  description,
  focusKeyword,
  content,
  className,
}: SeoInput & { className?: string }) {
  const result = scoreServiceSeo({
    ...(title ? { title } : {}),
    ...(keywords ? { keywords } : {}),
    ...(description ? { description } : {}),
    ...(focusKeyword ? { focusKeyword } : {}),
    ...(content ? { content } : {}),
  });

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface/80 p-4 text-left",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("size-3 rounded-full", DOT[result.grade])} />
          <p className={cn("text-sm font-bold", TEXT[result.grade])}>{result.label}</p>
        </div>
        <p className="text-xs font-semibold text-muted-foreground">{result.score}/100</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            result.grade === "good"
              ? "bg-emerald-500"
              : result.grade === "ok"
                ? "bg-amber-400"
                : "bg-rose-500",
          )}
          style={{ width: `${result.score}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {result.checks.map((c) => (
          <li key={c.id} className="flex gap-2 text-xs leading-snug">
            <span
              className={cn(
                "mt-1 size-2 shrink-0 rounded-full",
                c.status === "good"
                  ? "bg-emerald-500"
                  : c.status === "ok"
                    ? "bg-amber-400"
                    : "bg-rose-500",
              )}
            />
            <span>
              <span className="font-semibold text-foreground">{c.label}: </span>
              <span className="text-muted-foreground">{c.tip}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
