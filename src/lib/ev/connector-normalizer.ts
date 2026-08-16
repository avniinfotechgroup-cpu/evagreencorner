const MAP: Array<{ match: RegExp; canonical: string }> = [
  { match: /ccs\s*2|combo\s*2|iec\s*62196-3|ccs2/i, canonical: "CCS2" },
  { match: /\bccs\b|combo/i, canonical: "CCS2" },
  { match: /chademo/i, canonical: "CHAdeMO" },
  { match: /gb\s*\/?\s*t|gbt/i, canonical: "GB/T" },
  { match: /nacs|tesla\s*supercharger|tesla\s*connector/i, canonical: "NACS" },
  { match: /type\s*2|mennekes|iec\s*62196-2/i, canonical: "Type 2" },
  { match: /type\s*1|j1772/i, canonical: "Type 1" },
  { match: /bharat\s*dc|dc-?001/i, canonical: "Bharat DC-001" },
  { match: /bharat\s*ac|ac-?001/i, canonical: "Bharat AC-001" },
  { match: /battery\s*swap|swap/i, canonical: "Battery swap" },
];

export function normalizeConnector(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  for (const rule of MAP) {
    if (rule.match.test(value)) return rule.canonical;
  }
  return value;
}

export function normalizeConnectors(raw: Array<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const item of raw) {
    const n = normalizeConnector(item);
    if (n) out.add(n);
  }
  return [...out];
}
