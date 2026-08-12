import type { Rank, Suit } from "@/lib/game/types";
import { SUIT_SYMBOL } from "@/lib/game/types";

export type ClassicCardSize = "xs" | "sm" | "md" | "lg" | "hand" | "table";
export type CardFaceVariant = "fan" | "table";

interface ClassicCardFaceProps {
  suit: Suit;
  rank: Rank | string;
  size?: ClassicCardSize;
  /** Explicit face style. Defaults from size: hand/xs/sm → fan, else table. */
  variant?: CardFaceVariant;
}

const RED_SUITS = new Set<Suit>(["hearts", "diamonds"]);

function resolveVariant(size: ClassicCardSize, variant?: CardFaceVariant): CardFaceVariant {
  if (variant) return variant;
  return size === "hand" || size === "xs" || size === "sm" ? "fan" : "table";
}

/**
 * Dual card faces (BBO-inspired):
 * - fan: only top-left rank + suit (readable under tight LTR overlap)
 * - table: TL/BR corners + large center suit pip
 * Glyphs are the same unicode suits used in trump bidding: ♠ ♥ ♦ ♣
 */
export function ClassicCardFace({
  suit,
  rank,
  size = "md",
  variant,
}: ClassicCardFaceProps) {
  const isRed = RED_SUITS.has(suit);
  const symbol = SUIT_SYMBOL[suit];
  const isTen = rank === "10";
  const face = resolveVariant(size, variant);
  const rankClass = `bbo-rank${isTen ? " bbo-rank--ten" : ""}`;

  if (face === "fan") {
    return (
      <div
        className="bbo-face bbo-face--fan"
        data-size={size}
        data-red={isRed ? "true" : "false"}
        aria-hidden
      >
        <div className="bbo-fan-strip">
          <span className={rankClass}>{rank}</span>
          <span className="bbo-suit">{symbol}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bbo-face bbo-face--table"
      data-size={size}
      data-red={isRed ? "true" : "false"}
      aria-hidden
    >
      <div className="bbo-corner bbo-corner--tl">
        <span className={rankClass}>{rank}</span>
        <span className="bbo-suit">{symbol}</span>
      </div>

      <div className="bbo-center-pip" aria-hidden>
        <span className="bbo-suit bbo-suit--center">{symbol}</span>
      </div>

      <div className="bbo-corner bbo-corner--br">
        <span className={rankClass}>{rank}</span>
        <span className="bbo-suit">{symbol}</span>
      </div>
    </div>
  );
}
