import { cn } from "@/lib/utils";
import { logoIcon } from "./SiteLogo";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE: Record<Size, string> = {
  sm: "size-8",
  md: "size-12",
  lg: "size-16",
  xl: "size-24",
};

const ICON_INSET: Record<Size, string> = {
  sm: "size-[70%]",
  md: "size-[72%]",
  lg: "size-[74%]",
  xl: "size-[76%]",
};

interface Props {
  label?: string;
  size?: Size;
  className?: string;
  fullscreen?: boolean;
}

function LoaderMark({ size, className }: { size: Size; className?: string }) {
  return (
    <div
      className={cn("iconic-loader relative shrink-0", SIZE[size], className)}
      role="status"
      aria-label="Loading"
    >
      <span className="eva-loader-orbit pointer-events-none absolute inset-0 rounded-full border border-leaf/25" />
      <span className="eva-loader-orbit-spin pointer-events-none absolute inset-[-2px] rounded-full border-2 border-transparent border-t-volt border-r-leaf/70" />
      <img
        src={logoIcon}
        alt=""
        width={128}
        height={128}
        decoding="async"
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 object-contain",
          ICON_INSET[size],
        )}
        aria-hidden
      />
    </div>
  );
}

/** Unique EVA Green Corner loader — logo icon perfectly centered in orbit. */
export function IconicLoader({
  label,
  size = "md",
  className,
  fullscreen = false,
}: Props) {
  const mark = <LoaderMark size={size} className={label || fullscreen ? undefined : className} />;

  if (fullscreen) {
    return (
      <div className={cn("flex min-h-[40vh] flex-col items-center justify-center gap-3", className)}>
        <LoaderMark size={size} />
        {label ? <p className="text-sm font-medium text-muted-foreground">{label}</p> : null}
      </div>
    );
  }

  if (label) {
    return (
      <div className={cn("inline-flex items-center gap-2.5", className)}>
        <LoaderMark size={size} />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
    );
  }

  return mark;
}

/** @deprecated Prefer SiteLogo */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  animated?: boolean;
}) {
  return (
    <img
      src={logoIcon}
      alt=""
      width={128}
      height={128}
      className={cn("block object-contain", SIZE[size], className)}
      aria-hidden
    />
  );
}
