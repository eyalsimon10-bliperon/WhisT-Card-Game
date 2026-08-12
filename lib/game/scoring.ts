import { getTotalTrickBids, isOver, isUnder } from "./bidding";
import type { GamePlayer, RoundScoreEntry } from "./types";

/** True if every player missed their trick bid this round (void round — 0 for all). */
export function didAllPlayersMissBid(
  players: GamePlayer[],
  trickBids: (number | null)[]
): boolean {
  return players.every((player) => {
    const bid = trickBids[player.seatIndex] ?? 0;
    return player.tricksWon !== bid;
  });
}

export function calculateRoundScores(
  players: GamePlayer[],
  trickBids: (number | null)[]
): RoundScoreEntry[] {
  const voidRound = didAllPlayersMissBid(players, trickBids);

  if (voidRound) {
    return players.map((player) => ({
      seatIndex: player.seatIndex,
      name: player.name,
      trickBid: trickBids[player.seatIndex] ?? 0,
      tricksWon: player.tricksWon,
      roundScore: 0,
      totalScore: player.totalScore,
      voidRound: true,
    }));
  }

  const totalBids = getTotalTrickBids(trickBids);
  const over = isOver(totalBids);
  const under = isUnder(totalBids);

  return players.map((player) => {
    const bid = trickBids[player.seatIndex] ?? 0;
    const won = player.tricksWon;
    const roundScore = scorePlayer(bid, won, over, under);
    const totalScore = player.totalScore + roundScore;

    return {
      seatIndex: player.seatIndex,
      name: player.name,
      trickBid: bid,
      tricksWon: won,
      roundScore,
      totalScore,
      voidRound: false,
    };
  });
}

function scorePlayer(
  bid: number,
  won: number,
  over: boolean,
  under: boolean
): number {
  if (won === bid) {
    if (bid === 0) {
      return over ? 25 : 50;
    }
    return bid * bid + 10;
  }

  const diff = Math.abs(won - bid);

  if (bid === 0) {
    const basePenalty = over ? -25 : -50;
    if (won === 0) return 0;
    return basePenalty + (won - 1) * 10;
  }

  return diff * -10;
}

export function applyRoundScores(
  players: GamePlayer[],
  roundScores: RoundScoreEntry[]
): GamePlayer[] {
  return players.map((p) => {
    const entry = roundScores.find((r) => r.seatIndex === p.seatIndex);
    return {
      ...p,
      totalScore: entry?.totalScore ?? p.totalScore,
    };
  });
}
