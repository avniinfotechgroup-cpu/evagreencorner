import { usAqiCategory } from "@/data/aqi";

type Mood = {
  label: string;
  skyBottom: string;
  cloud: string;
  haze: string;
};

function moodFromAqi(aqi: number): Mood {
  const label = usAqiCategory(aqi).label;
  if (label === "Good") {
    return {
      label,
      skyBottom: "rgba(16,185,129,0.42)",
      cloud: "rgba(167,243,208,0.55)",
      haze: "rgba(45,212,191,0.28)",
    };
  }
  if (label === "Moderate") {
    return {
      label,
      skyBottom: "rgba(234,179,8,0.48)",
      cloud: "rgba(253,224,71,0.5)",
      haze: "rgba(250,204,21,0.32)",
    };
  }
  if (label === "Poor") {
    return {
      label,
      skyBottom: "rgba(249,115,22,0.5)",
      cloud: "rgba(253,186,116,0.55)",
      haze: "rgba(251,146,60,0.35)",
    };
  }
  if (label === "Unhealthy") {
    return {
      label,
      skyBottom: "rgba(244,63,94,0.55)",
      cloud: "rgba(251,113,133,0.55)",
      haze: "rgba(225,29,72,0.4)",
    };
  }
  if (label === "Severe") {
    return {
      label,
      skyBottom: "rgba(192,38,211,0.55)",
      cloud: "rgba(232,121,249,0.55)",
      haze: "rgba(168,85,247,0.4)",
    };
  }
  return {
    label: "Hazardous",
    skyBottom: "rgba(127,29,29,0.6)",
    cloud: "rgba(248,113,113,0.55)",
    haze: "rgba(153,27,27,0.45)",
  };
}

/** Static atmosphere — colours follow AQI only (no drifting animation). */
export function AqiAtmosphere({ aqi }: { aqi: number }) {
  const mood = moodFromAqi(aqi);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem] transition-[background] duration-500"
      data-aqi-mood={mood.label}
    >
      <div
        className="absolute inset-0 transition-[background] duration-500"
        style={{
          background: `linear-gradient(180deg, transparent 5%, ${mood.haze} 45%, ${mood.skyBottom} 100%)`,
        }}
      />

      {/* Soft static cloud shapes */}
      <svg
        viewBox="0 0 900 320"
        className="absolute inset-x-0 top-[18%] h-[55%] w-full opacity-80 transition-opacity duration-500"
        aria-hidden
      >
        <ellipse cx="120" cy="80" rx="90" ry="36" fill={mood.cloud} />
        <ellipse cx="190" cy="70" rx="70" ry="40" fill={mood.cloud} />
        <ellipse cx="260" cy="85" rx="80" ry="32" fill={mood.cloud} />

        <ellipse cx="480" cy="100" rx="100" ry="38" fill={mood.cloud} opacity="0.85" />
        <ellipse cx="560" cy="88" rx="75" ry="42" fill={mood.cloud} opacity="0.85" />
        <ellipse cx="640" cy="105" rx="85" ry="34" fill={mood.cloud} opacity="0.85" />

        <ellipse cx="320" cy="160" rx="95" ry="30" fill={mood.cloud} opacity="0.55" />
        <ellipse cx="400" cy="150" rx="70" ry="34" fill={mood.cloud} opacity="0.55" />

        <ellipse cx="720" cy="150" rx="88" ry="32" fill={mood.cloud} opacity="0.6" />
        <ellipse cx="790" cy="140" rx="65" ry="36" fill={mood.cloud} opacity="0.6" />
      </svg>

      <div
        className="absolute inset-x-[-10%] bottom-[8%] h-[36%] blur-3xl transition-[background] duration-500"
        style={{ background: mood.haze }}
      />

      <svg
        viewBox="0 0 900 160"
        className="absolute bottom-0 left-1/2 h-[28%] w-[120%] -translate-x-1/2 opacity-45"
        aria-hidden
      >
        <path
          fill="rgba(15,10,18,0.5)"
          d="M0 160 V95 L35 95 L50 55 L68 95 L110 95 L125 70 L145 95 L190 95 L210 40 L235 95 L280 95 L300 65 L325 95 L370 95 L390 30 L420 95 L470 95 L495 55 L520 95 L575 95 L595 38 L625 95 L680 95 L700 62 L725 95 L770 95 L790 45 L820 95 L900 95 V160 Z"
        />
      </svg>
    </div>
  );
}
