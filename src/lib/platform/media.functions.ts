import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/community/auth.server";

export const adminUploadEditorImage = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        token: z.string().min(10),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        base64: z.string().min(32).max(8_000_000),
        altText: z.string().max(200).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { saveEditorImage } = await import("./media-upload");
    return saveEditorImage({
      mimeType: data.mimeType,
      base64: data.base64,
      altText: data.altText,
    });
  });
