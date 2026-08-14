import type { Room } from "@/lib/types";
import { MAX_PLAYERS } from "@/lib/types";
import { createBotPlayers, createInitialGameState } from "@/lib/game/engine";
import { runBotsUntilHumanOrStable } from "@/lib/game/bots";
import { getTrickWinner } from "@/lib/game/trick";
import type { GameState } from "@/lib/game/types";
import { createBotPracticeRoom, setRoomStatus } from "@/lib/mock/rooms";

const STORAGE_KEY_GAMES = "whist_mock_games";

function normalizeGameState(state: GameState): GameState {
  let next: GameState = {
    ...state,
    awaitingTrickCollect: state.awaitingTrickCollect ?? null,
    completedTrickDisplay: state.completedTrickDisplay ?? null,
    contractPassSeats: state.contractPassSeats ?? [],
    contractConfirmPending: state.contractConfirmPending ?? false,
    trickHistory: state.trickHistory ?? [],
    lastContractCalls: state.lastContractCalls?.length === 4 ? state.lastContractCalls : [null, null, null, null],
  };

  if (
    next.phase === "playing" &&
    next.awaitingTrickCollect === null &&
    !next.completedTrickDisplay &&
    next.currentTrick.length === MAX_PLAYERS &&
    next.trump
  ) {
    next = {
      ...next,
      awaitingTrickCollect: getTrickWinner(next.currentTrick, next.trump),
    };
  }

  return next;
}

function readGames(): Record<string, GameState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAMES);
    return raw ? (JSON.parse(raw) as Record<string, GameState>) : {};
  } catch {
    return {};
  }
}

function writeGames(games: Record<string, GameState>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
}

export function getGameState(roomCode: string): GameState | null {
  const games = readGames();
  const state = games[roomCode.toUpperCase()] ?? null;
  return state ? normalizeGameState(state) : null;
}

export function saveGameState(state: GameState): void {
  const games = readGames();
  games[state.roomCode.toUpperCase()] = state;
  writeGames(games);
}

export function startGame(
  room: Room,
  humanPlayerId: string,
  totalRounds = 13
): GameState {
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
    humanIdx <= 0
      ? players
      : [...players.slice(humanIdx), ...players.slice(0, humanIdx)];

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
  saveGameState(state);
  return state;
}

export function updateGameState(
  state: GameState,
  humanPlayerId: string
): GameState {
  const normalized = normalizeGameState(state);
  const next = runBotsUntilHumanOrStable(normalized, humanPlayerId);
  saveGameState(next);
  return next;
}

export function deleteGameState(roomCode: string): void {
  const games = readGames();
  delete games[roomCode.toUpperCase()];
  writeGames(games);
}

export function startBotPractice(
  hostName: string,
  totalRounds = 13
): { roomCode: string; state: GameState } {
  const { room, session } = createBotPracticeRoom(hostName);
  setRoomStatus(room.code, "playing");
  const state = startGame({ ...room, status: "playing" }, session.playerId, totalRounds);
  return { roomCode: room.code, state };
}
