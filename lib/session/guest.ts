import type { GuestSession } from "@/lib/types";

const STORAGE_KEY_GUEST = "whist_guest_session";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GUEST);
    return raw ? (JSON.parse(raw) as GuestSession) : null;
  } catch {
    return null;
  }
}

export function saveGuestSession(session: GuestSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_GUEST, JSON.stringify(session));
}

export function getOrCreateGuestSession(displayName: string): GuestSession {
  const existing = getGuestSession();
  if (existing && existing.displayName === displayName.trim()) {
    return existing;
  }
  const session: GuestSession = {
    playerId: generateId(),
    displayName: displayName.trim(),
  };
  saveGuestSession(session);
  return session;
}
