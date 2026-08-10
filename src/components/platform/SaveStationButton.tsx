import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { toggleStation, useSaved } from "@/lib/savedItems";

export function SaveStationButton({
  stationId,
  name,
  className = "",
  compact = false,
}: {
  stationId: string;
  name: string;
  className?: string;
  compact?: boolean;
}) {
  const saved = useSaved();
  const isSaved = saved.stations.includes(stationId);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggleStation(stationId);
    toast[nowSaved ? "success" : "message"](
      nowSaved ? `${name} saved to favourites` : `${name} removed from favourites`,
    );
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSaved}
        aria-label={isSaved ? "Remove from favourites" : "Save to favourites"}
        className={
          "grid size-8 place-items-center rounded-lg border border-border transition-colors hover:bg-surface " +
          (isSaved ? "text-leaf" : "text-muted-foreground ") +
          className
        }
      >
        {isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSaved}
      className={
        "inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors " +
        (isSaved
          ? "border-leaf/40 bg-leaf/10 text-leaf"
          : "border-border hover:bg-surface ") +
        className
      }
    >
      {isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      {isSaved ? "Saved" : "Save station"}
    </button>
  );
}
