import type { Room } from "@/lib/types";
import type { GameState } from "@/lib/game/types";
import type { GameActionPayload } from "@/lib/server/game";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export async function fetchRoom(code: string): Promise<Room | null> {
  const res = await fetch(`/api/rooms?code=${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  const data = await parseJson<{ room: Room | null }>(res);
  return data.room;
}

export async function fetchOpenRoomsCount(): Promise<number> {
  const res = await fetch("/api/rooms?openCount=true", { cache: "no-store" });
  const data = await parseJson<{ count: number }>(res);
  return data.count;
}

export type RoomsAction =
  | { action: "create"; playerId: string; displayName: string }
  | { action: "join"; code: string; playerId: string; displayName: string }
  | { action: "quickMatch"; playerId: string; displayName: string }
  | { action: "botPractice"; playerId: string; displayName: string; totalRounds?: number }
  | { action: "leave"; code: string; playerId: string }
  | { action: "setStatus"; code: string; status: Room["status"] }
  | { action: "resetWaiting"; code: string };

export async function postRoomsAction(body: RoomsAction): Promise<{ room?: Room; roomCode?: string }> {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function postGameAction(
  code: string,
  playerId: string,
  action: GameActionPayload
): Promise<{ state: GameState | null; reset?: boolean }> {
  const res = await fetch(`/api/game/${encodeURIComponent(code)}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, action }),
  });
  return parseJson(res);
}

export async function fetchGameState(code: string): Promise<GameState | null> {
  const res = await fetch(`/api/game/${encodeURIComponent(code)}/action`, {
    method: "GET",
    cache: "no-store",
  });
  const data = await parseJson<{ state: GameState | null }>(res);
  return data.state;
}
