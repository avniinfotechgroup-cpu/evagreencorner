/**
 * Client-safe journal/blog constants (no Node/SQLite imports).
 */
export const JOURNAL_POST_STATUSES = [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
] as const;

export const JOURNAL_CONTENT_TYPES = [
  "guide",
  "explainer",
  "research",
  "policy",
  "news",
] as const;

export const JOURNAL_POLICY_STATUSES = [
  "announced",
  "proposed",
  "active",
  "updated",
  "superseded",
  "withdrawn",
] as const;
