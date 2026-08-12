import type { Rank, Suit } from "@/lib/game/types";
import { SUIT_SYMBOL } from "@/lib/game/types";

export type ClassicCardSize = "xs" | "sm" | "md" | "lg" | "hand" | "table";

interface ClassicCardFaceProps {
  suit: Suit;
  rank: Rank | string;
  size?: ClassicCardSize;
}

const RED_SUITS = new Set<Suit>(["hearts", "diamonds"]);

/**
 * One card face for hand + table:
 * - Top-left: rank + suit (visible in fan)
 * - Bottom-right: same index, rotated 180°
 * No center pip. Suit glyphs match bidding: ♠ ♥ ♦ ♣
 */
export function ClassicCardFace({ suit, rank, size = "md" }: ClassicCardFaceProps) {
  const isRed = RED_SUITS.has(suit);
  const symbol = SUIT_SYMBOL[suit];
  const isTen = rank === "10";

  const index = (
    <>
      <span className={`bbo-rank${isTen ? " bbo-rank--ten" : ""}`}>{rank}</span>
      <span className="bbo-suit">{symbol}</span>
    </>
  );

  return (
    <div
      className="bbo-face"
      data-size={size}
      data-red={isRed ? "true" : "false"}
      aria-hidden
    >
      <div className="bbo-index bbo-index--tl">{index}</div>
      <div className="bbo-index bbo-index--br">{index}</div>
    </div>
  );
}
