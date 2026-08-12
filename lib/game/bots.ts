import type { Card, ContractAction, GameState } from "./types";
import {
  chooseCardExchange,
  chooseContractAction,
  choosePlayCard,
  chooseTrickBid,
} from "./bot-strategy";
import {
  playCard,
  submitCardExchange,
  submitContractAction,
  submitTrickBid,
} from "./engine";

export function getBotContractAction(state: GameState): ContractAction {
  return chooseContractAction(state);
}

export function getBotTrickBid(state: GameState): number {
  return chooseTrickBid(state, state.currentPlayerIndex);
}

export function getBotCardExchange(state: GameState, playerId: string): string[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return [];
  return chooseCardExchange(player.hand, state.minContractTricks);
}

export function getBotPlayCard(state: GameState): Card | null {
  return choosePlayCard(state);
}

export function processBotTurn(state: GameState): GameState {
  const current = state.players.find((p) => p.seatIndex === state.currentPlayerIndex);
  if (!current?.isBot) return state;

  switch (state.phase) {
    case "bidding_contract": {
      const action = getBotContractAction(state);
      return submitContractAction(state, state.currentPlayerIndex, action);
    }
    case "bidding_tricks": {
      const bid = getBotTrickBid(state);
      return submitTrickBid(state, state.currentPlayerIndex, bid);
    }
    case "card_exchange": {
      if (state.cardExchangeReady[current.id]) return state;
      const cards = getBotCardExchange(state, current.id);
      return submitCardExchange(state, current.id, cards);
    }
    case "playing": {
      const card = getBotPlayCard(state);
      if (!card) return state;
      return playCard(state, state.currentPlayerIndex, card.id);
    }
    default:
      return state;
  }
}

export function runBotsUntilHumanOrStable(state: GameState, humanPlayerId: string): GameState {
  if (
    (state.awaitingTrickCollect !== null && state.awaitingTrickCollect !== undefined) ||
    state.completedTrickDisplay
  ) {
    return state;
  }

  if (
    state.phase === "bidding_contract" ||
    state.phase === "bidding_tricks" ||
    state.phase === "playing"
  ) {
    const turnPlayer = state.players.find((p) => p.seatIndex === state.currentPlayerIndex);
    if (turnPlayer?.isBot) {
      return processBotTurn(state);
    }
    return state;
  }

  let current = state;
  let safety = 0;

  while (safety < 200) {
    safety++;

    if (current.phase === "round_scoring" || current.phase === "game_over") break;

    if (current.phase === "card_exchange") {
      const pendingBot = current.players.find(
        (p) => p.isBot && !current.cardExchangeReady[p.id]
      );
      if (!pendingBot) break;
      current = processBotTurn(current);
      continue;
    }

    const turnPlayer = current.players.find((p) => p.seatIndex === current.currentPlayerIndex);
    if (!turnPlayer) break;
    if (!turnPlayer.isBot) break;

    const prev = JSON.stringify({
      phase: current.phase,
      currentPlayerIndex: current.currentPlayerIndex,
      trickBidStep: current.trickBidStep,
      tricksPlayed: current.tricksPlayed,
      currentTrickLen: current.currentTrick.length,
    });

    current = processBotTurn(current);

    const next = JSON.stringify({
      phase: current.phase,
      currentPlayerIndex: current.currentPlayerIndex,
      trickBidStep: current.trickBidStep,
      tricksPlayed: current.tricksPlayed,
      currentTrickLen: current.currentTrick.length,
    });

    if (prev === next) break;
  }

  return current;
}

export { getDisabledTricksForCurrentBidder } from "./engine";
