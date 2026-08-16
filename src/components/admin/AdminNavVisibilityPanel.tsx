import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import {
  adminGetNavVisibility,
  adminSetNavCategoryFlag,
  adminSetNavMenuFlag,
} from "@/lib/platform/nav-visibility.functions";

type Props = {
  token: string;
  onMsg: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

type MenuRow = Awaited<ReturnType<typeof adminGetNavVisibility>>["menus"][number];

export function AdminNavVisibilityPanel({ token, onMsg, onError }: Props) {
  const load = useServerFn(adminGetNavVisibility);
  const setMenu = useServerFn(adminSetNavMenuFlag);
  const setCategory = useServerFn(adminSetNavCategoryFlag);
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    onError(null);
    try {
      const res = await load({ data: { token } });
      setMenus(res.menus);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not load menu settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading && !menus.length) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading menu visibility…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Control which public header menus and dropdown categories are visible. EV services and
        Green services stay hidden until you enable them here.
      </p>

      {menus.map((menu) => (
        <div
          key={menu.id}
          className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold">{menu.label}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{menu.description}</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void setMenu({
                  data: { token, menuId: menu.id, enabled: !menu.enabled },
                })
                  .then(() => {
                    onMsg(
                      `${menu.label} menu ${menu.enabled ? "hidden" : "enabled"} on public site`,
                    );
                    return refresh();
                  })
                  .catch((err) =>
                    onError(err instanceof Error ? err.message : "Update failed"),
                  )
                  .finally(() => setBusy(false));
              }}
              className={
                "rounded-full px-3.5 py-1.5 text-xs font-semibold " +
                (menu.enabled
                  ? "bg-leaf/15 text-foreground"
                  : "bg-muted text-muted-foreground")
              }
            >
              {menu.enabled ? "Menu enabled" : "Menu hidden"}
            </button>
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </p>
            <ul className="mt-2 space-y-2">
              {menu.categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold">{cat.label}</p>
                    <p className="text-[11px] text-muted-foreground">{cat.id}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || !menu.enabled}
                    title={
                      !menu.enabled
                        ? "Enable the parent menu first"
                        : cat.enabled
                          ? "Hide category"
                          : "Show category"
                    }
                    onClick={() => {
                      setBusy(true);
                      void setCategory({
                        data: {
                          token,
                          menuId: menu.id,
                          categoryId: cat.id,
                          enabled: !cat.enabled,
                        },
                      })
                        .then(() => {
                          onMsg(
                            `${cat.label} ${cat.enabled ? "hidden" : "enabled"} under ${menu.label}`,
                          );
                          return refresh();
                        })
                        .catch((err) =>
                          onError(err instanceof Error ? err.message : "Update failed"),
                        )
                        .finally(() => setBusy(false));
                    }}
                    className={
                      "rounded-full px-3 py-1 text-[11px] font-semibold disabled:opacity-40 " +
                      (cat.enabled
                        ? "bg-leaf/15 text-foreground"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {cat.enabled ? "Enabled" : "Hidden"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
