import { formatContractBid, getDisabledTrickBids, isContractBidLegal, isContractConfirmLegal, isTrickBidLegal } from "./bidding";
import { createDeck, dealCards, shuffleDeck, sortHand } from "./cards";
import { applyRoundScores, calculateRoundScores } from "./scoring";
import { getLegalPlays, getTrickWinner } from "./trick";
import type {
  Card,
  CompletedTrickDisplay,
  ContractAction,
  ContractBid,
  GamePhase,
  GamePlayer,
  GameState,
  Trump,
} from "./types";
import { MAX_PLAYERS } from "@/lib/types";

const BOT_NAMES = ["רון", "נועה", "עמית", "שירה", "גל", "תום"];

function nextSeat(index: number): number {
  return (index - 1 + MAX_PLAYERS) % MAX_PLAYERS;
}

function playerName(seatIndex: number, players: GamePlayer[]): string {
  return players.find((p) => p.seatIndex === seatIndex)?.name ?? `שחקן ${seatIndex + 1}`;
}

function emptyContractCalls(): (ContractAction | null)[] {
  return [null, null, null, null];
}

function setContractCall(
  calls: (ContractAction | null)[] | undefined,
  seatIndex: number,
  call: ContractAction
): (ContractAction | null)[] {
  const next = calls?.length === 4 ? [...calls] : emptyContractCalls();
  next[seatIndex] = call;
  return next;
}

function addLog(state: GameState, message: string): string[] {
  return [...state.bidLog.slice(-8), message];
}

export function createInitialGameState(
  roomCode: string,
  players: { id: string; name: string; isBot?: boolean }[],
  totalRounds: number,
  firstBidderIndex = 0
): GameState {
  const gamePlayers: GamePlayer[] = players.map((p, i) => ({
    id: p.id,
    name: p.name,
    seatIndex: i,
    isBot: p.isBot ?? false,
    hand: [],
    tricksWon: 0,
    trickBid: null,
    totalScore: 0,
  }));

  const state: GameState = {
    roomCode,
    totalRounds,
    currentRound: 1,
    phase: "bidding_contract",
    players: gamePlayers,
    firstBidderIndex,
    currentPlayerIndex: firstBidderIndex,
    minContractTricks: 5,
    currentHighBid: null,
    highBidderIndex: null,
    consecutivePasses: 0,
    contractPassSeats: [],
    contractConfirmPending: false,
    contractWinnerIndex: null,
    contractBid: null,
    trickBids: [null, null, null, null],
    trickBidOrder: [],
    trickBidStep: 0,
    trump: null,
    currentTrick: [],
    awaitingTrickCollect: null,
    completedTrickDisplay: null,
    trickHistory: [],
    trickLeaderIndex: firstBidderIndex,
    tricksPlayed: 0,
    cardExchange: {},
    cardExchangeReady: {},
    roundScores: null,
    bidLog: [],
    lastContractCalls: emptyContractCalls(),
  };

  return dealNewRound(state);
}

function dealNewRound(state: GameState): GameState {
  const deck = shuffleDeck(createDeck());
  const hands = dealCards(deck, MAX_PLAYERS);

  const players = state.players.map((p) => ({
    ...p,
    hand: hands[p.seatIndex],
    tricksWon: 0,
    trickBid: null,
  }));

  return {
    ...state,
    players,
    phase: "bidding_contract",
    currentPlayerIndex: state.firstBidderIndex,
    currentHighBid: null,
    highBidderIndex: null,
    consecutivePasses: 0,
    contractPassSeats: [],
    contractConfirmPending: false,
    contractWinnerIndex: null,
    contractBid: null,
    trickBids: [null, null, null, null],
    trickBidOrder: [],
    trickBidStep: 0,
    trump: null,
    currentTrick: [],
    awaitingTrickCollect: null,
    completedTrickDisplay: null,
    trickHistory: [],
    trickLeaderIndex: state.firstBidderIndex,
    tricksPlayed: 0,
    cardExchange: {},
    cardExchangeReady: {},
    roundScores: null,
    lastContractCalls: emptyContractCalls(),
    bidLog: addLog(state, `סיבוב ${state.currentRound} — מתחילים בהכרזות`),
  };
}

