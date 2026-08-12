import {
  getLegalConfirmBids,
  getTotalTrickBids,
  isOver,
  isTrickBidLegal,
  isUnder,
} from "./bidding";
import {
  analyzeHand,
  cardStrength,
  countHighCardPoints,
  estimateContractTricks,
  estimatePersonalTricks,
  getBestNaturalBid,
  hasRank,
  shouldBotOpen,
  shouldBotOvercall,
  suitLength,
} from "./hand-evaluator";
import type { Card, ContractAction, ContractBid, GameState, Suit, Trump } from "./types";
import { RANK_VALUE, SUITS } from "./types";
import { getLegalPlays, getTrickWinner } from "./trick";

export interface TrickGoal {
  bid: number;
  won: number;
  needed: number;
  remaining: number;
  mustWinEvery: boolean;
  shouldDump: boolean;
}

export function getTrickGoal(state: GameState, seatIndex: number): TrickGoal {
  const player = state.players.find((p) => p.seatIndex === seatIndex);
  const bid = state.trickBids[seatIndex] ?? 0;
  const won = player?.tricksWon ?? 0;
  const needed = bid - won;
  const remaining = Math.max(0, 13 - state.tricksPlayed);

  return {
    bid,
    won,
    needed,
    remaining,
    mustWinEvery: needed > 0 && needed >= remaining,
    shouldDump: needed <= 0,
  };
}

function scoreTrickBidCandidate(
  bid: number,
  target: number,
  totalAfterBid: number,
  isLast: boolean
): number {
  let score = -Math.abs(bid - target) * 10;

  if (isOver(totalAfterBid)) {
    score -= bid * 2;
    if (bid === 0) score += 8;
  } else if (isUnder(totalAfterBid)) {
    score += bid * 1.5;
    if (bid >= 3) score += 2;
  } else {
    score -= 3;
  }

  if (isLast && totalAfterBid === 13) score -= 1000;

  return score;
}

export function chooseTrickBid(state: GameState, seatIndex: number): number {
  const player = state.players.find((p) => p.seatIndex === seatIndex);
  if (!player || !state.trump) return 0;

  const isLast = state.trickBidStep === state.trickBidOrder.length - 1;
  const contractTricks = state.contractBid!.tricks;
  let target = refinePersonalTrickEstimate(
    player.hand,
    state.trump,
    state.contractBid?.tricks ?? 5
  );

  const partialSum = getTotalTrickBids(state.trickBids);
  const biddersLeft = state.trickBidOrder.length - state.trickBidStep;

  if (!isLast) {
    if (partialSum >= 9) target = Math.max(0, target - 1);
    if (partialSum <= 5 && biddersLeft >= 2) target = Math.min(9, target + 1);

    for (const delta of [0, -1, 1, -2, 2, -3, 3]) {
      const tryBid = Math.max(0, Math.min(13, target + delta));
      if (isTrickBidLegal(tryBid, state.trickBids, contractTricks, false)) {
        return tryBid;
      }
    }
    return Math.max(0, target);
  }

  const candidates: number[] = [];
  for (let b = 0; b <= 13; b++) {
    if (isTrickBidLegal(b, state.trickBids, contractTricks, true)) {
      candidates.push(b);
    }
  }

  if (candidates.length === 0) return 0;

  candidates.sort((a, b) => {
    const scoreA = scoreTrickBidCandidate(a, target, partialSum + a, true);
    const scoreB = scoreTrickBidCandidate(b, target, partialSum + b, true);
    return scoreB - scoreA;
  });

  return candidates[0];
}

export function chooseConfirmBid(state: GameState, hand: Card[]): ContractBid {
  const base = state.currentHighBid!;
  const legal = getLegalConfirmBids(base, state.minContractTricks);

  let best = base;
  let bestEstimate = estimateContractTricks(hand, base.trump);

  for (const bid of legal) {
    const estimate = estimateContractTricks(hand, bid.trump);
    const meetsLevel = estimate >= bid.tricks - 1.0;
    if (!meetsLevel) continue;

    const betterTrump =
      bid.tricks === base.tricks &&
      bid.trump !== base.trump &&
      estimate > bestEstimate + 0.35;
    const sameTrumpHigher =
      bid.trump === base.trump && bid.tricks > base.tricks && estimate >= bid.tricks - 1.1;

    if (betterTrump || sameTrumpHigher || estimate > bestEstimate + 0.5) {
      best = bid;
      bestEstimate = estimate;
    }
  }

  return best;
}

