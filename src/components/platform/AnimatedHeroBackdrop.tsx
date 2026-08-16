/** Animated hero backdrop — slow image drift + floating orbs + canopy wash. */
export function AnimatedHeroBackdrop({
  imageSrc,
  alt,
}: {
  imageSrc: string;
  alt: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <img
        src={imageSrc}
        alt={alt}
        width={1600}
        height={1000}
        className="hero-bg-ken absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-canopy opacity-[0.88]" />
      <div className="hero-bg-sheen absolute inset-0" />
      <div className="hero-bg-orb hero-bg-orb-a" />
      <div className="hero-bg-orb hero-bg-orb-b" />
      <div className="hero-bg-orb hero-bg-orb-c" />
      <div className="absolute inset-0 grid-lines opacity-[0.12]" />
    </div>
  );
}