export function submitContractAction(
  state: GameState,
  seatIndex: number,
  action: ContractAction
): GameState {
  if (state.phase !== "bidding_contract") return state;
  if (state.currentPlayerIndex !== seatIndex) return state;

  let next = { ...state };

  if (state.contractConfirmPending) {
    if (seatIndex !== state.highBidderIndex || action.type !== "bid") return state;
    const { bid } = action;
    if (!state.currentHighBid || !isContractConfirmLegal(bid, state.currentHighBid)) return state;

    next.currentHighBid = bid;
    next.contractConfirmPending = false;
    next.contractPassSeats = [];
    next.lastContractCalls = setContractCall(next.lastContractCalls, seatIndex, { type: "bid", bid });
    next.bidLog = addLog(next, `${playerName(seatIndex, next.players)} — אישור: ${formatContractBid(bid)}`);
    return finishContractBidding(next);
  }

  if (action.type === "pass") {
    next.consecutivePasses += 1;
    next.contractPassSeats = [...next.contractPassSeats, seatIndex];
    next.lastContractCalls = setContractCall(next.lastContractCalls, seatIndex, { type: "pass" });
    next.bidLog = addLog(next, `${playerName(seatIndex, next.players)} — PASS`);

    if (next.currentHighBid === null && next.consecutivePasses >= MAX_PLAYERS) {
      return startCardExchange(next);
    }

    if (next.currentHighBid !== null && next.contractPassSeats.length >= 3) {
      next.contractConfirmPending = true;
      next.currentPlayerIndex = next.highBidderIndex!;
      next.bidLog = addLog(
        next,
        `${playerName(next.highBidderIndex!, next.players)} — אישור חוזה סופי`
      );
      return next;
    }

    next.currentPlayerIndex = nextSeat(seatIndex);
    return next;
  }

  const { bid } = action;
  if (!isContractBidLegal(bid, next.currentHighBid, next.minContractTricks)) {
    return state;
  }

  next.currentHighBid = bid;
  next.highBidderIndex = seatIndex;
  next.consecutivePasses = 0;
  next.contractPassSeats = [];
  next.contractConfirmPending = false;
  next.lastContractCalls = setContractCall(next.lastContractCalls, seatIndex, { type: "bid", bid });
  next.bidLog = addLog(next, `${playerName(seatIndex, next.players)} — ${formatContractBid(bid)}`);
  next.currentPlayerIndex = nextSeat(seatIndex);
  return next;
}

function finishContractBidding(state: GameState): GameState {
  const winnerIndex = state.highBidderIndex!;
  const contract = state.currentHighBid!;

  const trickBids: (number | null)[] = [null, null, null, null];
  trickBids[winnerIndex] = contract.tricks;

  const trickBidOrder: number[] = [];
  let idx = nextSeat(winnerIndex);
  for (let i = 0; i < MAX_PLAYERS - 1; i++) {
    trickBidOrder.push(idx);
    idx = nextSeat(idx);
  }

  return {
    ...state,
    phase: "bidding_tricks",
    contractWinnerIndex: winnerIndex,
    contractBid: contract,
    trump: contract.trump,
    trickBids,
    trickBidOrder,
    trickBidStep: 0,
    currentPlayerIndex: trickBidOrder[0],
    bidLog: addLog(state, `חוזה: ${formatContractBid(contract)} — ${playerName(winnerIndex, state.players)}`),
  };
}

function startCardExchange(state: GameState): GameState {
  return {
    ...state,
    phase: "card_exchange",
    consecutivePasses: 0,
    contractPassSeats: [],
    contractConfirmPending: false,
    minContractTricks: state.minContractTricks + 1,
    currentHighBid: null,
    highBidderIndex: null,
    lastContractCalls: emptyContractCalls(),
    cardExchange: {},
    cardExchangeReady: Object.fromEntries(state.players.map((p) => [p.id, false])),
    bidLog: addLog(state, `4 PASS — החלפת 3 קלפים (מינימום ${state.minContractTricks + 1})`),
  };
}

export function submitCardExchange(
  state: GameState,
  playerId: string,
  cardIds: string[]
): GameState {
  if (state.phase !== "card_exchange") return state;
  if (cardIds.length !== 3) return state;

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const validIds = new Set(player.hand.map((c) => c.id));
  if (!cardIds.every((id) => validIds.has(id))) return state;

  const cardExchange = { ...state.cardExchange, [playerId]: cardIds };
  const cardExchangeReady = { ...state.cardExchangeReady, [playerId]: true };

  const allReady = state.players.every((p) => cardExchangeReady[p.id]);

  if (!allReady) {
    return { ...state, cardExchange, cardExchangeReady };
  }

  return executeCardExchange({ ...state, cardExchange, cardExchangeReady });
}