export function chooseContractAction(state: GameState): ContractAction {
  const player = state.players.find((p) => p.seatIndex === state.currentPlayerIndex);
  if (!player) return { type: "pass" };

  if (state.contractConfirmPending && state.currentHighBid) {
    return { type: "bid", bid: chooseConfirmBid(state, player.hand) };
  }

  const { minContractTricks, currentHighBid } = state;
  const hand = player.hand;

  if (!currentHighBid) {
    if (!shouldBotOpen(hand, minContractTricks)) {
      return { type: "pass" };
    }
    const bid = getBestNaturalBid(hand, minContractTricks, null);
    return bid ? { type: "bid", bid } : { type: "pass" };
  }

  if (!shouldBotOvercall(hand, minContractTricks, currentHighBid)) {
    return { type: "pass" };
  }

  const bid = getBestNaturalBid(hand, minContractTricks, currentHighBid);
  if (!bid) return { type: "pass" };

  const estimate = estimateContractTricks(hand, bid.trump);
  if (bid.tricks > Math.floor(estimate) + 1) {
    const saferTricks = Math.max(minContractTricks, Math.min(bid.tricks, Math.floor(estimate) + 1));
    const safer: ContractBid = { tricks: saferTricks, trump: bid.trump };
    if (estimate >= safer.tricks - 1.0) {
      return { type: "bid", bid: safer };
    }
    return { type: "pass" };
  }

  return { type: "bid", bid };
}

function cardWinsTrick(card: Card, hand: Card[], currentTrick: GameState["currentTrick"], trump: Trump): boolean {
  const legal = getLegalPlays(hand, currentTrick, trump);
  if (!legal.some((c) => c.id === card.id)) return false;
  const testTrick = [...currentTrick, { seatIndex: 999, card }];
  const winner = getTrickWinner(testTrick, trump);
  return testTrick.find((p) => p.seatIndex === winner)?.card.id === card.id;
}

function sortByRank(cards: Card[], ascending = true): Card[] {
  return [...cards].sort((a, b) =>
    ascending ? RANK_VALUE[a.rank] - RANK_VALUE[b.rank] : RANK_VALUE[b.rank] - RANK_VALUE[a.rank]
  );
}

function pickFromLegal(legal: Card[], preferLow: boolean): Card {
  return sortByRank(legal, preferLow)[0];
}

function estimateSuitRemaining(state: GameState, suit: Suit, myHand: Card[]): number {
  let seen = myHand.filter((c) => c.suit === suit).length;
  for (const play of state.currentTrick) {
    if (play.card.suit === suit) seen += 1;
  }
  return Math.max(0, 13 - seen);
}

function pickLeadCard(hand: Card[], trump: Trump, goal: TrickGoal, state: GameState): Card {
  if (goal.mustWinEvery) {
    for (const suit of SUITS) {
      const suitCards = hand.filter((c) => c.suit === suit);
      if (suitCards.some((c) => c.rank === "A")) {
        return suitCards.find((c) => c.rank === "A")!;
      }
    }
  }

  if (goal.shouldDump) {
    const candidates = hand.filter((c) => {
      if (trump !== "NT" && c.suit === trump) return false;
      return RANK_VALUE[c.rank] >= 10 || suitLength(hand, c.suit) === 1;
    });
    if (candidates.length > 0) {
      return sortByRank(candidates, false)[0];
    }
  }

  if (goal.needed > 0) {
    for (const suit of SUITS) {
      const len = suitLength(hand, suit);
      if (len < 4) continue;
      const hasAce = hasRank(hand, suit, "A");
      const hasKing = hasRank(hand, suit, "K");
      if (hasAce && hasKing) {
        const king = hand.find((c) => c.suit === suit && c.rank === "K");
        if (king) return king;
      }
      if (hasAce) {
        return hand.find((c) => c.suit === suit && c.rank === "A")!;
      }
    }
  }

  let best: { card: Card; score: number } | null = null;
  for (const suit of SUITS) {
    const suitCards = hand.filter((c) => c.suit === suit);
    if (suitCards.length === 0) continue;

    const remaining = estimateSuitRemaining(state, suit, hand);
    const hasAce = hasRank(hand, suit, "A");

    for (const card of suitCards) {
      let score = 0;
      if (card.rank === "A" && goal.needed > 0) score += 12;
      else if (card.rank === "K" && hasAce && goal.needed > 0) score += 9;
      else if (card.rank === "K" && goal.shouldDump) score += 6;
      else if (card.rank === "2" || card.rank === "3") score += goal.shouldDump ? 5 : 3;
      else if (card.rank === "4" || card.rank === "5") score += 2;

      if (suitCards.length >= 5) score += 2;
      if (remaining <= 3 && !hasAce) score -= 2;
      if (trump !== "NT" && suit === trump && goal.shouldDump) score -= 4;

      if (!best || score > best.score) best = { card, score };
    }
  }

  return best?.card ?? hand[0];
}

