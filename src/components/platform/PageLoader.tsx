import { logoFull, logoIcon } from "./SiteLogo";
import { siteConfig } from "@/config/platform";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  className?: string;
};

/**
 * Full-page EVA Green Corner loader — shown while a route is pending.
 */
export function PageLoader({
  label = `Loading ${siteConfig.name}…`,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "eva-page-loader flex min-h-screen w-full items-center justify-center bg-background",
        className,
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div className="relative size-24 shrink-0">
          <span className="eva-loader-orbit pointer-events-none absolute inset-0 rounded-full border border-leaf/25" />
          <span className="eva-loader-orbit-spin pointer-events-none absolute inset-[-3px] rounded-full border-2 border-transparent border-t-volt border-r-leaf/70" />
          <img
            src={logoIcon}
            alt=""
            width={128}
            height={128}
            className="absolute left-1/2 top-1/2 z-[1] size-[72%] -translate-x-1/2 -translate-y-1/2 object-contain"
            aria-hidden
          />
        </div>
        <p className="text-sm font-medium tracking-wide text-muted-foreground">{label}</p>
        <img
          src={logoFull}
          alt={siteConfig.name}
          width={320}
          height={213}
          className="h-16 w-auto max-w-[20rem] object-contain opacity-95"
        />
      </div>
    </div>
  );
}
