import type { Card, Rank, Suit } from "./types";
import { SUITS } from "./types";

const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}-${suit}`, suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], playerCount: number): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, i) => {
    hands[i % playerCount].push(card);
  });
  return hands.map((hand) => sortHand(hand));
}

export function sortHand(hand: Card[]): Card[] {
  // Left-to-right: spades → hearts → clubs → diamonds, high card first
  const suitOrder: Record<Suit, number> = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
  return [...hand].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    return rankOrder.indexOf(b.rank) - rankOrder.indexOf(a.rank);
  });
}

export function cardLabel(card: Card): string {
  return `${card.rank}${card.suit.charAt(0).toUpperCase()}`;
}
