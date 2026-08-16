import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/platform";
import logoFull from "@/assets/brand/eva-green-corner-logo.png";
import logoIcon from "@/assets/brand/eva-green-corner-icon.png";

type Size = "sm" | "md" | "lg";

const WORDMARK: Record<Size, string> = {
  sm: "h-14 w-auto max-h-16 sm:h-16",
  md: "h-16 w-auto max-h-20 sm:h-[4.75rem]",
  lg: "h-[4.75rem] w-auto max-h-24 sm:h-24",
};

const ICON: Record<Size, string> = {
  sm: "size-14",
  md: "size-16",
  lg: "size-20",
};

type Props = {
  /** Full logo (emblem + wordmark) vs icon only */
  variant?: "full" | "icon";
  size?: Size;
  className?: string;
  priority?: boolean;
};

/** Official EVA Green Corner logo / icon (bundled assets). */
export function SiteLogo({
  variant = "full",
  size = "md",
  className,
  priority = false,
}: Props) {
  if (variant === "icon") {
    return (
      <img
        src={logoIcon}
        alt=""
        width={256}
        height={256}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={cn("block shrink-0 object-contain", ICON[size], className)}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={logoFull}
      alt={siteConfig.name}
      width={939}
      height={346}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn("block shrink-0 object-contain object-left", WORDMARK[size], className)}
    />
  );
}

export { logoFull, logoIcon };
