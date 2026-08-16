import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { useServerFn } from "@tanstack/react-start";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Share2,
  Strikethrough,
  Twitter,
  Underline as UnderlineIcon,
  Undo2,
  Youtube as YoutubeIcon,
} from "lucide-react";
import { adminUploadEditorImage } from "@/lib/platform/media.functions";
import { detectEmbedProvider, SocialEmbed } from "./SocialEmbed";

type Props = {
  value: string;
  onChange: (html: string) => void;
  /** Admin session token — required for image file upload. */
  uploadToken: string;
  placeholder?: string;
  className?: string;
  minHeightClass?: string;
};

function ToolbarButton({
  onClick,
  active,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={
        "inline-flex size-8 items-center justify-center rounded-lg border text-foreground transition disabled:opacity-50 " +
        (active
          ? "border-leaf/40 bg-leaf/15 text-leaf"
          : "border-transparent hover:border-border hover:bg-surface")
      }
    >
      {children}
    </button>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read image file."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function mimeFromFile(file: File): "image/jpeg" | "image/png" | "image/webp" {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

export function RichTextEditor({
  value,
  onChange,
  uploadToken,
  placeholder = "Write your blog post…",
  className = "",
  minHeightClass = "min-h-[280px]",
}: Props) {
  const uploadImage = useServerFn(adminUploadEditorImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFnRef = useRef<(file: File) => Promise<void>>(async () => {});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-leaf underline underline-offset-2",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: "rte-image rounded-xl max-w-full h-auto my-4",
        },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: {
          class: "rte-youtube rounded-xl overflow-hidden my-4 aspect-video w-full",
        },
      }),
      SocialEmbed,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: `max-w-none px-3 py-3 focus:outline-none ${minHeightClass}`,
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void uploadFnRef.current(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const image = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!image) return false;
        event.preventDefault();
        void uploadFnRef.current(image);
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    uploadFnRef.current = async (file: File) => {
      const ed = editor as Editor | null;
      if (!ed) return;
      if (!uploadToken) {
        setUploadError("Sign in as admin to upload images.");
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) {
        setUploadError("Only JPEG, PNG, or WebP images are allowed.");
        return;
      }
      setUploading(true);
      setUploadError(null);
      try {
        const base64 = await fileToBase64(file);
        const alt =
          file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 120) ||
          "Uploaded image";
        const res = await uploadImage({
          data: {
            token: uploadToken,
            mimeType: mimeFromFile(file),
            base64,
            altText: alt,
          },
        });
        ed.chain().focus().setImage({ src: res.url, alt: res.alt || alt }).run();
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Image upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
  }, [editor, uploadToken, uploadImage]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next === current) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="rounded-xl border border-border bg-background px-3 py-8 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  const setLink = () => {
    const prev = editor.getAttributes("link")["href"] as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const addYoutube = () => {
    const url = window.prompt("YouTube URL");
    if (!url?.trim()) return;
    editor.commands.setYoutubeVideo({ src: url.trim() });
  };

  const addTwitter = () => {
    const url = window.prompt("X / Twitter post URL (https://x.com/…/status/…)");
    if (!url?.trim()) return;
    editor.commands.setSocialEmbed({
      src: url.trim(),
      provider: "twitter",
      title: "View post on X",
    });
  };

  const addEmbed = () => {
    const url = window.prompt("Embed / article URL (blog, news, Spotify, etc.)");
    if (!url?.trim()) return;
    const src = url.trim();
    const provider = detectEmbedProvider(src);
    if (provider === "youtube") {
      editor.commands.setYoutubeVideo({ src });
      return;
    }
    editor.commands.setSocialEmbed({
      src,
      provider,
      title: provider === "twitter" ? "View post on X" : src,
    });
  };

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-background ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFnRef.current(file);
        }}
      />
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface/60 p-2">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Strike"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          title="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Subheading"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Upload image"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImageIcon className="size-3.5" />
          )}
        </ToolbarButton>
        <ToolbarButton title="YouTube" onClick={addYoutube}>
          <YoutubeIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="X / Twitter post" onClick={addTwitter}>
          <Twitter className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Embed / other blog link" onClick={addEmbed}>
          <Share2 className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      {uploadError ? (
        <p className="border-t border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
          {uploadError}
        </p>
      ) : (
        <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          Image button uploads a file (JPEG/PNG/WebP). You can also paste or drag an image into the
          editor. Links, YouTube, X, and other embeds still use the toolbar.
        </p>
      )}
    </div>
  );
}
