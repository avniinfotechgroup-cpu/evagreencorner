/**
 * Client-safe job constants (no Node/SQLite imports).
 */
export const JOB_STATUSES = ["draft", "published", "expired", "archived"] as const;

export const JOB_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "apprenticeship",
  "fellowship",
  "temporary",
  "volunteer",
] as const;

export const REMOTE_TYPES = ["onsite", "hybrid", "remote"] as const;

export const JOB_TYPE_LABEL: Record<(typeof JOB_TYPES)[number], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  apprenticeship: "Apprenticeship",
  fellowship: "Fellowship",
  temporary: "Temporary",
  volunteer: "Volunteer",
};

export const REMOTE_LABEL: Record<(typeof REMOTE_TYPES)[number], string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

/** Seed / fallback categories for admin selects (matched by slug on save). */
export const JOB_CATEGORY_OPTIONS: Array<{
  slug: string;
  name: string;
  description: string;
  sort: number;
}> = [
  { name: "Renewable Energy", slug: "renewable-energy", description: "Solar, wind and other renewables careers.", sort: 10 },
  { name: "Solar", slug: "solar", description: "Rooftop and utility-scale solar roles.", sort: 20 },
  { name: "Wind Energy", slug: "wind-energy", description: "Wind project and O&M careers.", sort: 30 },
  { name: "EV & Mobility", slug: "ev-mobility", description: "Electric vehicles, charging and mobility.", sort: 40 },
  { name: "Battery Technology", slug: "battery-technology", description: "Battery R&D, manufacturing and recycling.", sort: 50 },
  { name: "Climate Tech", slug: "climate-tech", description: "Climate software, hardware and services.", sort: 60 },
  { name: "Environmental Science", slug: "environmental-science", description: "Field science, monitoring and analysis.", sort: 70 },
  { name: "Sustainability", slug: "sustainability", description: "Corporate and project sustainability roles.", sort: 80 },
  { name: "ESG", slug: "esg", description: "ESG reporting, risk and strategy.", sort: 90 },
  { name: "Waste Management", slug: "waste-management", description: "Waste, recycling and circular operations.", sort: 100 },
  { name: "Water Management", slug: "water-management", description: "Water treatment, reuse and watershed roles.", sort: 110 },
  { name: "Green Construction", slug: "green-construction", description: "Green buildings and sustainable construction.", sort: 120 },
  { name: "Energy Efficiency", slug: "energy-efficiency", description: "Audits, retrofits and efficiency programmes.", sort: 130 },
  { name: "Carbon Management", slug: "carbon-management", description: "Carbon accounting, offsets and markets.", sort: 140 },
  { name: "Environmental Policy", slug: "environmental-policy", description: "Policy research, advocacy and compliance.", sort: 150 },
  { name: "Research", slug: "research", description: "Academic and applied environmental research.", sort: 160 },
  { name: "Conservation", slug: "conservation", description: "Biodiversity and habitat conservation.", sort: 170 },
  { name: "Agriculture", slug: "agriculture", description: "Sustainable and regenerative agriculture.", sort: 180 },
  { name: "Circular Economy", slug: "circular-economy", description: "Reuse, remanufacturing and circular design.", sort: 190 },
];

/** Indian states & union territories for admin location selects. */
export const INDIA_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;