function executeCardExchange(state: GameState): GameState {
  const players = state.players.map((p) => ({ ...p, hand: [...p.hand] }));

  for (const player of players) {
    const toPass = state.cardExchange[player.id] ?? [];
    const passCards = player.hand.filter((c) => toPass.includes(c.id));
    player.hand = player.hand.filter((c) => !toPass.includes(c.id));

    const leftSeat = nextSeat(player.seatIndex);
    const leftPlayer = players.find((p) => p.seatIndex === leftSeat)!;
    leftPlayer.hand.push(...passCards);
  }

  const sortedPlayers = players.map((p) => ({
    ...p,
    hand: sortHand(p.hand),
  }));

  return {
    ...state,
    players: sortedPlayers,
    phase: "bidding_contract",
    currentPlayerIndex: state.firstBidderIndex,
    currentHighBid: null,
    highBidderIndex: null,
    consecutivePasses: 0,
    contractPassSeats: [],
    contractConfirmPending: false,
    lastContractCalls: emptyContractCalls(),
    cardExchange: {},
    cardExchangeReady: {},
    bidLog: addLog(state, `החלפה הושלמה — הכרזות מ-${state.minContractTricks}`),
  };
}

export function submitTrickBid(state: GameState, seatIndex: number, bid: number): GameState {
  if (state.phase !== "bidding_tricks") return state;
  if (state.currentPlayerIndex !== seatIndex) return state;

  const isLastBidder = state.trickBidStep === state.trickBidOrder.length - 1;
  if (!isTrickBidLegal(bid, state.trickBids, state.contractBid!.tricks, isLastBidder)) {
    return state;
  }

  const trickBids = [...state.trickBids];
  trickBids[seatIndex] = bid;

  const nextStep = state.trickBidStep + 1;
  let next: GameState = {
    ...state,
    trickBids,
    trickBidStep: nextStep,
    bidLog: addLog(state, `${playerName(seatIndex, state.players)} — ${bid} לקיחות`),
  };

  if (nextStep >= state.trickBidOrder.length) {
    return startPlaying(next);
  }

  next.currentPlayerIndex = state.trickBidOrder[nextStep];
  return next;
}

function startPlaying(state: GameState): GameState {
  const leader = state.contractWinnerIndex!;
  return {
    ...state,
    phase: "playing",
    currentPlayerIndex: leader,
    trickLeaderIndex: leader,
    currentTrick: [],
    awaitingTrickCollect: null,
    completedTrickDisplay: null,
    bidLog: addLog(state, `משחק! ${playerName(leader, state.players)} פותח`),
  };
}

export function playCard(state: GameState, seatIndex: number, cardId: string): GameState {
  if (state.phase !== "playing") return state;
  if (state.awaitingTrickCollect != null || state.completedTrickDisplay) return state;
  if (state.currentPlayerIndex !== seatIndex) return state;

  const player = state.players.find((p) => p.seatIndex === seatIndex);
  if (!player) return state;

  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return state;

  const legal = getLegalPlays(player.hand, state.currentTrick, state.trump!);
  if (!legal.some((c) => c.id === cardId)) return state;

  const players = state.players.map((p) =>
    p.seatIndex === seatIndex
      ? { ...p, hand: p.hand.filter((c) => c.id !== cardId) }
      : p
  );

  const currentTrick = [...state.currentTrick, { seatIndex, card }];
  let next: GameState = {
    ...state,
    players,
    currentTrick,
    completedTrickDisplay: state.currentTrick.length === 0 ? null : state.completedTrickDisplay,
  };

  if (currentTrick.length < MAX_PLAYERS) {
    next.currentPlayerIndex = nextSeat(seatIndex);
    return next;
  }

  const winner = getTrickWinner(currentTrick, state.trump!);
  const updatedPlayers = next.players.map((p) =>
    p.seatIndex === winner ? { ...p, tricksWon: p.tricksWon + 1 } : p
  );

  next = {
    ...next,
    players: updatedPlayers,
    currentTrick,
    awaitingTrickCollect: winner,
    trickLeaderIndex: winner,
    currentPlayerIndex: winner,
    bidLog: addLog(next, `לקיחה ל-${playerName(winner, updatedPlayers)}`),
  };

  return next;
}

