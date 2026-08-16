import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  MAIN_NAV,
  NavChevron,
  isNavChildActive,
  isNavItemActive,
  type NavChild,
  type NavItem,
} from "@/config/navigation";
import { getPublicNavVisibility } from "@/lib/platform/nav-visibility.functions";

type Props = {
  variant?: "hero" | "bar";
  compact?: boolean;
};

type NavVisibilityState = Awaited<ReturnType<typeof getPublicNavVisibility>>;
type NavMenuId = "ev-services" | "green-services";

/** Until flags load, keep EV / Green menus hidden (admin-controlled). */
const HIDDEN_UNTIL_LOAD: NavVisibilityState = {
  menus: { "ev-services": false, "green-services": false },
  categories: {
    "ev-services": {},
    "green-services": {},
  },
};

function filterNav(items: NavItem[], flags: NavVisibilityState): NavItem[] {
  return items
    .map((item) => {
      if (item.id !== "ev-services" && item.id !== "green-services") return item;
      const menuId = item.id as NavMenuId;
      if (!flags.menus[menuId]) return null;
      const cats = flags.categories[menuId] ?? {};
      const children = (item.children ?? []).filter((c) => cats[c.id] !== false);
      if (!children.length) return null;
      return { ...item, children };
    })
    .filter((item): item is NavItem => item != null);
}

