import { randomBytes } from "node:crypto";

export function generateTempPassword(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export type MailResult = {
  sent: boolean;
  mode: "smtp" | "resend" | "console";
  preview?: string;
};

export async function sendLoginCredentialsEmail(input: {
  to: string;
  name: string;
  password: string;
  isNew: boolean;
  appUrl: string;
}): Promise<MailResult> {
  const brand = process.env["VITE_BRAND_NAME"] || "EVA Green Corner";
  const from =
    process.env["SMTP_FROM"] ||
    process.env["RESEND_FROM"] ||
    process.env["VITE_SUPPORT_EMAIL"] ||
    "hello@evagreencorner.com";

  const subject = input.isNew
    ? `Your ${brand} login details`
    : `Your ${brand} login password (updated)`;

  const text = [
    `Hi ${input.name},`,
    "",
    input.isNew
      ? `Welcome to ${brand}. Your account was created automatically.`
      : `You requested email login on ${brand}. Here are your updated login details.`,
    "",
    `Email: ${input.to}`,
    `Password: ${input.password}`,
    "",
    `Open app: ${input.appUrl}`,
    "",
    "You can review EV charging stations, upload condition photos, and earn credits.",
    "",
    "If you did not request this, ignore this email.",
    "",
    `— ${brand}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2>${subject}</h2>
      <p>Hi ${escapeHtml(input.name)},</p>
      <p>${
        input.isNew
          ? `Welcome to <strong>${escapeHtml(brand)}</strong>. Your account was created automatically.`
          : `You requested email login on <strong>${escapeHtml(brand)}</strong>.`
      }</p>
      <p>
        <strong>Email:</strong> ${escapeHtml(input.to)}<br/>
        <strong>Password:</strong> <code style="font-size:16px">${escapeHtml(input.password)}</code>
      </p>
      <p><a href="${escapeHtml(input.appUrl)}">Open ${escapeHtml(brand)}</a></p>
      <p style="color:#666;font-size:12px">Keep this email safe. You can use these details to sign in later.</p>
    </div>
  `;

  const resendKey = process.env["RESEND_API_KEY"];
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Email send failed (${res.status}): ${body.slice(0, 200)}`);
    }
    return { sent: true, mode: "resend" };
  }

  const host = process.env["SMTP_HOST"];
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  if (host && user && pass) {
    // Dynamic import keeps nodemailer out of the browser bundle.
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env["SMTP_PORT"] || 587),
      secure: process.env["SMTP_SECURE"] === "true",
      auth: { user, pass },
    });
    await transporter.sendMail({
      from,
      to: input.to,
      subject,
      text,
      html,
    });
    return { sent: true, mode: "smtp" };
  }

  console.info("[mail:console]", {
    to: input.to,
    subject,
    password: input.password,
    isNew: input.isNew,
  });
  return {
    sent: false,
    mode: "console",
    preview: `Dev mode: email not configured. Password for ${input.to}: ${input.password}`,
  };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
