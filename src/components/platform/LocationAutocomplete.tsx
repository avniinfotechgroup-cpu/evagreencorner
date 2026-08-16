import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, Search } from "lucide-react";
import {
  searchIndiaLocations,
  type IndiaLocation,
} from "@/data/indiaLocations";
import { IconicLoader } from "./IconicLoader";

interface Props {
  value: string;
  selected: IndiaLocation | null;
  onQueryChange: (value: string) => void;
  onSelect: (location: IndiaLocation) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function LocationAutocomplete({
  value,
  selected,
  onQueryChange,
  onSelect,
  disabled,
  placeholder = "Type city name (min 3 letters), then select",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const suggestions = useMemo(() => searchIndiaLocations(value, 12), [value]);
  const showList = open && value.trim().length >= 3 && !disabled;

  const updatePosition = () => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!showList) {
      setCoords(null);
      return;
    }
    updatePosition();
    const onMove = () => updatePosition();
    window.addEventListener("resize", onMove);
    // capture scroll from any parent (hero, page, etc.)
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [showList, value]);

  useEffect(() => {
    setHighlight(0);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (loc: IndiaLocation) => {
    onSelect(loc);
    setOpen(false);
  };

  const dropdown =
    showList && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            className="max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-lift"
          >
            {suggestions.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                No matching location. Try a city name or 6-digit pincode.
              </p>
            ) : (
              suggestions.map((loc, i) => (
                <button
                  key={loc.id}
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(loc)}
                  className={
                    "flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors " +
                    (i === highlight
                      ? "bg-accent text-foreground"
                      : "hover:bg-surface")
                  }
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-leaf" />
                  <span className="min-w-0">
                    <span className="font-semibold">
                      {loc.kind === "pincode"
                        ? `${loc.pincode} · ${loc.district || loc.name}`
                        : loc.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {loc.kind === "pincode"
                        ? `${loc.state}, India · PIN`
                        : loc.kind === "district"
                          ? `${loc.state}, India · District`
                          : `${loc.state}, India`}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className="relative min-w-0 flex-1"
    >
      <div className="flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showList || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const loc = suggestions[highlight];
              if (loc) pick(loc);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          aria-label="Search India location"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          className="w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
          autoComplete="off"
        />

        {selected ? (
          <span className="hidden shrink-0 rounded-full bg-leaf/15 px-2.5 py-1 text-[11px] font-semibold text-foreground sm:inline">
            Selected
          </span>
        ) : null}
      </div>

      {value.trim().length > 0 && value.trim().length < 3 ? (
        <p className="px-4 pb-1 text-[11px] text-muted-foreground">
          Type at least 3 characters…
        </p>
      ) : null}

      {dropdown}
    </div>
  );
}

export function LocationLoadingHint({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return <IconicLoader size="sm" label="Loading locations…" />;
}
