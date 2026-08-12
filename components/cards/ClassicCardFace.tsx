import type { Rank, Suit } from "@/lib/game/types";
import { SuitIcon } from "@/components/cards/SuitIcon";

export type ClassicCardSize = "xs" | "sm" | "md" | "lg" | "hand" | "table";

interface ClassicCardFaceProps {
  suit: Suit;
  rank: Rank | string;
  size?: ClassicCardSize;
}

const RED_SUITS = new Set<Suit>(["hearts", "diamonds"]);

export function ClassicCardFace({ suit, rank, size = "md" }: ClassicCardFaceProps) {
  const isRed = RED_SUITS.has(suit);

  return (
    <div
      className="classic-card-face"
      data-size={size}
      data-red={isRed ? "true" : "false"}
      aria-hidden
    >
      <div className="classic-card-corner classic-card-corner-tl">
        <span className={`classic-card-rank ${rank === "10" ? "classic-card-rank-ten" : ""}`}>
          {rank}
        </span>
        <SuitIcon suit={suit} className="classic-card-suit-icon classic-card-suit-icon-corner" />
      </div>

      <div className="classic-card-corner classic-card-corner-br">
        <span className={`classic-card-rank ${rank === "10" ? "classic-card-rank-ten" : ""}`}>
          {rank}
        </span>
        <SuitIcon suit={suit} className="classic-card-suit-icon classic-card-suit-icon-corner" />
      </div>
    </div>
  );
}
