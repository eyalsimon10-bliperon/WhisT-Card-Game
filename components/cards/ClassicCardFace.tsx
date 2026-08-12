import type { Rank, Suit } from "@/lib/game/types";
import { SuitIcon } from "@/components/cards/SuitIcon";

export type ClassicCardSize = "xs" | "sm" | "md" | "lg" | "hand" | "table";

interface ClassicCardFaceProps {
  suit: Suit;
  rank: Rank | string;
  size?: ClassicCardSize;
}

const RED_SUITS = new Set<Suit>(["hearts", "diamonds"]);

/**
 * High-readability mobile card: one large rank + suit block on the left edge.
 * Left placement keeps the index visible when cards fan/overlap.
 */
export function ClassicCardFace({ suit, rank, size = "md" }: ClassicCardFaceProps) {
  const isRed = RED_SUITS.has(suit);

  return (
    <div
      className="readable-card-face"
      data-size={size}
      data-red={isRed ? "true" : "false"}
      aria-hidden
    >
      <div className="readable-card-index">
        <span className={`readable-card-rank ${rank === "10" ? "readable-card-rank-ten" : ""}`}>
          {rank}
        </span>
        <SuitIcon suit={suit} className="readable-card-suit" />
      </div>
    </div>
  );
}
