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
  /** Avoid taking this trick (0-bid still clean, or already made a non-zero bid). */
  shouldDump: boolean;
  /** Bid 0 but already took a trick — fail is locked; take more to reduce the penalty. */
  recoverFromZero: boolean;
}

export function getTrickGoal(state: GameState, seatIndex: number): TrickGoal {
  const player = state.players.find((p) => p.seatIndex === seatIndex);
  const bid = state.trickBids[seatIndex] ?? 0;
  const won = player?.tricksWon ?? 0;
  const needed = bid - won;
  const remaining = Math.max(0, 13 - state.tricksPlayed);
  const recoverFromZero = bid === 0 && won > 0;
  const shouldDump = recoverFromZero ? false : needed <= 0;

  return {
    bid,
    won,
    needed,
    remaining,
    mustWinEvery: needed > 0 && needed >= remaining,
    shouldDump,
    recoverFromZero,
  };
}

/** Prefer real UNDER (11–12) or OVER (14–15); punish absurdly low totals. */
function scoreTrickBidCandidate(
  bid: number,
  target: number,
  totalAfterBid: number,
  isLast: boolean
): number {
  let score = -Math.abs(bid - target) * 8;

  if (!isLast) {
    if (bid === 0 && target >= 2) score -= 18;
    if (bid === 0 && target >= 1) score -= 6;
    return score;
  }

  if (totalAfterBid === 13) return -10000;

  const shapeScore: Record<number, number> = {
    12: 60,
    11: 52,
    14: 48,
    15: 38,
    10: 6,
    16: 5,
    9: -35,
    8: -55,
    7: -70,
    17: -15,
    18: -28,
  };
  score += shapeScore[totalAfterBid] ?? (totalAfterBid < 9 ? -80 : totalAfterBid > 18 ? -30 : -5);

  if (isUnder(totalAfterBid) && bid <= target + 1) score += 4;
  if (isOver(totalAfterBid) && bid >= Math.max(0, target - 1)) score += 4;

  return score;
}

function preferredRoundTotal(personalTarget: number, partialSum: number, seatsLeftIncludingMe: number): number {
  // Default to a healthy UNDER; lean OVER only with real strength or a high partial.
  if (personalTarget >= 4 && partialSum >= 8) return 14;
  if (personalTarget >= 5) return 14;
  if (partialSum >= 11) return 14;
  if (personalTarget <= 1 && partialSum <= 6 && seatsLeftIncludingMe >= 2) return 12;
  return 12;
}

