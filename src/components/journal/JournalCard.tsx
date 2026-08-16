import { Link } from "@tanstack/react-router";
import { BookOpen, Clock } from "lucide-react";
import type { JournalPostListItem } from "@/lib/journal/queries";

type Props = { post: JournalPostListItem };

export function JournalCard({ post }: Props) {
  return (
    <article className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1">
          <BookOpen className="size-3 text-leaf" />
          {post.contentType}
        </span>
        {post.categoryName ? (
          <span className="rounded-full bg-surface px-2.5 py-1">{post.categoryName}</span>
        ) : null}
        {post.featured ? (
          <span className="rounded-full border border-leaf/30 bg-leaf/10 px-2.5 py-1 text-leaf">
            Featured
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 font-display text-lg font-bold leading-snug">
        <Link to="/journal/$slug" params={{ slug: post.slug }} className="hover:text-leaf">
          {post.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{post.authorName}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {post.readingTime} min
        </span>
      </div>
    </article>
  );
}
