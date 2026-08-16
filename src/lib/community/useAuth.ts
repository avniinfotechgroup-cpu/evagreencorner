import { useCallback, useEffect, useState } from "react";
import {
  clearSession,
  readSession,
  writeSession,
  type SessionUser,
  type StoredSession,
} from "./session";

export function useAuth() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    setReady(true);
    window.addEventListener("evgm-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("evgm-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const login = useCallback((next: StoredSession) => {
    writeSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const patchUser = useCallback((user: SessionUser) => {
    const cur = readSession();
    if (!cur) return;
    const next = { ...cur, user };
    writeSession(next);
    setSession(next);
  }, []);

  return {
    ready,
    session,
    user: session?.user ?? null,
    token: session?.token,
    login,
    logout,
    patchUser,
  };
}
