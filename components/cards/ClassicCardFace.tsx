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
 * Mobile-first playing card face.
 * One large rank + suit block on the LEFT so it stays visible
 * when cards fan and overlap left-to-right.
 */
export function ClassicCardFace({ suit, rank, size = "md" }: ClassicCardFaceProps) {
  const isRed = RED_SUITS.has(suit);
  const isTen = rank === "10";

  return (
    <div
      className="whist-card-face"
      data-size={size}
      data-red={isRed ? "true" : "false"}
      aria-hidden
    >
      <div className="whist-card-index">
        <span className={`whist-card-rank${isTen ? " whist-card-rank--ten" : ""}`}>{rank}</span>
        <SuitIcon suit={suit} className="whist-card-suit" />
      </div>
    </div>
  );
}
