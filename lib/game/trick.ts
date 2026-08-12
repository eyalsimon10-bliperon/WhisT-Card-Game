import type { Card, Suit, TrickPlay, Trump } from "./types";
import { RANK_VALUE } from "./types";

export function hasSuit(hand: Card[], suit: Suit): boolean {
  return hand.some((c) => c.suit === suit);
}

export function getLegalPlays(
  hand: Card[],
  currentTrick: TrickPlay[],
  trump: Trump
): Card[] {
  if (currentTrick.length === 0) return hand;

  const ledSuit = currentTrick[0].card.suit;
  const hasLed = hasSuit(hand, ledSuit);

  if (hasLed) {
    return hand.filter((c) => c.suit === ledSuit);
  }

  return hand;
}

export function getTrickWinner(
  trick: TrickPlay[],
  trump: Trump
): number {
  if (trick.length === 0) throw new Error("Empty trick");

  const ledSuit = trick[0].card.suit;
  let winningPlay = trick[0];

  for (let i = 1; i < trick.length; i++) {
    const play = trick[i];
    if (beats(play, winningPlay, ledSuit, trump)) {
      winningPlay = play;
    }
  }

  return winningPlay.seatIndex;
}

function beats(
  challenger: TrickPlay,
  current: TrickPlay,
  ledSuit: Suit,
  trump: Trump
): boolean {
  const cCard = challenger.card;
  const wCard = current.card;

  if (trump !== "NT") {
    const cIsTrump = cCard.suit === trump;
    const wIsTrump = wCard.suit === trump;

    if (cIsTrump && !wIsTrump) return true;
    if (!cIsTrump && wIsTrump) return false;
    if (cIsTrump && wIsTrump) {
      return RANK_VALUE[cCard.rank] > RANK_VALUE[wCard.rank];
    }
  }

  const cFollows = cCard.suit === ledSuit;
  const wFollows = wCard.suit === ledSuit;

  if (cFollows && !wFollows) return true;
  if (!cFollows && wFollows) return false;
  if (cFollows && wFollows) {
    return RANK_VALUE[cCard.rank] > RANK_VALUE[wCard.rank];
  }

  return false;
}
