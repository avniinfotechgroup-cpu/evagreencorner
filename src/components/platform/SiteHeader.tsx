import { Bookmark, Coins, MapPin, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { siteConfig } from "@/config/platform";
import { useAuth } from "@/lib/community/useAuth";
import { useSaved } from "@/lib/savedItems";
import { useGpsCity } from "@/hooks/useGpsCity";
import { IconicLoader } from "./IconicLoader";
import { SiteLogo } from "./SiteLogo";

export function SiteHeader() {
  const saved = useSaved();
  const { user, ready } = useAuth();
  const savedCount = saved.stations.length + saved.routes.length;
  const gps = useGpsCity();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-5 sm:h-24">
        <Link to="/" className="flex min-w-0 items-center" aria-label={siteConfig.name}>
          <SiteLogo
            variant="full"
            size="lg"
            priority
            className="h-14 w-auto max-w-[min(100%,22rem)] sm:h-[4.75rem] sm:max-w-[26rem]"
          />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void gps.refresh()}
            title="Update from GPS"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
          >
            {gps.status === "loading" ? (
              <IconicLoader size="sm" />
            ) : (
              <MapPin className="size-3.5 text-leaf" />
            )}
            <span className="max-w-[7rem] truncate sm:max-w-[10rem]">{gps.label}</span>
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            <Bookmark className="size-4 text-leaf" />
            <span className="hidden sm:inline">My saves</span>
            {savedCount > 0 && (
              <span className="rounded-md bg-secondary px-1.5 text-[11px] text-secondary-foreground">
                {savedCount}
              </span>
            )}
          </Link>
          {ready && user?.isAdmin ? (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface"
            >
              Admin
            </Link>
          ) : null}
          {ready && user ? (
            <Link
              to="/rewards"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold"
            >
              <Coins className="size-4 text-leaf" />
              <span className="hidden sm:inline">{user.credits}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              search={{ redirect: "/rewards" }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <UserRound className="size-4" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
