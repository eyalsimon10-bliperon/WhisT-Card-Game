import type { Card, ContractBid, Suit, Trump } from "./types";
import { SUITS } from "./types";
import { beatsCurrentBid, compareContractBids, isContractBidLegal } from "./bidding";

const HONOR_POINTS: Partial<Record<Card["rank"], number>> = {
  A: 4,
  K: 3,
  Q: 2,
  J: 1,
};

export function countHighCardPoints(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + (HONOR_POINTS[card.rank] ?? 0), 0);
}

export function suitLength(hand: Card[], suit: Suit): number {
  return hand.filter((c) => c.suit === suit).length;
}

function hasRank(hand: Card[], suit: Suit, rank: Card["rank"]): boolean {
  return hand.some((c) => c.suit === suit && c.rank === rank);
}

export { hasRank };

/** Extra leniency after 4-pass exchanges — min rises and someone must declare. */
export function exchangePressure(minTricks: number): number {
  return Math.max(0, minTricks - 5);
}

export function estimateSuitContractTricks(hand: Card[], trump: Suit): number {
  let tricks = 0;
  const trumpLen = suitLength(hand, trump);

  if (hasRank(hand, trump, "A")) tricks += 1;
  if (hasRank(hand, trump, "K")) tricks += trumpLen >= 2 ? 0.9 : 0.4;
  if (hasRank(hand, trump, "Q")) tricks += trumpLen >= 3 ? 0.6 : 0.25;
  if (hasRank(hand, trump, "J")) tricks += trumpLen >= 4 ? 0.4 : 0.15;

  for (const suit of SUITS) {
    if (suit === trump) continue;
    const len = suitLength(hand, suit);
    if (hasRank(hand, suit, "A")) tricks += 1;
    if (hasRank(hand, suit, "K") && len >= 2) tricks += 0.55;
    if (hasRank(hand, suit, "Q") && len >= 3) tricks += 0.25;
    if (len === 0) tricks += 0.9;
    else if (len === 1) tricks += 0.45;
  }

  if (trumpLen >= 6) tricks += trumpLen - 5;
  else if (trumpLen === 5) tricks += 0.9;
  else if (trumpLen === 4) tricks += 0.45;

  return tricks;
}

export function estimateNTContractTricks(hand: Card[]): number {
  const hcp = countHighCardPoints(hand);
  const lengths = SUITS.map((s) => suitLength(hand, s));
  const maxLen = Math.max(...lengths);
  const minLen = Math.min(...lengths);
  const balanced = maxLen <= 5 && maxLen - minLen <= 3;

  if (hcp < 9 || !balanced) {
    return hcp / 4.2;
  }

  let tricks = hcp / 3.0;

  for (const suit of SUITS) {
    const len = suitLength(hand, suit);
    if (len >= 5 && (hasRank(hand, suit, "A") || hasRank(hand, suit, "K"))) {
      tricks += (len - 4) * 0.5;
    }
  }

  return tricks;
}

export function estimateContractTricks(hand: Card[], trump: Trump): number {
  if (trump === "NT") return estimateNTContractTricks(hand);
  return estimateSuitContractTricks(hand, trump);
}

export interface HandAnalysis {
  trump: Trump;
  estimatedTricks: number;
  bidTricks: number;
}

export function analyzeHand(hand: Card[], minTricks: number): HandAnalysis[] {
  const analyses: HandAnalysis[] = [];

  for (const suit of SUITS) {
    const estimated = estimateSuitContractTricks(hand, suit);
    analyses.push({
      trump: suit,
      estimatedTricks: estimated,
      bidTricks: tricksToBid(estimated, minTricks),
    });
  }

  const ntEstimated = estimateNTContractTricks(hand);
  analyses.push({
    trump: "NT",
    estimatedTricks: ntEstimated,
    bidTricks: tricksToBid(ntEstimated, minTricks),
  });

  return analyses.sort((a, b) => b.estimatedTricks - a.estimatedTricks);
}

function tricksToBid(estimated: number, minTricks: number): number {
  const pressure = exchangePressure(minTricks);
  // After exchanges, accept thinner values so the auction actually starts.
  const openFloor = minTricks - 0.35 - pressure * 0.4;
  if (estimated < openFloor) return 0;

  const floor = Math.floor(estimated);
  const fraction = estimated - floor;

  let bid = fraction >= 0.55 ? floor + 1 : floor;
  bid = Math.max(bid, minTricks);

  // With exchange pressure, stretch toward min even if estimate is a bit light.
  if (pressure > 0 && estimated >= openFloor) {
    bid = Math.max(bid, minTricks);
  }

  if (bid >= 13 && estimated < 11.5) bid = 12;
  if (bid > 12 && estimated < 11) bid = 12;

  return Math.min(bid, 13);
}