export function HeroMainMenu({ variant = "bar", compact = false }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openId, setOpenId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const fetchFlags = useServerFn(getPublicNavVisibility);
  const [flags, setFlags] = useState<NavVisibilityState>(HIDDEN_UNTIL_LOAD);

  useEffect(() => {
    let cancelled = false;
    void fetchFlags()
      .then((res) => {
        if (!cancelled) setFlags(res);
      })
      .catch(() => {
        /* keep hidden defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [fetchFlags]);

  const items = useMemo(() => filterNav(MAIN_NAV, flags), [flags]);

  useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const shellPad = compact
    ? "rounded-2xl border border-white/15 bg-black/45 p-1.5 backdrop-blur-md sm:rounded-full sm:px-2 sm:py-1.5"
    : "rounded-2xl bg-primary-foreground/[0.1] p-1.5 backdrop-blur-md sm:rounded-full sm:px-2 sm:py-1.5";

  return (
    <nav
      ref={navRef}
      aria-label="Main menu"
      className="hero-nav-shell relative z-[60] mx-auto w-full max-w-6xl overflow-visible"
    >
      <div className={shellPad + " overflow-visible"}>
        <ul className="relative z-[61] flex flex-wrap items-stretch justify-center gap-1 overflow-visible">
          {items.map((item, i) => {
            const panelId = `nav-panel-${item.id}`;
            const open = openId === item.id;
            return (
              <li
                key={item.id}
                className={
                  (variant === "hero" ? "hero-nav-item " : "") +
                  "relative min-w-[4.5rem] overflow-visible sm:min-w-[5.25rem] " +
                  (open ? "z-[70]" : "z-[61]")
                }
                style={variant === "hero" ? { animationDelay: `${i * 40}ms` } : undefined}
                onMouseEnter={() => {
                  if (item.children?.length) setOpenId(item.id);
                }}
                onMouseLeave={() => {
                  if (item.children?.length) setOpenId((id) => (id === item.id ? null : id));
                }}
              >
                {item.children?.length ? (
                  <DropdownTrigger
                    item={item}
                    compact={compact}
                    active={isNavItemActive(pathname, item)}
                    open={open}
                    panelId={panelId}
                    onToggle={() => setOpenId((id) => (id === item.id ? null : item.id))}
                  />
                ) : (
                  <TopLink item={item} compact={compact} active={isNavItemActive(pathname, item)} />
                )}

                {item.children?.length && open ? (
                  <DropdownPanel
                    item={item}
                    pathname={pathname}
                    compact={compact}
                    panelId={panelId}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function topClass(compact: boolean, active: boolean) {
  if (compact) {
    return (
      "group flex w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center transition-colors sm:rounded-full sm:px-1.5 sm:py-1.5 " +
      (active ? "bg-white text-zinc-900" : "text-white/85 hover:bg-white/10 hover:text-white")
    );
  }
  return (
    "group flex w-full flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center transition-colors sm:rounded-full sm:px-2 sm:py-2 " +
    (active
      ? "bg-primary-foreground text-foreground"
      : "text-primary-foreground/85 hover:bg-primary-foreground/15 hover:text-primary-foreground")
  );
}

function labelClass(compact: boolean) {
  return compact
    ? "max-w-full px-0.5 text-[8px] font-semibold leading-tight tracking-wide sm:text-[9px]"
    : "max-w-full px-0.5 text-[9px] font-semibold leading-tight tracking-wide sm:text-[10px]";
}

function iconClass(compact: boolean, active: boolean) {
  return (
    (compact ? "size-4 sm:size-[1.15rem] " : "size-5 sm:size-[1.35rem] ") +
    "shrink-0 transition-transform group-hover:scale-110 " +
    (active ? "text-leaf" : "")
  );
}

function TopLink({
  item,
  compact,
  active,
}: {
  item: NavItem;
  compact: boolean;
  active: boolean;
}) {
  const Icon = item.icon;
  if (item.params) {
    return (
      <Link
        to={item.href}
        params={item.params}
        className={topClass(compact, active)}
        title={item.title}
        aria-label={item.title}
        aria-current={active ? "page" : undefined}
      >
        <Icon className={iconClass(compact, active)} strokeWidth={active ? 2.6 : 2.2} />
        <span className={labelClass(compact)}>{item.label}</span>
      </Link>
    );
  }
  return (
    <Link
      to={item.href}
      className={topClass(compact, active)}
      title={item.title}
      aria-label={item.title}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={iconClass(compact, active)} strokeWidth={active ? 2.6 : 2.2} />
      <span className={labelClass(compact)}>{item.label}</span>
    </Link>
  );
}

function DropdownTrigger({
  item,
  compact,
  active,
  open,
  onToggle,
  panelId,
}: {
  item: NavItem;
  compact: boolean;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  panelId: string;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={topClass(compact, active || open)}
      title={item.title}
      aria-label={item.title}
      aria-expanded={open}
      aria-controls={panelId}
      aria-haspopup="menu"
      onClick={onToggle}
    >
      <span className="relative inline-flex items-center">
        <Icon className={iconClass(compact, active || open)} strokeWidth={active || open ? 2.6 : 2.2} />
        <NavChevron
          className={
            "absolute -right-2.5 -top-0.5 size-2.5 opacity-80 transition-transform " +
            (open ? "rotate-180" : "")
          }
          strokeWidth={2.5}
        />
      </span>
      <span className={labelClass(compact)}>{item.label}</span>
    </button>
  );
}

function DropdownPanel({
  item,
  pathname,
  compact,
  panelId,
}: {
  item: NavItem;
  pathname: string;
  compact: boolean;
  panelId: string;
}) {
  return (
    <div
      id={panelId}
      role="menu"
      className="absolute left-1/2 top-full z-[80] w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 pt-1"
    >
      {/* Invisible hover bridge — fills gap so menu doesn't close while moving pointer */}
      <div className="absolute inset-x-0 top-0 h-1" aria-hidden />
      <div
        className={
          "rounded-2xl border p-1.5 shadow-lift " +
          (compact
            ? "border-white/15 bg-zinc-950/95 text-white backdrop-blur-md"
            : "border-border bg-card text-foreground")
        }
      >
        <div className="mb-1 border-b border-border/60 px-2.5 py-1.5">
          <Link
            to={item.href}
            className="text-[11px] font-semibold text-leaf hover:underline"
            role="menuitem"
          >
            Browse all {item.label.toLowerCase()} →
          </Link>
        </div>
        <ul className="max-h-[70vh] overflow-auto">
          {item.children!.map((child) => (
            <li key={child.id}>
              <ChildLink child={child} pathname={pathname} compact={compact} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ChildLink({
  child,
  pathname,
  compact,
}: {
  child: NavChild;
  pathname: string;
  compact: boolean;
}) {
  const Icon = child.icon;
  const active = isNavChildActive(pathname, child);
  const className =
    "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors " +
    (active
      ? compact
        ? "bg-white/15 text-white"
        : "bg-accent text-accent-foreground"
      : compact
        ? "text-white/90 hover:bg-white/10"
        : "text-foreground hover:bg-surface");

  const inner = (
    <>
      <span
        className={
          "grid size-8 place-items-center rounded-lg " +
          (compact ? "bg-white/10 text-volt" : "bg-accent text-leaf")
        }
      >
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <span className="font-semibold leading-tight">{child.label}</span>
    </>
  );

  if (child.href === "/marketplace/category/$slug" && child.params) {
    return (
      <Link
        to="/marketplace/category/$slug"
        params={child.params}
        role="menuitem"
        title={child.title}
        className={className}
      >
        {inner}
      </Link>
    );
  }

  if (child.href === "/directory" && child.search) {
    return (
      <Link
        to="/directory"
        search={{ category: child.search["category"] }}
        role="menuitem"
        title={child.title}
        className={className}
      >
        {inner}
      </Link>
    );
  }

  return (
    <Link to={child.href} role="menuitem" title={child.title} className={className}>
      {inner}
    </Link>
  );
}
