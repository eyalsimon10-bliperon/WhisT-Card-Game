"use client";

import type { ComponentType, SVGProps } from "react";
import * as Deck from "@letele/playing-cards";
import type { Card as GameCard, Rank, Suit } from "@/lib/game/types";

interface PlayingCardProps {
  card?: GameCard;
  suit?: Suit;
  rank?: string;
  size?: "xs" | "sm" | "md" | "lg" | "hand" | "table";
  selected?: boolean;
  disabled?: boolean;
  /** Subtle highlight when the card is a legal play option */
  playable?: boolean;
  elevated?: boolean;
  onClick?: () => void;
  className?: string;
}

type DeckCard = ComponentType<SVGProps<SVGSVGElement>>;

const sizeClasses = {
  xs: "h-12",
  sm: "h-14",
  md: "h-20",
  lg: "h-[4.75rem] portrait-phone:h-[3.65rem] landscape-phone:h-[2.85rem]",
  hand: "h-[4rem] portrait-phone:h-[2.85rem] landscape-phone:h-[2.5rem]",
  table: "h-[5.5rem] portrait-phone:h-[3.65rem] landscape-phone:h-[2.85rem]",
};

const SUIT_PREFIX: Record<Suit, string> = {
  spades: "S",
  hearts: "H",
  diamonds: "D",
  clubs: "C",
};

function toDeckKey(suit: Suit, rank: Rank | string): string {
  const rankKey =
    rank === "A" ? "a" :
    rank === "J" ? "j" :
    rank === "Q" ? "q" :
    rank === "K" ? "k" :
    rank;
  return `${SUIT_PREFIX[suit]}${rankKey}`;
}

function getDeckComponent(suit: Suit, rank: Rank | string): DeckCard | null {
  const key = toDeckKey(suit, rank);
  return (Deck as Record<string, DeckCard>)[key] ?? null;
}

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
  const displayRank = card?.rank ?? rank ?? "A";
  const SvgCard = getDeckComponent(displaySuit, displayRank);
  const interactive = !!onClick && !disabled;

  const content = SvgCard ? (
    <SvgCard style={{ height: "100%", width: "100%" }} aria-hidden />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-white text-xs text-gray-500">
      ?
    </div>
  );

  const wrapperClass = `
    relative aspect-[5/7] overflow-hidden rounded-lg transition-all duration-200
    ${sizeClasses[size]}
    ${elevated && !disabled ? "shadow-[0_4px_14px_rgba(0,0,0,0.45)] ring-1 ring-white/30" : "shadow-md"}
    ${playable && !disabled ? "ring-2 ring-emerald-400/45 shadow-[0_4px_16px_rgba(52,211,153,0.2)]" : ""}
    ${selected ? "ring-2 ring-gold-400 -translate-y-3 portrait-phone:-translate-y-1 landscape-phone:-translate-y-1 z-10 shadow-[0_8px_20px_rgba(232,197,71,0.35)]" : ""}
    ${interactive ? "cursor-pointer hover:-translate-y-2 portrait-phone:hover:-translate-y-1 landscape-phone:hover:-translate-y-0.5 hover:shadow-xl active:scale-95" : ""}
    ${disabled ? "card-unplayable" : ""}
    ${className}
  `.trim();

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
    { suit: "spades" as Suit, rank: "A", rotate: -18, x: -28 },
    { suit: "hearts" as Suit, rank: "K", rotate: -6, x: -10 },
    { suit: "diamonds" as Suit, rank: "Q", rotate: 6, x: 10 },
    { suit: "clubs" as Suit, rank: "J", rotate: 18, x: 28 },
  ];

  return (
    <div className="relative mx-auto h-24 w-40" aria-hidden>
      {cards.map((card, i) => (
        <div
          key={i}
          className="absolute bottom-0 left-1/2"
          style={{
            transform: `translateX(calc(-50% + ${card.x}px)) rotate(${card.rotate}deg)`,
            zIndex: i,
          }}
        >
          <PlayingCard suit={card.suit} rank={card.rank} size="md" />
        </div>
      ))}
    </div>
  );
}

export function CardBack({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeMap = { sm: "h-14", md: "h-20", lg: "h-28" } as const;

  return (
    <div
      className={`relative aspect-[5/7] overflow-hidden rounded-lg shadow-lg ${sizeMap[size]} ${className}`}
      aria-hidden
    >
      <Deck.B1 style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
