import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  searchIndiaLocations,
  type IndiaLocation,
} from "@/data/indiaLocations";

type Props = {
  id?: string;
  value: string;
  placeholder: string;
  icon?: "from" | "to";
  onQueryChange: (value: string) => void;
  onSelect: (loc: IndiaLocation) => void;
};

export function PlaceTypeahead({
  value,
  placeholder,
  onQueryChange,
  onSelect,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = useMemo(
    () => (value.trim().length >= 3 ? searchIndiaLocations(value, 8) : []),
    [value],
  );
  const showList = open && suggestions.length > 0;
  const showHint = open && value.trim().length > 0 && value.trim().length < 3;

  useEffect(() => {
    setHighlight(0);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <div className="flex items-center gap-3">
        <MapPin className="size-4 shrink-0 text-leaf" />
        <input
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              const hit = suggestions[highlight];
              if (hit) {
                e.preventDefault();
                onSelect(hit);
                setOpen(false);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showHint ? (
        <p className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 rounded-2xl border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground shadow-lift">
          Type at least 3 letters to search cities
        </p>
      ) : null}

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-56 overflow-y-auto rounded-2xl border border-border bg-card py-1 shadow-lift"
        >
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={
                  "flex w-full flex-col items-start px-3 py-2 text-left text-sm " +
                  (i === highlight ? "bg-accent" : "hover:bg-surface")
                }
                onMouseEnter={() => setHighlight(i)}
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
              >
                <span className="font-semibold text-foreground">{s.name}</span>
                <span className="text-[11px] text-muted-foreground">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