function pickFollowCard(
  hand: Card[],
  currentTrick: GameState["currentTrick"],
  trump: Trump,
  goal: TrickGoal
): Card {
  const legal = getLegalPlays(hand, currentTrick, trump);
  if (legal.length === 0) return hand[0];

  const winners = legal.filter((c) => cardWinsTrick(c, hand, currentTrick, trump));
  const losers = legal.filter((c) => !winners.includes(c));

  if (goal.mustWinEvery || goal.needed > 0) {
    if (winners.length > 0) {
      return pickFromLegal(winners, true);
    }
    return pickFromLegal(losers, true);
  }

  if (goal.shouldDump) {
    if (losers.length > 0) {
      return pickFromLegal(losers, false);
    }
    if (winners.length > 0) {
      return pickFromLegal(winners, true);
    }
  }

  if (goal.needed > 0 && winners.length > 0) {
    return pickFromLegal(winners, true);
  }

  if (losers.length > 0) {
    return pickFromLegal(losers, true);
  }

  return pickFromLegal(winners, true);
}

function pickDiscardOrTrump(
  hand: Card[],
  currentTrick: GameState["currentTrick"],
  trump: Trump,
  goal: TrickGoal
): Card {
  const legal = getLegalPlays(hand, currentTrick, trump);
  if (legal.length === 0) return hand[0];

  const ledSuit = currentTrick[0].card.suit;
  if (hand.some((c) => c.suit === ledSuit)) {
    return pickFollowCard(hand, currentTrick, trump, goal);
  }

  if (trump !== "NT") {
    const trumpCards = legal.filter((c) => c.suit === trump);
    const offSuit = legal.filter((c) => c.suit !== trump);

    if (goal.mustWinEvery || goal.needed > 0) {
      const winningTrumps = trumpCards.filter((c) => cardWinsTrick(c, hand, currentTrick, trump));
      if (winningTrumps.length > 0) {
        return pickFromLegal(winningTrumps, true);
      }
    }

    if (goal.shouldDump && offSuit.length > 0) {
      return pickFromLegal(offSuit, false);
    }

    if (trumpCards.length > 0 && (goal.mustWinEvery || goal.needed > 0)) {
      const winningTrumps = trumpCards.filter((c) => cardWinsTrick(c, hand, currentTrick, trump));
      if (winningTrumps.length > 0) {
        return pickFromLegal(winningTrumps, true);
      }
    }

    if (offSuit.length > 0) {
      return pickFromLegal(offSuit, goal.shouldDump ? false : true);
    }

    if (trumpCards.length > 0) {
      return pickFromLegal(trumpCards, !goal.shouldDump);
    }
  }

  const sorted = [...legal].sort((a, b) => {
    const sa = cardStrength(a, trump);
    const sb = cardStrength(b, trump);
    return goal.shouldDump ? sa - sb : sb - sa;
  });
  return sorted[0];
}

export function choosePlayCard(state: GameState): Card | null {
  const player = state.players.find((p) => p.seatIndex === state.currentPlayerIndex);
  if (!player || !state.trump) return null;

  const legal = getLegalPlays(player.hand, state.currentTrick, state.trump);
  if (legal.length === 0) return null;

  const goal = getTrickGoal(state, state.currentPlayerIndex);

  if (state.currentTrick.length === 0) {
    return pickLeadCard(player.hand, state.trump, goal, state);
  }

  return pickDiscardOrTrump(player.hand, state.currentTrick, state.trump, goal);
}

export function chooseCardExchange(hand: Card[], minContractTricks: number): string[] {
  const analyses = analyzeHand(hand, minContractTricks);
  const weakest = analyses[analyses.length - 1]?.trump;
  const avoidTrump = weakest !== "NT" ? weakest : undefined;

  const scored = hand.map((card) => {
    let score = RANK_VALUE[card.rank];
    const len = suitLength(hand, card.suit);
    if (len <= 2) score -= 4;
    if (avoidTrump && card.suit === avoidTrump) score -= 3;
    if (card.rank === "A" || card.rank === "K") score += 6;
    if (len >= 5) score += 2;
    return { card, score };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, 3).map((s) => s.card.id);
}

export function refinePersonalTrickEstimate(hand: Card[], trump: Trump, contractTricks: number): number {
  let estimate = estimatePersonalTricks(hand, trump);
  const hcp = countHighCardPoints(hand);

  if (trump !== "NT") {
    const trumpLen = suitLength(hand, trump);
    if (trumpLen >= 4) estimate = Math.min(9, estimate + 1);
    if (trumpLen <= 1 && hcp >= 8) estimate = Math.max(0, estimate - 1);
  }

  if (contractTricks >= 8 && estimate >= 5) {
    estimate = Math.max(0, estimate - 1);
  }

  return Math.max(0, Math.min(9, estimate));
}
