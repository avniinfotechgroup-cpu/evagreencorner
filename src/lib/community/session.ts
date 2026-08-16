const KEY = "evgm.session.v1";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  credits: number;
  createdAt: string;
  isAdmin?: boolean;
};

export type StoredSession = {
  token: string;
  user: SessionUser;
};

export function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("evgm-session"));
}

export function clearSession() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("evgm-session"));
}

export function useSessionToken() {
  return readSession()?.token;
}
