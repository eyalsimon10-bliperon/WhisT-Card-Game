import type { ContractBid, Trump } from "@/lib/game/types";
import { SUIT_SYMBOL } from "@/lib/game/types";

export function isRedTrump(trump: Trump): boolean {
  return trump === "hearts" || trump === "diamonds";
}

export function SuitGlyph({
  trump,
  className = "",
}: {
  trump: Trump;
  className?: string;
}) {
  if (trump === "NT") {
    return (
      <span className={`bid-mark-nt ${className}`} aria-label="NT">
        NT
      </span>
    );
  }

  return (
    <span
      className={`bid-mark-suit ${isRedTrump(trump) ? "is-red" : "is-black"} ${className}`}
      aria-hidden
    >
      {SUIT_SYMBOL[trump]}
    </span>
  );
}

export function BidMark({
  bid,
  size = "md",
}: {
  bid: ContractBid;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`bid-mark is-${size}`} title={`${bid.tricks} ${bid.trump}`}>
      <span className="bid-mark-num">{bid.tricks}</span>
      <SuitGlyph trump={bid.trump} />
    </span>
  );
}

export function PassMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <span className={`pass-mark is-${size}`}>PASS</span>;
}
