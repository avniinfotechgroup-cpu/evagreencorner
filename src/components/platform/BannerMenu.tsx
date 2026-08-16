import { HeroMainMenu } from "./HeroMainMenu";

/** Main menu sits on the hero / canopy banner itself (not a separate header strip). */
export function BannerMenu({ compact = false }: { compact?: boolean }) {
  return (
    <div className={(compact ? "mb-3 " : "mb-6 ") + "relative z-[60] overflow-visible"}>
      <HeroMainMenu variant="hero" compact={compact} />
    </div>
  );
}