export function getBestNaturalBid(
  hand: Card[],
  minTricks: number,
  currentHighBid: ContractBid | null
): ContractBid | null {
  const analyses = analyzeHand(hand, minTricks);
  const best = analyses[0];
  const pressure = exchangePressure(minTricks);
  const margin = 1.15 + pressure * 0.45;
  const openFloor = minTricks - 0.35 - pressure * 0.55;

  if (!best) return null;

  // Prefer a real suit over NT when stretching after exchanges.
  const preferred =
    pressure >= 1 && best.trump === "NT"
      ? analyses.find((a) => a.trump !== "NT") ?? best
      : best;

  if (!currentHighBid) {
    if (preferred.estimatedTricks >= openFloor || pressure >= 3) {
      const tricks = Math.max(minTricks, preferred.bidTricks || minTricks);
      return { tricks: Math.min(tricks, 12), trump: preferred.trump };
    }
    if (preferred.bidTricks >= minTricks && preferred.estimatedTricks >= preferred.bidTricks - margin) {
      return { tricks: preferred.bidTricks, trump: preferred.trump };
    }
    return null;
  }

  for (const analysis of analyses) {
    const maxTry = Math.max(analysis.bidTricks, minTricks);
    for (
      let tricks = Math.max(minTricks, currentHighBid.tricks);
      tricks <= Math.min(Math.max(maxTry, currentHighBid.tricks + 1), 12);
      tricks++
    ) {
      const bid: ContractBid = { tricks, trump: analysis.trump };
      if (!isContractBidLegal(bid, currentHighBid, minTricks)) continue;
      if (analysis.estimatedTricks >= tricks - margin || (pressure >= 2 && tricks === minTricks)) {
        return bid;
      }
    }
  }

  return null;
}

function hasDeclarableShape(hand: Card[]): boolean {
  for (const suit of SUITS) {
    const len = suitLength(hand, suit);
    if (len >= 6) return true;
    if (len >= 5 && (hasRank(hand, suit, "A") || hasRank(hand, suit, "K"))) return true;
  }
  return false;
}

export function shouldBotOpen(hand: Card[], minTricks: number): boolean {
  const analyses = analyzeHand(hand, minTricks);
  const best = analyses[0];
  if (!best) return false;

  const hcp = countHighCardPoints(hand);
  const pressure = exchangePressure(minTricks);
  const openFloor = minTricks - 0.35 - pressure * 0.55;
  const requiredHcp = Math.max(2, 7 - pressure * 2);

  if (best.estimatedTricks >= openFloor && (best.bidTricks >= minTricks || pressure >= 1)) {
    if (hcp >= requiredHcp) return true;
    if (hasDeclarableShape(hand) && hcp >= Math.max(2, requiredHcp - 2)) return true;
  }

  // After exchanges, open on almost any long suit / middling values.
  if (pressure >= 1 && best.estimatedTricks >= minTricks - 1.35 && hcp >= 4) {
    return true;
  }
  if (pressure >= 2 && best.estimatedTricks >= minTricks - 1.8) {
    return true;
  }
  if (pressure >= 3) {
    return true;
  }

  return false;
}

export function shouldBotOvercall(
  hand: Card[],
  minTricks: number,
  currentHighBid: ContractBid
): boolean {
  const bid = getBestNaturalBid(hand, minTricks, currentHighBid);
  if (!bid) return false;

  const estimate = estimateContractTricks(hand, bid.trump);
  const pressure = exchangePressure(minTricks);
  const margin = 1.05 + pressure * 0.25;

  return (
    beatsCurrentBid(bid, currentHighBid) &&
    estimate >= bid.tricks - margin &&
    bid.tricks <= Math.floor(estimate) + 1 + (pressure > 0 ? 1 : 0)
  );
}

export function estimatePersonalTricks(hand: Card[], trump: Trump): number {
  if (trump === "NT") {
    const hcp = countHighCardPoints(hand);
    let tricks = hcp / 4.5;
    for (const suit of SUITS) {
      if (hasRank(hand, suit, "A")) tricks += 0.9;
      if (hasRank(hand, suit, "K") && suitLength(hand, suit) >= 2) tricks += 0.4;
      if (hasRank(hand, suit, "Q") && suitLength(hand, suit) >= 3) tricks += 0.2;
    }
    return Math.max(0, Math.min(Math.round(tricks), 8));
  }

  const trumpLen = suitLength(hand, trump);
  let tricks = 0;

  if (hasRank(hand, trump, "A")) tricks += 1;
  if (hasRank(hand, trump, "K")) tricks += trumpLen >= 2 ? 0.85 : 0.3;
  if (hasRank(hand, trump, "Q")) tricks += trumpLen >= 3 ? 0.5 : 0.15;
  if (hasRank(hand, trump, "J") && trumpLen >= 4) tricks += 0.25;

  for (const suit of SUITS) {
    if (suit === trump) continue;
    if (hasRank(hand, suit, "A")) tricks += 0.95;
    if (hasRank(hand, suit, "K") && suitLength(hand, suit) >= 2) tricks += 0.4;
    const len = suitLength(hand, suit);
    if (len === 0 && trumpLen >= 3) tricks += 0.45;
    else if (len === 1 && trumpLen >= 3) tricks += 0.3;
  }

  if (trumpLen >= 6) tricks += 1.0;
  else if (trumpLen >= 5) tricks += 0.7;
  else if (trumpLen >= 4) tricks += 0.35;

  return Math.max(0, Math.min(Math.round(tricks), 9));
}

export function cardStrength(card: Card, trump: Trump): number {
  const rankValues: Record<string, number> = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
    "10": 10, J: 11, Q: 12, K: 13, A: 14,
  };
  let strength = rankValues[card.rank] ?? 0;
  if (trump !== "NT" && card.suit === trump) strength += 20;
  return strength;
}

export function compareBids(a: ContractBid, b: ContractBid): number {
  return compareContractBids(a, b);
}