export function finalizeTrickCollect(state: GameState): GameState {
  if (state.awaitingTrickCollect === null) return state;

  const winner = state.awaitingTrickCollect;
  const plays = state.currentTrick;

  const trickRecord: CompletedTrickDisplay = { plays: [...plays], winnerSeat: winner };

  let next: GameState = {
    ...state,
    currentTrick: [],
    awaitingTrickCollect: null,
    completedTrickDisplay: trickRecord,
    trickHistory: [...(state.trickHistory ?? []), trickRecord],
    tricksPlayed: state.tricksPlayed + 1,
  };

  if (next.tricksPlayed >= 13) {
    return finishRound(next);
  }

  return next;
}

function finishRound(state: GameState): GameState {
  const roundScores = calculateRoundScores(state.players, state.trickBids);
  const players = applyRoundScores(
    state.players.map((p) => ({
      ...p,
      tricksWon: roundScores.find((r) => r.seatIndex === p.seatIndex)?.tricksWon ?? p.tricksWon,
    })),
    roundScores
  );

  return {
    ...state,
    players,
    roundScores,
    phase: "round_scoring",
    bidLog: addLog(state, `סיום סיבוב ${state.currentRound}`),
  };
}

export function advanceToNextRound(state: GameState): GameState {
  if (state.phase !== "round_scoring") return state;

  if (state.currentRound >= state.totalRounds) {
    return {
      ...state,
      phase: "game_over",
      bidLog: addLog(state, "המשחק הסתיים!"),
    };
  }

  const nextFirstBidder = nextSeat(state.firstBidderIndex);
  const nextState: GameState = {
    ...state,
    currentRound: state.currentRound + 1,
    firstBidderIndex: nextFirstBidder,
    minContractTricks: 5,
  };

  return dealNewRound(nextState);
}

export function clearCompletedTrickDisplay(state: GameState): GameState {
  if (!state.completedTrickDisplay) return state;
  return { ...state, completedTrickDisplay: null };
}

/** Finish the visible trick in one step so the client can animate, then resume play. */
export function resolveCompletedTrick(state: GameState): GameState {
  let next = state;
  if (next.awaitingTrickCollect != null) {
    next = finalizeTrickCollect(next);
  }
  if (next.completedTrickDisplay) {
    next = clearCompletedTrickDisplay(next);
  }
  return next;
}

export function getHumanSeatIndex(state: GameState, humanPlayerId: string): number {
  return state.players.find((p) => p.id === humanPlayerId)?.seatIndex ?? 0;
}

export function getRelativeSeat(relativeOffset: number, mySeat: number): number {
  return (mySeat + relativeOffset) % MAX_PLAYERS;
}

export function getDisabledTricksForCurrentBidder(state: GameState): Set<number> {
  if (state.phase !== "bidding_tricks") return new Set();
  const isLast = state.trickBidStep === state.trickBidOrder.length - 1;
  return getDisabledTrickBids(state.trickBids, state.contractBid!.tricks, isLast);
}

function generateBotId(index: number): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `bot-${index}-${crypto.randomUUID()}`;
  }
  return `bot-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBotPlayers(count: number): { id: string; name: string; isBot: boolean }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: generateBotId(i),
    name: BOT_NAMES[i % BOT_NAMES.length],
    isBot: true,
  }));
}

export function isHumanTurn(state: GameState, humanPlayerId: string): boolean {
  const human = state.players.find((p) => p.id === humanPlayerId);
  if (!human) return false;
  return state.currentPlayerIndex === human.seatIndex && !human.isBot;
}

export function getCurrentPlayer(state: GameState): GamePlayer | undefined {
  return state.players.find((p) => p.seatIndex === state.currentPlayerIndex);
}

export function getPhaseLabel(phase: GamePhase): string {
  const labels: Record<GamePhase, string> = {
    bidding_contract: "הכרזת חוזה",
    bidding_tricks: "הכרזת לקיחות",
    card_exchange: "החלפת קלפים",
    playing: "משחק",
    round_scoring: "סיכום סיבוב",
    game_over: "סיום משחק",
  };
  return labels[phase];
}
