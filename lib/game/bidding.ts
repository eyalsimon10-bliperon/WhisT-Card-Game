import type { ContractBid, Trump } from "./types";
import { SUIT_LABEL, TRUMP_STRENGTH } from "./types";

export function compareContractBids(a: ContractBid, b: ContractBid): number {
  if (a.tricks !== b.tricks) return a.tricks - b.tricks;
  return TRUMP_STRENGTH[a.trump] - TRUMP_STRENGTH[b.trump];
}

export function beatsCurrentBid(newBid: ContractBid, current: ContractBid | null): boolean {
  if (!current) return true;
  return compareContractBids(newBid, current) > 0;
}

export function isContractBidLegal(
  bid: ContractBid,
  current: ContractBid | null,
  minTricks: number
): boolean {
  if (bid.tricks < minTricks || bid.tricks > 13) return false;
  if (!current) return bid.tricks >= minTricks;
  return beatsCurrentBid(bid, current);
}

export function isContractConfirmLegal(bid: ContractBid, current: ContractBid): boolean {
  return compareContractBids(bid, current) >= 0;
}

export function getLegalConfirmBids(current: ContractBid, minTricks: number): ContractBid[] {
  const trumps: Trump[] = ["clubs", "diamonds", "hearts", "spades", "NT"];
  const bids: ContractBid[] = [];

  for (let tricks = current.tricks; tricks <= 13; tricks++) {
    for (const trump of trumps) {
      const bid = { tricks, trump };
      if (isContractConfirmLegal(bid, current)) {
        bids.push(bid);
      }
    }
  }
  return bids;
}

export function formatContractBid(bid: ContractBid): string {
  return `${bid.tricks} ${SUIT_LABEL[bid.trump]}`;
}

export function getLegalContractBids(
  current: ContractBid | null,
  minTricks: number
): ContractBid[] {
  const trumps: Trump[] = ["clubs", "diamonds", "hearts", "spades", "NT"];
  const bids: ContractBid[] = [];

  for (let tricks = minTricks; tricks <= 13; tricks++) {
    for (const trump of trumps) {
      const bid = { tricks, trump };
      if (isContractBidLegal(bid, current, minTricks)) {
        bids.push(bid);
      }
    }
  }
  return bids;
}

export function isTrickBidLegal(
  bid: number,
  existingBids: (number | null)[],
  contractTricks: number,
  isLastBidder: boolean
): boolean {
  if (bid < 0 || bid > 13) return false;
  if (!isLastBidder) return true;

  const sum = existingBids.reduce<number>((acc, b) => acc + (b ?? 0), 0) + bid;
  return sum !== 13;
}

export function getDisabledTrickBids(
  existingBids: (number | null)[],
  contractTricks: number,
  isLastBidder: boolean
): Set<number> {
  const disabled = new Set<number>();
  if (!isLastBidder) return disabled;

  for (let i = 0; i <= 13; i++) {
    if (!isTrickBidLegal(i, existingBids, contractTricks, true)) {
      disabled.add(i);
    }
  }
  return disabled;
}

export function getTotalTrickBids(trickBids: (number | null)[]): number {
  return trickBids.reduce<number>((acc, b) => acc + (b ?? 0), 0);
}

export function isOver(totalBids: number): boolean {
  return totalBids >= 14;
}

export function isUnder(totalBids: number): boolean {
  return totalBids <= 12;
}

/** OVER / UNDER once all four trick bids are in. Null while bidding is open. */
export function getRoundShape(trickBids: (number | null)[]): "over" | "under" | null {
  if (trickBids.some((b) => b === null)) return null;
  const total = getTotalTrickBids(trickBids);
  if (isOver(total)) return "over";
  if (isUnder(total)) return "under";
  return null;
}

/** Exact bid vs overtricks vs still short — used for HUD colors during play. */
export function getBidProgress(
  tricksWon: number,
  bid: number | null | undefined
): "made" | "overbid" | "short" | null {
  if (bid === null || bid === undefined) return null;
  if (tricksWon > bid) return "overbid";
  if (tricksWon === bid) return "made";
  return "short";
}
