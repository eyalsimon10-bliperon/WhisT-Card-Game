import type { Suit } from "@/lib/game/types";

/** Classic playing-card suit silhouettes (viewBox 0 0 24 24). */
const PATHS: Record<Suit, string> = {
  spades:
    "M12 2C8.2 8.2 4 11 4 15.2 4 18.4 6.4 21 9.5 21c1.3 0 2.4-.5 3.2-1.3-.2 1.5-.9 2.8-2 3.8h2.6c-1.1-1-1.8-2.3-2-3.8.8.8 1.9 1.3 3.2 1.3 3.1 0 5.5-2.6 5.5-5.8C20 11 15.8 8.2 12 2z",
  hearts:
    "M12 21.2 10.4 19.7C5.4 15.2 2 12.1 2 8.3 2 5.2 4.4 3 7.4 3c1.7 0 3.3.8 4.6 2.2C13.3 3.8 14.9 3 16.6 3 19.6 3 22 5.2 22 8.3c0 3.8-3.4 6.9-8.4 11.4L12 21.2z",
  diamonds: "M12 1.8 21.2 12 12 22.2 2.8 12 12 1.8z",
  clubs:
    "M9.2 10.6a3.4 3.4 0 1 1 5.6 0 3.5 3.5 0 1 1 1.4 6.2c-.9 0-1.7-.3-2.3-.9.1 1.2.6 2.3 1.5 3.1H8.6c.9-.8 1.4-1.9 1.5-3.1-.6.6-1.4.9-2.3.9a3.5 3.5 0 1 1 1.4-6.2z",
};

/** Crisp suit marks that render on every device (iPad/Safari included). */
export function SuitIcon({
  suit,
  className = "",
}: {
  suit: Suit;
  className?: string;
}) {
  return (
    <svg
      className={`suit-icon ${className}`}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden
      focusable="false"
    >
      <path d={PATHS[suit]} fill="currentColor" />
    </svg>
  );
}