function countSureWinners(hand: Card[], trump: Trump): number {
  let n = 0;
  if (trump !== "NT" && hasRank(hand, trump, "A")) n += 1;
  for (const suit of SUITS) {
    if (trump !== "NT" && suit === trump) continue;
    if (hasRank(hand, suit, "A")) n += 1;
  }
  return n;
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

  const sure = countSureWinners(player.hand, state.trump);
  if (sure >= 1) target = Math.max(target, sure);

  // Only sit on 0 with a truly empty hand — not merely a weakish one.
  if (sure === 0 && target <= 0) {
    const trumpLen = state.trump === "NT" ? 0 : suitLength(player.hand, state.trump);
    const hcp = countHighCardPoints(player.hand);
    if (trumpLen <= 1 && hcp <= 4) {
      target = 0;
    } else {
      target = 1;
    }
  }

  const partialSum = getTotalTrickBids(state.trickBids);
  const biddersLeft = state.trickBidOrder.length - state.trickBidStep;

  if (!isLast) {
    const preferredTotal = preferredRoundTotal(target, partialSum, biddersLeft);
    const seatsAfter = biddersLeft - 1;
    // Assume remaining bidders average ~1.6 tricks each when shaping the pot.
    const assumedOthers = seatsAfter * 1.6;
    const needForShape = Math.max(0, Math.round(preferredTotal - partialSum - assumedOthers));
    target = Math.max(target, needForShape);

    // Soft floors so low contracts don't freeze into UNDER 8–9.
    if (contractTricks <= 6 && target < 2 && countHighCardPoints(player.hand) >= 5) {
      target = 2;
    } else if (contractTricks <= 7 && target < 1) {
      target = 1;
    }

    // Only ease off when already in a healthy UNDER / entering OVER.
    if (partialSum >= 12) target = Math.max(0, target - 1);
    if (partialSum >= 14) target = Math.max(0, Math.min(target, 1));

    for (const delta of [0, 1, -1, 2, -2, 3, -3]) {
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

  // Nudge last bidder toward a sensible shape near their hand estimate.
  const preferredTotal = preferredRoundTotal(target, partialSum, 1);
  const shapeTarget = Math.max(0, preferredTotal - partialSum);
  const blended = Math.round(target * 0.55 + shapeTarget * 0.45);

  candidates.sort((a, b) => {
    const scoreA = scoreTrickBidCandidate(a, blended, partialSum + a, true);
    const scoreB = scoreTrickBidCandidate(b, blended, partialSum + b, true);
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
  const pressure = Math.max(0, minContractTricks - 5);

  if (!currentHighBid) {
    if (shouldBotOpen(hand, minContractTricks)) {
      const bid = getBestNaturalBid(hand, minContractTricks, null);
      if (bid) return { type: "bid", bid };
    }

    // After card exchanges, never let the table 4-pass forever — force a thin open
    // once enough players have already passed.
    const passesSoFar = state.consecutivePasses ?? 0;
    if (pressure >= 1 && passesSoFar >= 2) {
      const analyses = analyzeHand(hand, minContractTricks);
      const bestSuit =
        analyses.find((a) => a.trump !== "NT" && a.estimatedTricks >= (analyses[0]?.estimatedTricks ?? 0) - 0.5) ??
        analyses.find((a) => a.trump !== "NT") ??
        analyses[0];
      if (bestSuit) {
        return {
          type: "bid",
          bid: { tricks: minContractTricks, trump: bestSuit.trump },
        };
      }
    }

    return { type: "pass" };
  }

  if (!shouldBotOvercall(hand, minContractTricks, currentHighBid)) {
    return { type: "pass" };
  }

  const bid = getBestNaturalBid(hand, minContractTricks, currentHighBid);
  if (!bid) return { type: "pass" };

  const estimate = estimateContractTricks(hand, bid.trump);
  const stretch = 1 + (pressure > 0 ? 1 : 0);
  if (bid.tricks > Math.floor(estimate) + stretch) {
    const saferTricks = Math.max(
      minContractTricks,
      Math.min(bid.tricks, Math.floor(estimate) + stretch)
    );
    const safer: ContractBid = { tricks: saferTricks, trump: bid.trump };
    if (estimate >= safer.tricks - (1.1 + pressure * 0.3)) {
      return { type: "bid", bid: safer };
    }
    return { type: "pass" };
  }

  return { type: "bid", bid };
}

function cardWinsTrick(
  card: Card,
  hand: Card[],
  currentTrick: GameState["currentTrick"],
  trump: Trump
): boolean {
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

function lowest(cards: Card[]): Card {
  return sortByRank(cards, true)[0];
}

function highest(cards: Card[]): Card {
  return sortByRank(cards, false)[0];
}

function isTrump(card: Card, trump: Trump): boolean {
  return trump !== "NT" && card.suit === trump;
}

function playedCards(state: GameState): Card[] {
  const played: Card[] = [];
  for (const trick of state.trickHistory ?? []) {
    for (const play of trick.plays) played.push(play.card);
  }
  for (const play of state.currentTrick) played.push(play.card);
  return played;
}

function aceStillOut(state: GameState, suit: Suit, myHand: Card[]): boolean {
  if (hasRank(myHand, suit, "A")) return false;
  return !playedCards(state).some((c) => c.suit === suit && c.rank === "A");
}

/** High cards that may steal a later trick if left in hand. */
function dumpDanger(card: Card, hand: Card[], trump: Trump, state: GameState): number {
  const v = RANK_VALUE[card.rank];
  let danger = v;
  if (isTrump(card, trump)) danger += 18;
  if (card.rank === "A") danger += 12;
  if (card.rank === "K" && aceStillOut(state, card.suit, hand)) danger += 8;
  if (card.rank === "Q") danger += 3;
  const len = suitLength(hand, card.suit);
  if (len === 1 && v >= 11) danger += 6;
  return danger;
}

function pickSafestLoser(
  legal: Card[],
  hand: Card[],
  currentTrick: GameState["currentTrick"],
  trump: Trump,
  state: GameState
): Card | null {
  const losers = legal.filter((c) => !cardWinsTrick(c, hand, currentTrick, trump));
  if (losers.length === 0) return null;
  return [...losers].sort(
    (a, b) => dumpDanger(b, hand, trump, state) - dumpDanger(a, hand, trump, state)
  )[0];
}

function pickCheapestWinner(
  legal: Card[],
  hand: Card[],
  currentTrick: GameState["currentTrick"],
  trump: Trump
): Card | null {
  const winners = legal.filter((c) => cardWinsTrick(c, hand, currentTrick, trump));
  if (winners.length === 0) return null;
  const nonTrump = winners.filter((c) => !isTrump(c, trump));
  if (nonTrump.length > 0) return lowest(nonTrump);
  return lowest(winners);
}

function needsMoreTricks(goal: TrickGoal): boolean {
  return !goal.shouldDump && (goal.needed > 0 || goal.recoverFromZero);
}

/** Ruff only when we still need tricks and don't already have enough cash winners. */
function shouldRuff(goal: TrickGoal, hand: Card[], trump: Trump): boolean {
  if (!needsMoreTricks(goal)) return false;
  if (goal.mustWinEvery || goal.recoverFromZero) return true;
  return countSureWinners(hand, trump) < goal.needed;
}

function pickDumpLead(hand: Card[], trump: Trump, state: GameState): Card {
  const hasTrump = trump !== "NT" && hand.some((c) => c.suit === trump);
  let best: { card: Card; score: number } | null = null;

  for (const suit of SUITS) {
    const suitCards = hand.filter((c) => c.suit === suit);
    if (suitCards.length === 0) continue;

    const low = lowest(suitCards);
    let score = 0;

    if (isTrump(low, trump)) score -= 30;
    score += suitCards.length * 4;
    score -= RANK_VALUE[low.rank];

    if (low.rank === "A") score -= 20;
    if (low.rank === "K") score -= 12;
    if (low.rank === "Q") score -= 6;

    if (hasTrump && suitCards.length === 1 && !isTrump(low, trump)) {
      score -= 14;
    }

    if (!best || score > best.score) best = { card: low, score };
  }

  return best?.card ?? lowest(hand);
}

function pickWinLead(hand: Card[], trump: Trump, goal: TrickGoal, state: GameState): Card {
  if (goal.mustWinEvery || goal.recoverFromZero) {
    for (const suit of SUITS) {
      const ace = hand.find((c) => c.suit === suit && c.rank === "A");
      if (ace) return ace;
    }
    if (trump !== "NT") {
      const trumps = hand.filter((c) => c.suit === trump);
      if (trumps.length > 0) return highest(trumps);
    }
    return highest(hand);
  }

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

  let best: { card: Card; score: number } | null = null;
  for (const suit of SUITS) {
    const suitCards = hand.filter((c) => c.suit === suit);
    if (suitCards.length === 0) continue;
    const remainingOpp =
      13 -
      suitCards.length -
      playedCards(state).filter((c) => c.suit === suit).length;
    const hasAce = hasRank(hand, suit, "A");

    for (const card of suitCards) {
      let score = 0;
      if (card.rank === "A" && goal.needed > 0) score += 12;
      else if (card.rank === "K" && hasAce && goal.needed > 0) score += 9;
      else if (card.rank === "2" || card.rank === "3") score += 3;
      else if (card.rank === "4" || card.rank === "5") score += 2;

      if (suitCards.length >= 5) score += 2;
      if (remainingOpp <= 3 && !hasAce) score -= 2;
      if (isTrump(card, trump) && goal.needed <= 0) score -= 8;

      if (!best || score > best.score) best = { card, score };
    }
  }

  return best?.card ?? hand[0];
}

function pickLeadCard(hand: Card[], trump: Trump, goal: TrickGoal, state: GameState): Card {
  if (goal.shouldDump) {
    return pickDumpLead(hand, trump, state);
  }
  return pickWinLead(hand, trump, goal, state);
}

function pickFollowCard(
  hand: Card[],
  currentTrick: GameState["currentTrick"],
  trump: Trump,
  goal: TrickGoal,
  state: GameState
): Card {
  const legal = getLegalPlays(hand, currentTrick, trump);
  if (legal.length === 0) return hand[0];

  if (!needsMoreTricks(goal)) {
    const dump = pickSafestLoser(legal, hand, currentTrick, trump, state);
    if (dump) return dump;
    return pickCheapestWinner(legal, hand, currentTrick, trump) ?? lowest(legal);
  }

  const cheapWin = pickCheapestWinner(legal, hand, currentTrick, trump);
  if (cheapWin) return cheapWin;
  return lowest(legal);
}

function pickDiscardOrTrump(
  hand: Card[],
  currentTrick: GameState["currentTrick"],
  trump: Trump,
  goal: TrickGoal,
  state: GameState
): Card {
  const legal = getLegalPlays(hand, currentTrick, trump);
  if (legal.length === 0) return hand[0];

  const ledSuit = currentTrick[0].card.suit;
  if (hand.some((c) => c.suit === ledSuit)) {
    return pickFollowCard(hand, currentTrick, trump, goal, state);
  }

  const trumpCards = trump === "NT" ? [] : legal.filter((c) => c.suit === trump);
  const offSuit = legal.filter((c) => !isTrump(c, trump));

  if (!shouldRuff(goal, hand, trump)) {
    if (offSuit.length > 0) {
      return [...offSuit].sort(
        (a, b) => dumpDanger(b, hand, trump, state) - dumpDanger(a, hand, trump, state)
      )[0];
    }
    const losingTrump = pickSafestLoser(trumpCards, hand, currentTrick, trump, state);
    if (losingTrump) return losingTrump;
    return lowest(trumpCards.length > 0 ? trumpCards : legal);
  }

  const winningTrumps = trumpCards.filter((c) =>
    cardWinsTrick(c, hand, currentTrick, trump)
  );
  if (winningTrumps.length > 0) {
    return lowest(winningTrumps);
  }

  if (offSuit.length > 0) {
    return [...offSuit].sort(
      (a, b) => dumpDanger(b, hand, trump, state) - dumpDanger(a, hand, trump, state)
    )[0];
  }

  if (trumpCards.length > 0) {
    return lowest(trumpCards);
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

  return pickDiscardOrTrump(player.hand, state.currentTrick, state.trump, goal, state);
}

export function chooseCardExchange(hand: Card[], minContractTricks: number): string[] {
  const analyses = analyzeHand(hand, minContractTricks);
  const bestTrump = analyses[0]?.trump;
  const naturalTrump = analyses.find((a) => a.trump !== "NT")?.trump;
  const keepSuit: Suit | undefined =
    bestTrump && bestTrump !== "NT"
      ? bestTrump
      : naturalTrump && naturalTrump !== "NT"
        ? naturalTrump
        : undefined;

  // Prefer dumping side-suit trash while protecting the longest / strongest suit for the next auction.
  const scored = hand.map((card) => {
    const len = suitLength(hand, card.suit);
    const v = RANK_VALUE[card.rank];
    let passScore = 0;

    if (keepSuit && card.suit === keepSuit) passScore -= 14;
    if (card.rank === "A") passScore -= 16;
    if (card.rank === "K" && len >= 2) passScore -= 6;
    if (len >= 5 && keepSuit && card.suit === keepSuit) passScore -= 8;

    const unsupportedHonor =
      (card.rank === "K" || card.rank === "Q" || card.rank === "J") &&
      len <= 2 &&
      !hasRank(hand, card.suit, "A");
    if (unsupportedHonor) passScore += 14;

    if (len === 1 && v >= 11) passScore += 10;
    if (len === 2 && v >= 12 && !hasRank(hand, card.suit, "A")) passScore += 8;
    if (v <= 8 && len >= 3 && card.suit !== keepSuit) passScore += 5;
    if (v <= 6 && card.suit !== keepSuit) passScore += 4;
    if (len >= 4 && card.suit !== keepSuit && v <= 9) passScore += 3;

    passScore -= v * 0.08;
    return { card, passScore };
  });

  scored.sort((a, b) => b.passScore - a.passScore);
  return scored.slice(0, 3).map((s) => s.card.id);
}

export function refinePersonalTrickEstimate(
  hand: Card[],
  trump: Trump,
  contractTricks: number
): number {
  let estimate = estimatePersonalTricks(hand, trump);
  const hcp = countHighCardPoints(hand);
  const sure = countSureWinners(hand, trump);

  if (trump !== "NT") {
    const trumpLen = suitLength(hand, trump);
    if (trumpLen >= 4) estimate = Math.min(9, estimate + 1);
    if (trumpLen >= 5) estimate = Math.min(9, estimate + 1);
    if (trumpLen <= 1 && hcp >= 8) estimate = Math.max(0, estimate - 1);
  } else if (hcp >= 10) {
    estimate = Math.min(8, estimate + 1);
  }

  // High contracts already claim many tricks; shade personal bids slightly.
  if (contractTricks >= 8 && estimate >= 5) {
    estimate = Math.max(0, estimate - 1);
  }

  estimate = Math.max(estimate, sure);
  // Soft floor: with any entries, rarely estimate a total blank.
  if (estimate === 0 && (sure > 0 || hcp >= 6)) estimate = 1;

  return Math.max(0, Math.min(9, estimate));
}
