import type { Rank, Suit } from "@/lib/game/types";
import { SUIT_SYMBOL } from "@/lib/game/types";

export type ClassicCardSize = "xs" | "sm" | "md" | "lg" | "hand" | "table";

interface ClassicCardFaceProps {
  suit: Suit;
  rank: Rank | string;
  size?: ClassicCardSize;
}

const RED_SUITS = new Set<Suit>(["hearts", "diamonds"]);

/** Hand-fan cards use a compact left index; table cards use full corner indices. */
function isFanStyle(size: ClassicCardSize): boolean {
  return size === "hand" || size === "xs" || size === "sm";
}

/**
 * BBO-style dual faces:
 * - Fan (hand): rank + suit top-left, large and readable under overlap
 * - Table: traditional TL + BR corners on a clean white face
 * Suit glyphs match bidding trump symbols (♠ ♥ ♦ ♣).
 */
export function ClassicCardFace({ suit, rank, size = "md" }: ClassicCardFaceProps) {
  const isRed = RED_SUITS.has(suit);
  const symbol = SUIT_SYMBOL[suit];
  const isTen = rank === "10";
  const fan = isFanStyle(size);

  if (fan) {
    return (
      <div
        className="bbo-card bbo-card--fan"
        data-size={size}
        data-red={isRed ? "true" : "false"}
        aria-hidden
      >
        <div className="bbo-card-fan-index">
          <span className={`bbo-card-rank${isTen ? " bbo-card-rank--ten" : ""}`}>{rank}</span>
          <span className="bbo-card-suit">{symbol}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bbo-card bbo-card--table"
      data-size={size}
      data-red={isRed ? "true" : "false"}
      aria-hidden
    >
      <div className="bbo-card-corner bbo-card-corner--tl">
        <span className={`bbo-card-rank${isTen ? " bbo-card-rank--ten" : ""}`}>{rank}</span>
        <span className="bbo-card-suit">{symbol}</span>
      </div>
      <div className="bbo-card-corner bbo-card-corner--br">
        <span className={`bbo-card-rank${isTen ? " bbo-card-rank--ten" : ""}`}>{rank}</span>
        <span className="bbo-card-suit">{symbol}</span>
      </div>
    </div>
  );
}
