type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { charSet: string };

function envStr(key: string): string | undefined {
  try {
    const vite = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[
      key
    ];
    if (vite) return vite;
  } catch {
    // ignore
  }
  if (typeof process !== "undefined") {
    return process.env[key];
  }
  return undefined;
}

function brandName() {
  return envStr("VITE_BRAND_NAME") || "EVA Green Corner";
}

function supportEmail() {
  return envStr("VITE_SUPPORT_EMAIL") || "hello@evagreencorner.com";
}

function tagline() {
  return envStr("VITE_BRAND_TAGLINE") || "Your green corner for EV & clean living.";
}

/** Public site origin without trailing slash. */
export function siteOrigin() {
  return (envStr("VITE_APP_URL") || envStr("APP_URL") || "https://evagreencorner.com").replace(
    /\/$/,
    "",
  );
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}${p}`;
}

/**
 * Consistent title / description / keywords / Open Graph / Twitter / robots / canonical
 * so Google and social crawlers see the same signals.
 */
export function buildPageHead(opts: {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  extraMeta?: MetaTag[];
}) {
  const url = absoluteUrl(opts.path);
  const image = opts.image ? absoluteUrl(opts.image) : undefined;
  const type = opts.type ?? "website";
  const name = brandName();
  const keywords = opts.keywords?.trim();

  const meta: MetaTag[] = [
    { title: opts.title },
    { name: "description", content: opts.description },
    ...(keywords ? [{ name: "keywords", content: keywords } as MetaTag] : []),
    {
      name: "robots",
      content: opts.noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    },
    { name: "googlebot", content: opts.noindex ? "noindex, nofollow" : "index, follow" },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: type },
    { property: "og:url", content: url },
    { property: "og:site_name", content: name },
    { property: "og:locale", content: "en_IN" },
    ...(image
      ? [
          { property: "og:image", content: image } as MetaTag,
          { name: "twitter:image", content: image } as MetaTag,
        ]
      : []),
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
    ...(opts.extraMeta ?? []),
  ];

  return {
    meta,
    links: [{ rel: "canonical", href: url }],
  };
}

/** Merge CMS page_seo row over fallback defaults for a path. */
export function mergePageSeo(
  path: string,
  fallback: {
    title: string;
    description: string;
    keywords?: string;
    noindex?: boolean;
  },
  row?: {
    title: string;
    description: string;
    keywords: string;
    noindex: number;
  } | null,
) {
  return {
    path,
    title: row?.title?.trim() || fallback.title,
    description: row?.description?.trim() || fallback.description,
    keywords: row?.keywords?.trim() || fallback.keywords || "",
    noindex: row ? Boolean(row.noindex) : Boolean(fallback.noindex),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brandName(),
    url: siteOrigin(),
    email: supportEmail(),
    logo: absoluteUrl("/favicon-icon.png"),
    sameAs: [] as string[],
    areaServed: {
      "@type": "Country",
      name: "India",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brandName(),
    url: siteOrigin(),
    description: tagline(),
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}
