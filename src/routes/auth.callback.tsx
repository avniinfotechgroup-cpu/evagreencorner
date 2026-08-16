import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SiteFooter } from "@/components/platform/SiteFooter";
import { SiteHeader } from "@/components/platform/SiteHeader";
import { IconicLoader } from "@/components/platform/IconicLoader";
import { siteConfig } from "@/config/platform";
import { completeOAuthLogin } from "@/lib/community/auth.functions";
import { useAuth } from "@/lib/community/useAuth";

const searchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: `Signing in… | ${siteConfig.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const search = Route.useSearch();
  const { login } = useAuth();
  const complete = useServerFn(completeOAuthLogin);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (search.error) {
        setError(search.error_description || search.error);
        return;
      }
      if (!search.code || !search.state) {
        setError("Missing login code from Google/Microsoft.");
        return;
      }
      try {
        const res = await complete({
          data: { code: search.code, state: search.state },
        });
        if (cancelled) return;
        login({ token: res.token, user: res.user });
        window.location.assign(res.redirect || "/rewards");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "OAuth login failed.");
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [search.code, search.state, search.error, search.error_description, complete, login]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-20 text-center">
        {error ? (
          <>
            <h1 className="font-display text-2xl font-bold">Sign-in failed</h1>
            <p className="mt-3 text-sm text-destructive">{error}</p>
            <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-primary underline">
              Back to login
            </Link>
          </>
        ) : (
          <IconicLoader size="md" fullscreen label="Completing Google / Microsoft sign-in…" />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
