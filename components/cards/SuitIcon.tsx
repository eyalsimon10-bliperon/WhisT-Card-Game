import type { Suit } from "@/lib/game/types";

interface SuitIconProps {
  suit: Suit;
  className?: string;
}

/** Bold filled suit glyphs — clearer on mobile than unicode text. */
export function SuitIcon({ suit, className = "" }: SuitIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      {suit === "hearts" && (
        <path d="M12 20.5S3.5 14.2 3.5 8.8C3.5 5.9 5.8 3.5 8.7 3.5c1.7 0 3.3.9 4.3 2.3 1-1.4 2.6-2.3 4.3-2.3 2.9 0 5.2 2.4 5.2 5.3 0 5.4-8.5 11.7-8.5 11.7z" />
      )}
      {suit === "diamonds" && (
        <path d="M12 2.5 21 12 12 21.5 3 12 12 2.5z" />
      )}
      {suit === "spades" && (
        <>
          <path d="M12 2.5C8.5 8.5 3 10 3 14.5 3 18.5 6.5 21 10 20c1.2-.2 2.3-.9 3.2-1.8 1 1 2.1 1.6 3.2 1.8 3.5 1 7-1.5 7-5.5 0-4.5-5.5-6-9-12z" />
          <path d="M10.5 19.5h3v3.5h-3z" />
        </>
      )}
      {suit === "clubs" && (
        <>
          <circle cx="12" cy="8" r="3.2" />
          <circle cx="7.2" cy="13" r="3.2" />
          <circle cx="16.8" cy="13" r="3.2" />
          <path d="M10.5 15.8h3v6.2h-3z" />
        </>
      )}
    </svg>
  );
}
