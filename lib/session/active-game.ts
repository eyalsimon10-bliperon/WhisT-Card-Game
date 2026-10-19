const STORAGE_KEY = "whist_active_game";

export interface ActiveGameRef {
  code: string;
  playerId: string;
  isBotRoom: boolean;
  savedAt: number;
}

export function getActiveGame(): ActiveGameRef | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveGameRef;
    if (!parsed?.code || !parsed?.playerId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveGame(ref: Omit<ActiveGameRef, "savedAt">): void {
  if (typeof window === "undefined") return;
  const payload: ActiveGameRef = { ...ref, savedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearActiveGame(code?: string): void {
  if (typeof window === "undefined") return;
  if (code) {
    const current = getActiveGame();
    if (current && current.code.toUpperCase() !== code.toUpperCase()) return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
