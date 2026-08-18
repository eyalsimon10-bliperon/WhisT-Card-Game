import { runBotsUntilHumanOrStable } from "@/lib/game/bots";
import {
  advanceToNextRound,
  clearCompletedTrickDisplay,
  createBotPlayers,
  createInitialGameState,
  finalizeTrickCollect,
  playCard,
  resolveCompletedTrick,
  submitCardExchange,
  submitContractAction,
  submitTrickBid,
} from "@/lib/game/engine";
import { normalizeGameState } from "@/lib/game/normalize-state";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { ContractAction, GameState } from "@/lib/game/types";
import type { Room } from "@/lib/types";
import { fetchRoom, setRoomStatusInDb } from "./rooms";

export async function loadGameState(roomCode: string): Promise<GameState | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("game_states")
    .select("state")
    .eq("room_code", roomCode.toUpperCase())
    .maybeSingle();

  if (error || !data?.state) return null;
  return normalizeGameState(data.state as GameState);
}

export async function saveGameStateToDb(state: GameState): Promise<void> {
  const supabase = createServiceRoleClient();
  const normalized = normalizeGameState(state);

  const { error } = await supabase.from("game_states").upsert(
    {
      room_code: normalized.roomCode.toUpperCase(),
      state: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_code" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteGameStateFromDb(roomCode: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.from("game_states").delete().eq("room_code", roomCode.toUpperCase());
}

export async function startGameInDb(
  room: Room,
  humanPlayerId: string,
  totalRounds = 13
): Promise<GameState> {
  const players = [...room.players];

  while (players.length < 4) {
    const [bot] = createBotPlayers(1);
    players.push({
      id: bot.id,
      name: bot.name,
      isHost: false,
      joinedAt: Date.now(),
    });
  }

  const sortedByJoin = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
  const firstBidderId = sortedByJoin[0].id;

  const humanIdx = players.findIndex((p) => p.id === humanPlayerId);
  const ordered =
    humanIdx <= 0 ? players : [...players.slice(humanIdx), ...players.slice(0, humanIdx)];

  const gamePlayers = ordered.map((p) => ({
    id: p.id,
    name: p.name,
    isBot: p.id.startsWith("bot-"),
  }));

  const firstBidderIndex = ordered.findIndex((p) => p.id === firstBidderId);

  let state = createInitialGameState(
    room.code,
    gamePlayers,
    totalRounds,
    firstBidderIndex >= 0 ? firstBidderIndex : 0
  );

  state = runBotsUntilHumanOrStable(state, humanPlayerId);
  await saveGameStateToDb(state);
  await setRoomStatusInDb(room.code, "playing");
  return state;
}

export type GameActionPayload =
  | { type: "start"; totalRounds?: number }
  | { type: "contract"; contractAction: ContractAction }
  | { type: "trickBid"; bid: number }
  | { type: "cardExchange"; cardIds: string[] }
  | { type: "playCard"; cardId: string }
  | { type: "finalizeTrickCollect" }
  | { type: "clearCompletedTrick" }
  | { type: "resolveTrick" }
  | { type: "advanceRound" }
  | { type: "runBots" }
  | { type: "playAgainBots"; totalRounds?: number }
  | { type: "resetRoom" };

function getPlayerSeat(state: GameState, playerId: string): number | null {
  return state.players.find((p) => p.id === playerId)?.seatIndex ?? null;
}

function assertTurn(state: GameState, seatIndex: number): void {
  if (state.currentPlayerIndex !== seatIndex) {
    throw new Error("Not your turn");
  }
}

export async function applyGameAction(
  roomCode: string,
  playerId: string,
  action: GameActionPayload
): Promise<GameState | null> {
  const normalizedCode = roomCode.toUpperCase();

  if (action.type === "start") {
    const room = await fetchRoom(normalizedCode);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== playerId) throw new Error("Only host can start");
    return startGameInDb(room, playerId, action.totalRounds ?? room.totalRounds ?? 13);
  }

  if (action.type === "playAgainBots") {
    const room = await fetchRoom(normalizedCode);
    if (!room?.isBotRoom) throw new Error("Not a bot room");
    await deleteGameStateFromDb(normalizedCode);
    await setRoomStatusInDb(normalizedCode, "playing");
    return startGameInDb({ ...room, status: "playing" }, playerId, action.totalRounds ?? 13);
  }

  if (action.type === "resetRoom") {
    await deleteGameStateFromDb(normalizedCode);
    await setRoomStatusInDb(normalizedCode, "waiting");
    return null;
  }

  let state = await loadGameState(normalizedCode);
  if (!state) throw new Error("Game not found");

  const seatIndex = getPlayerSeat(state, playerId);
  if (seatIndex === null) throw new Error("Player not in game");

  let next = state;
  let runBotsAfter = false;

  switch (action.type) {
    case "contract": {
      assertTurn(state, seatIndex);
      next = submitContractAction(state, seatIndex, action.contractAction);
      break;
    }
    case "trickBid": {
      assertTurn(state, seatIndex);
      next = submitTrickBid(state, seatIndex, action.bid);
      break;
    }
    case "cardExchange": {
      next = submitCardExchange(state, playerId, action.cardIds);
      runBotsAfter = true;
      break;
    }
    case "playCard": {
      assertTurn(state, seatIndex);
      next = playCard(state, seatIndex, action.cardId);
      break;
    }
    case "finalizeTrickCollect": {
      if (state.awaitingTrickCollect == null) return state;
      next = finalizeTrickCollect(state);
      // Still holding — another client called too early or clock skew; keep waiting.
      if (next === state) return state;
      break;
    }
    case "clearCompletedTrick": {
      if (!state.completedTrickDisplay) return state;
      next = clearCompletedTrickDisplay(state);
      break;
    }
    case "resolveTrick": {
      if (state.awaitingTrickCollect == null && !state.completedTrickDisplay) return state;
      next = resolveCompletedTrick(state);
      if (next === state) return state;
      break;
    }
    case "advanceRound": {
      next = advanceToNextRound(state);
      runBotsAfter = true;
      break;
    }
    case "runBots": {
      next = runBotsUntilHumanOrStable(state, playerId);
      break;
    }
    default:
      throw new Error("Unknown action");
  }

  if (runBotsAfter) {
    next = runBotsUntilHumanOrStable(next, playerId);
  }

  next = normalizeGameState(next);
  await saveGameStateToDb(next);
  return next;
}
