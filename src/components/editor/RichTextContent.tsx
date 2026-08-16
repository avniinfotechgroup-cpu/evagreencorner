import { useEffect, useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { extractTweetId } from "./SocialEmbed";

type Props = {
  html: string;
  className?: string;
};

const PURIFY = {
  ADD_TAGS: ["iframe", "figure", "figcaption"],
  ADD_ATTR: [
    "allow",
    "allowfullscreen",
    "frameborder",
    "scrolling",
    "target",
    "rel",
    "data-type",
    "data-provider",
    "data-src",
    "data-dnt",
    "loading",
    "referrerpolicy",
  ],
};

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function enhanceEmbeds(html: string) {
  if (typeof document === "undefined") return html;
  const wrap = document.createElement("div");
  wrap.innerHTML = html;

  wrap.querySelectorAll('[data-type="social-embed"]').forEach((node) => {
    const el = node as HTMLElement;
    const src = el.getAttribute("data-src") || el.getAttribute("src") || "";
    const provider =
      el.getAttribute("data-provider") || el.getAttribute("provider") || "link";
    if (!src) return;

    if (provider === "twitter") {
      const tweetId = extractTweetId(src);
      const box = document.createElement("div");
      box.className = "rte-twitter-embed my-6";
      if (tweetId) {
        box.innerHTML = `<blockquote class="twitter-tweet" data-dnt="true"><a href="${src}">View post on X</a></blockquote>`;
      } else {
        box.innerHTML = `<a class="rte-link-card" href="${src}" target="_blank" rel="noopener noreferrer">View on X ↗</a>`;
      }
      el.replaceWith(box);
      return;
    }

    if (provider === "iframe") {
      const box = document.createElement("div");
      box.className = "rte-iframe-embed my-6 aspect-video overflow-hidden rounded-xl";
      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = "Embedded content";
      iframe.className = "h-full w-full border-0";
      iframe.setAttribute("loading", "lazy");
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      box.appendChild(iframe);
      el.replaceWith(box);
      return;
    }

    // Generic blog / article link card
    const card = document.createElement("a");
    card.href = src;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className =
      "rte-link-card my-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-soft transition hover:border-leaf/40";
    let host = src;
    try {
      host = new URL(src).hostname.replace(/^www\./, "");
    } catch {
      /* keep */
    }
    card.innerHTML = `<div><p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">${host}</p><p class="mt-1 font-semibold text-foreground">${src}</p><p class="mt-1 text-xs text-leaf">Open article ↗</p></div>`;
    el.replaceWith(card);
  });

  return wrap.innerHTML;
}

function loadTwitterWidgets() {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    twttr?: { widgets?: { load?: () => void } };
  };
  if (w.twttr?.widgets?.load) {
    w.twttr.widgets.load();
    return;
  }
  if (document.getElementById("twitter-wjs")) {
    return;
  }
  const s = document.createElement("script");
  s.id = "twitter-wjs";
  s.async = true;
  s.src = "https://platform.twitter.com/widgets.js";
  document.body.appendChild(s);
}

export function RichTextContent({ html, className = "" }: Props) {
  const safe = useMemo(() => {
    const raw = html?.trim() || "";
    if (!raw) return "";
    if (!looksLikeHtml(raw)) {
      return DOMPurify.sanitize(
        `<p>${raw
          .split(/\n{2,}/)
          .map((p) => p.replace(/\n/g, "<br />"))
          .join("</p><p>")}</p>`,
        PURIFY,
      );
    }
    const cleaned = DOMPurify.sanitize(raw, PURIFY);
    if (typeof document === "undefined") return cleaned;
    return DOMPurify.sanitize(enhanceEmbeds(cleaned), PURIFY);
  }, [html]);

  useEffect(() => {
    if (!safe.includes("twitter-tweet")) return;
    loadTwitterWidgets();
  }, [safe]);

  if (!safe) return null;

  return (
    <div
      className={
        "rte-content text-foreground " + className
      }
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
