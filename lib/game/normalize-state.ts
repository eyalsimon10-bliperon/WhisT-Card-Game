import { getTrickWinner } from "./trick";
import type { GameState } from "./types";
import { MAX_PLAYERS } from "@/lib/types";

export function normalizeGameState(state: GameState): GameState {
  let next: GameState = {
    ...state,
    awaitingTrickCollect: state.awaitingTrickCollect ?? null,
    trickHoldUntil: state.trickHoldUntil ?? null,
    completedTrickDisplay: state.completedTrickDisplay ?? null,
    contractPassSeats: state.contractPassSeats ?? [],
    contractConfirmPending: state.contractConfirmPending ?? false,
    lastContractCalls: state.lastContractCalls?.length === 4 ? state.lastContractCalls : [null, null, null, null],
    trickHistory: state.trickHistory ?? [],
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
