import { Node, mergeAttributes } from "@tiptap/core";

export type EmbedProvider = "twitter" | "youtube" | "iframe" | "link";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    socialEmbed: {
      setSocialEmbed: (attrs: { src: string; provider: EmbedProvider; title?: string }) => ReturnType;
    };
  }
}

function detectProvider(url: string): EmbedProvider {
  const u = url.toLowerCase();
  if (u.includes("twitter.com/") || u.includes("x.com/")) return "twitter";
  if (u.includes("youtube.com/") || u.includes("youtu.be/")) return "youtube";
  if (u.includes("vimeo.com/") || u.includes("open.spotify.com/") || u.includes("soundcloud.com/")) {
    return "iframe";
  }
  return "link";
}

export function detectEmbedProvider(url: string): EmbedProvider {
  return detectProvider(url);
}

export function extractTweetId(url: string): string | null {
  const m = url.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?\w+\/status(?:es)?\/(\d+)/i);
  return m?.[1] ?? null;
}

export const SocialEmbed = Node.create({
  name: "socialEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      provider: { default: "link" },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="social-embed"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const provider = String(HTMLAttributes["provider"] || "link");
    const src = String(HTMLAttributes["src"] || "");
    const title = String(HTMLAttributes["title"] || src);
    return [
      "div",
      mergeAttributes(
        {
          "data-type": "social-embed",
          "data-provider": provider,
          "data-src": src,
          class: `rte-social-embed rte-embed-${provider}`,
        },
        HTMLAttributes,
      ),
      [
        "a",
        {
          href: src,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
          class: "rte-embed-fallback-link",
        },
        title || src,
      ],
    ];
  },

  addCommands() {
    return {
      setSocialEmbed:
        (attrs) =>
        ({ commands }) => {
          const src = attrs.src.trim();
          if (!src) return false;
          const provider = attrs.provider || detectProvider(src);
          return commands.insertContent({
            type: this.name,
            attrs: {
              src,
              provider,
              title: attrs.title?.trim() || src,
            },
          });
        },
    };
  },
});
