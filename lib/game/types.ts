export type Suit = "clubs" | "diamonds" | "hearts" | "spades";
export type Trump = Suit | "NT";

export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface ContractBid {
  tricks: number;
  trump: Trump;
}

export type ContractAction =
  | { type: "bid"; bid: ContractBid }
  | { type: "pass" };

export type ContractSeatDisplay =
  | "waiting"
  | "thinking"
  | "pass"
  | "bid"
  | "confirm";

export interface GamePlayer {
  id: string;
  name: string;
  seatIndex: number;
  isBot: boolean;
  hand: Card[];
  tricksWon: number;
  trickBid: number | null;
  totalScore: number;
}

export type GamePhase =
  | "bidding_contract"
  | "bidding_tricks"
  | "card_exchange"
  | "playing"
  | "round_scoring"
  | "game_over";

export interface TrickPlay {
  seatIndex: number;
  card: Card;
}

export interface RoundScoreEntry {
  seatIndex: number;
  name: string;
  trickBid: number;
  tricksWon: number;
  roundScore: number;
  totalScore: number;
  voidRound?: boolean;
}

export interface CompletedTrickDisplay {
  plays: TrickPlay[];
  winnerSeat: number;
}

export interface GameState {
  roomCode: string;
  totalRounds: number;
  currentRound: number;
  phase: GamePhase;
  players: GamePlayer[];
  firstBidderIndex: number;
  currentPlayerIndex: number;
  minContractTricks: number;
  currentHighBid: ContractBid | null;
  highBidderIndex: number | null;
  consecutivePasses: number;
  /** Seats that passed since the current high bid was placed */
  contractPassSeats: number[];
  /** High bidder must confirm (or adjust trump) after 3 passes */
  contractConfirmPending: boolean;
  contractWinnerIndex: number | null;
  contractBid: ContractBid | null;
  trickBids: (number | null)[];
  trickBidOrder: number[];
  trickBidStep: number;
  trump: Trump | null;
  currentTrick: TrickPlay[];
  /** Winner seat while 4 trick cards remain visible before collect animation */
  awaitingTrickCollect: number | null;
  completedTrickDisplay: CompletedTrickDisplay | null;
  trickLeaderIndex: number;
  tricksPlayed: number;
  cardExchange: Record<string, string[]>;
  cardExchangeReady: Record<string, boolean>;
  roundScores: RoundScoreEntry[] | null;
  bidLog: string[];
}

export const SUITS: Suit[] = ["clubs", "diamonds", "hearts", "spades"];
export const TRUMPS: Trump[] = ["clubs", "diamonds", "hearts", "spades", "NT"];

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

export const SUIT_LABEL: Record<Suit | "NT", string> = {
  spades: "עלה",
  hearts: "לב",
  diamonds: "יהלום",
  clubs: "תלתן",
  NT: "NT",
};

export const TRUMP_STRENGTH: Record<Trump, number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
  NT: 4,
};

export const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};
