"use client";

import { ClassicCardBack } from "@/components/cards/ClassicCardBack";
import { ClassicCardFace, type ClassicCardSize } from "@/components/cards/ClassicCardFace";
import type { Card as GameCard, Rank, Suit } from "@/lib/game/types";

interface PlayingCardProps {
  card?: GameCard;
  suit?: Suit;
  rank?: string;
  size?: ClassicCardSize;
  selected?: boolean;
  disabled?: boolean;
  /** Subtle highlight when the card is a legal play option */
  playable?: boolean;
  elevated?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeClasses: Record<ClassicCardSize, string> = {
  xs: "card-size-xs",
  sm: "card-size-sm",
  md: "card-size-md",
  lg: "card-size-lg",
  hand: "card-size-hand",
  table: "card-size-table",
};

export function PlayingCard({
  card,
  suit,
  rank,
  size = "md",
  selected = false,
  disabled = false,
  playable = false,
  elevated = false,
  onClick,
  className = "",
}: PlayingCardProps) {
  const displaySuit = card?.suit ?? suit ?? "spades";
  const displayRank = (card?.rank ?? rank ?? "A") as Rank | string;
  const interactive = !!onClick && !disabled;

  const wrapperClass = `
    playing-card-shell relative aspect-[5/7] overflow-hidden rounded-[0.35rem] transition-all duration-200
    ${sizeClasses[size]}
    ${elevated && !disabled ? "shadow-[0_3px_10px_rgba(0,0,0,0.45)]" : "shadow-[0_2px_5px_rgba(0,0,0,0.3)]"}
    ${playable && !disabled ? "card-playable" : ""}
    ${selected ? "ring-2 ring-gold-400 -translate-y-3 portrait-phone:-translate-y-2 landscape-phone:-translate-y-1.5 z-10 shadow-[0_8px_20px_rgba(232,197,71,0.35)]" : ""}
    ${interactive ? "cursor-pointer hover:-translate-y-2 portrait-phone:hover:-translate-y-1.5 landscape-phone:hover:-translate-y-1 hover:shadow-xl active:scale-95" : ""}
    ${disabled ? "card-unplayable" : ""}
    ${className}
  `.trim();

  const content = (
    <ClassicCardFace suit={displaySuit} rank={displayRank} size={size} />
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={wrapperClass}
        aria-label={`${displayRank} ${displaySuit}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={wrapperClass}
      aria-hidden={!card}
      aria-disabled={disabled || undefined}
    >
      {content}
      {disabled && <span className="card-unplayable-veil" aria-hidden />}
    </div>
  );
}

export function CardFan() {
  const cards = [
    { suit: "clubs" as Suit, rank: "K" },
    { suit: "clubs" as Suit, rank: "Q" },
    { suit: "hearts" as Suit, rank: "A" },
    { suit: "hearts" as Suit, rank: "J" },
    { suit: "spades" as Suit, rank: "10" },
    { suit: "spades" as Suit, rank: "7" },
    { suit: "diamonds" as Suit, rank: "A" },
    { suit: "diamonds" as Suit, rank: "K" },
  ];

  return (
    <div className="game-hand-fan game-hand-fan--bbo mx-auto max-w-[20rem] justify-center px-1" aria-hidden>
      {cards.map((card, i) => (
        <div key={`${card.rank}-${card.suit}`} className="relative shrink-0" style={{ zIndex: i + 1 }}>
          <PlayingCard suit={card.suit} rank={card.rank} size="hand" elevated />
        </div>
      ))}
    </div>
  );
}

export function CardBack({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeMap = { sm: "card-size-sm", md: "card-size-md", lg: "card-size-lg" } as const;

  return (
    <div
      className={`playing-card-shell relative aspect-[5/7] overflow-hidden rounded-lg shadow-lg ${sizeMap[size]} ${className}`}
      aria-hidden
    >
      <ClassicCardBack />
    </div>
  );
}
