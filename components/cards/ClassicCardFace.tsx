import type { Rank, Suit } from "@/lib/game/types";
import { SUIT_SYMBOL } from "@/lib/game/types";

export type ClassicCardSize = "xs" | "sm" | "md" | "lg" | "hand" | "table";

interface ClassicCardFaceProps {
  suit: Suit;
  rank: Rank | string;
  size?: ClassicCardSize;
}

const RED_SUITS = new Set<Suit>(["hearts", "diamonds"]);
const FACE_RANKS = new Set(["J", "Q", "K"]);

export function ClassicCardFace({ suit, rank, size = "md" }: ClassicCardFaceProps) {
  const isRed = RED_SUITS.has(suit);
  const symbol = SUIT_SYMBOL[suit];
  const isFace = FACE_RANKS.has(rank);
  const showCenter = size !== "xs" && size !== "sm";

  return (
    <div
      className="classic-card-face"
      data-size={size}
      data-red={isRed ? "true" : "false"}
      aria-hidden
    >
      <div className="classic-card-corner classic-card-corner-tl">
        <span className={`classic-card-rank ${rank === "10" ? "classic-card-rank-ten" : ""}`}>{rank}</span>
        <span className="classic-card-corner-suit">{symbol}</span>
      </div>

      {showCenter && (
        <div className="classic-card-center">
          {isFace ? (
            <>
              <span className="classic-card-face-rank">{rank}</span>
              <span className="classic-card-face-suit">{symbol}</span>
            </>
          ) : (
            <span className="classic-card-pip">{symbol}</span>
          )}
        </div>
      )}

      <div className="classic-card-corner classic-card-corner-br">
        <span className={`classic-card-rank ${rank === "10" ? "classic-card-rank-ten" : ""}`}>{rank}</span>
        <span className="classic-card-corner-suit">{symbol}</span>
      </div>
    </div>
  );
}
