/**
 * Google / Microsoft OAuth helpers (authorization-code flow).
 * Configure env vars to enable buttons on /login.
 */

export type OAuthProvider = "google" | "microsoft";

export function getAppBaseUrl() {
  return (
    process.env["VITE_APP_URL"] ||
    process.env["APP_URL"] ||
    "http://localhost:8080"
  ).replace(/\/$/, "");
}

export function getOAuthStatus() {
  return {
    google: Boolean(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]),
    microsoft: Boolean(
      process.env["MICROSOFT_CLIENT_ID"] && process.env["MICROSOFT_CLIENT_SECRET"],
    ),
  };
}

export function getOAuthAuthorizeUrl(provider: OAuthProvider, redirectPath: string) {
  const base = getAppBaseUrl();
  const redirectUri = `${base}/auth/callback`;
  const statePayload = JSON.stringify({
    provider,
    redirect: redirectPath || "/rewards",
  });
  const state =
    typeof Buffer !== "undefined"
      ? Buffer.from(statePayload).toString("base64url")
      : btoa(statePayload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  if (provider === "google") {
    const clientId = process.env["GOOGLE_CLIENT_ID"];
    if (!clientId) throw new Error("Google login is not configured (GOOGLE_CLIENT_ID).");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("state", state);
    return url.toString();
  }

  const clientId = process.env["MICROSOFT_CLIENT_ID"];
  if (!clientId) throw new Error("Microsoft login is not configured (MICROSOFT_CLIENT_ID).");
  const tenant = process.env["MICROSOFT_TENANT"] || "common";
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid email profile User.Read");
  url.searchParams.set("state", state);
  return url.toString();
}

export function parseOAuthState(state: string | undefined): {
  provider: OAuthProvider;
  redirect: string;
} {
  if (!state) throw new Error("Missing OAuth state.");
  try {
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(state, "base64url").toString("utf8")
        : atob(state.replace(/-/g, "+").replace(/_/g, "/"));
    const raw = JSON.parse(json) as {
      provider?: string;
      redirect?: string;
    };
    if (raw.provider !== "google" && raw.provider !== "microsoft") {
      throw new Error("Invalid provider");
    }
    const redirect =
      raw.redirect && raw.redirect.startsWith("/") ? raw.redirect : "/rewards";
    return { provider: raw.provider, redirect };
  } catch {
    throw new Error("Invalid OAuth state.");
  }
}

export async function exchangeOAuthCode(provider: OAuthProvider, code: string) {
  const redirectUri = `${getAppBaseUrl()}/auth/callback`;

  if (provider === "google") {
    const clientId = process.env["GOOGLE_CLIENT_ID"];
    const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
    if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured.");

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokenRes.ok) throw new Error(`Google token exchange failed (${tokenRes.status})`);
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) throw new Error("Google did not return access_token.");

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!profileRes.ok) throw new Error("Could not load Google profile.");
    const profile = (await profileRes.json()) as {
      email?: string;
      name?: string;
      verified_email?: boolean;
    };
    if (!profile.email) throw new Error("Google account has no email.");
    return {
      email: profile.email.toLowerCase(),
      name: profile.name || profile.email.split("@")[0] || "User",
      provider: "google" as const,
    };
  }

  const clientId = process.env["MICROSOFT_CLIENT_ID"];
  const clientSecret = process.env["MICROSOFT_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("Microsoft OAuth is not configured.");
  const tenant = process.env["MICROSOFT_TENANT"] || "common";

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!tokenRes.ok) throw new Error(`Microsoft token exchange failed (${tokenRes.status})`);
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) throw new Error("Microsoft did not return access_token.");

  const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileRes.ok) throw new Error("Could not load Microsoft profile.");
  const profile = (await profileRes.json()) as {
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
  };
  const email = (profile.mail || profile.userPrincipalName || "").toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Microsoft account has no email.");
  return {
    email,
    name: profile.displayName || email.split("@")[0] || "User",
    provider: "microsoft" as const,
  };
}
