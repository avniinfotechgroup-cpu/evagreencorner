import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { SiteLogo } from "@/components/platform/SiteLogo";
import { siteConfig } from "@/config/platform";
import {
  getAuthProviders,
  getOAuthStartUrl,
  loginUser,
  loginWithEmailOnly,
} from "@/lib/community/auth.functions";
import { useAuth } from "@/lib/community/useAuth";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: `Login | ${siteConfig.name}` },
      {
        name: "description",
        content:
          "Sign in with Google, Microsoft, or email to review EV charging stations and earn credits.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const { login } = useAuth();
  const doEmailLogin = useServerFn(loginWithEmailOnly);
  const doPasswordLogin = useServerFn(loginUser);
  const fetchProviders = useServerFn(getAuthProviders);
  const fetchOAuthUrl = useServerFn(getOAuthStartUrl);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState({
    google: false,
    microsoft: false,
    emailOnly: true,
    passwordLogin: true,
  });

  useEffect(() => {
    void fetchProviders().then(setProviders).catch(() => undefined);
  }, [fetchProviders]);

  const finish = (session: { token: string; user: Parameters<typeof login>[0]["user"] }, message?: string) => {
    login(session);
    if (message) setInfo(message);
    const next = redirect && redirect.startsWith("/") ? redirect : "/rewards";
    window.setTimeout(() => window.location.assign(next), message ? 900 : 0);
  };

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await doEmailLogin({ data: { email } });
      finish({ token: res.token, user: res.user }, res.message + (res.mailHint ? ` ${res.mailHint}` : ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const onPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await doPasswordLogin({ data: { email, password } });
      finish(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const startOAuth = async (provider: "google" | "microsoft") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetchOAuthUrl({
        data: {
          provider,
          ...(redirect ? { redirect } : {}),
        },
      });
      window.location.assign(res.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `${provider} login is not configured. Add client ID/secret in .env`,
      );
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-5 py-14">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-lift">
          <div className="flex items-center gap-3">
            <SiteLogo variant="icon" size="sm" className="size-10" />
            <div>
              <h1 className="font-display text-2xl font-bold">Sign in to review</h1>
              <p className="text-xs text-muted-foreground">
                Google · Microsoft · or email only (account auto-created)
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              disabled={busy || !providers.google}
              onClick={() => void startOAuth("google")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-surface disabled:opacity-50"
              title={!providers.google ? "Add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env" : "Continue with Google"}
            >
              <GoogleIcon />
              Continue with Google
              {!providers.google ? (
                <span className="text-[10px] font-medium text-muted-foreground">(setup .env)</span>
              ) : null}
            </button>
            <button
              type="button"
              disabled={busy || !providers.microsoft}
              onClick={() => void startOAuth("microsoft")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-surface disabled:opacity-50"
              title={
                !providers.microsoft
                  ? "Add MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET in .env"
                  : "Continue with Microsoft"
              }
            >
              <MicrosoftIcon />
              Continue with Microsoft
              {!providers.microsoft ? (
                <span className="text-[10px] font-medium text-muted-foreground">(setup .env)</span>
              ) : null}
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or email
            <span className="h-px flex-1 bg-border" />
          </div>

          {!showAdminPassword ? (
            <form onSubmit={onEmailSubmit} className="space-y-3">
              <label className="block text-xs font-semibold">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <p className="text-[11px] text-muted-foreground">
                Enter email and submit — we create your account if needed, save it in our database,
                email you the login details, and sign you in.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Continue with email
              </button>
            </form>
          ) : (
            <form onSubmit={onPasswordSubmit} className="space-y-3">
              <label className="block text-xs font-semibold">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold">
                Password
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Log in with password
              </button>
            </form>
          )}

          {(error || info) && (
            <p
              className={
                "mt-3 text-sm " + (error ? "text-destructive" : "text-foreground")
              }
            >
              {error || info}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setShowAdminPassword((v) => !v);
              setError(null);
              setInfo(null);
            }}
            className="mt-4 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showAdminPassword ? "Back to email-only login" : "Admin / password login"}
          </button>

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Google/Microsoft need OAuth keys in <code>.env</code>. Email delivery needs{" "}
            <code>RESEND_API_KEY</code> or SMTP. Without email config, credentials are printed in
            the server console (dev).
          </p>
        </div>

        <Link to="/" className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground">
          ← Back to search
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 36.3 44 31.5 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden>
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#00a4ef" d="M12 1h10v10H12z" />
      <path fill="#7fba00" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}
