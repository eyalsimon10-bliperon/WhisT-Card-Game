"use client";

import { useEffect, useState } from "react";
import { PlayingCard } from "@/components/PlayingCard";
import { playCardSlide } from "@/lib/audio/card-sounds";
import { sortHand } from "@/lib/game/cards";
import { useHandFanLayout } from "@/lib/hooks/useHandFanLayout";
import { scalePx, useTrickLayoutScale } from "@/lib/hooks/useTrickLayoutScale";
import type { Card, TrickPlay } from "@/lib/game/types";
import type { GameState } from "@/lib/game/types";

interface TrickAreaProps {
  state: GameState;
  mySeat: number;
  collecting?: boolean;
}

/** Card positions around center (relative seat 0=me, 1=right, 2=top, 3=left) */
const CARD_LAYOUT: Record<number, { x: number; y: number; rotate: number }> = {
  0: { x: 0, y: 52, rotate: 5 },
  1: { x: 58, y: 6, rotate: 14 },
  2: { x: 0, y: -44, rotate: -8 },
  3: { x: -58, y: 6, rotate: -14 },
};

const FLY_FROM: Record<number, { x: string; y: string }> = {
  0: { x: "0px", y: "100px" },
  1: { x: "120px", y: "16px" },
  2: { x: "0px", y: "-100px" },
  3: { x: "-120px", y: "16px" },
};

const COLLECT_TO: Record<number, { x: string; y: string }> = {
  0: { x: "0px", y: "140px" },
  1: { x: "160px", y: "30px" },
  2: { x: "0px", y: "-140px" },
  3: { x: "-160px", y: "30px" },
};

function relativeSeat(seatIndex: number, mySeat: number): number {
  return (seatIndex - mySeat + 4) % 4;
}

function getPlayerName(state: GameState, seatIndex: number): string {
  return state.players.find((p) => p.seatIndex === seatIndex)?.name ?? "?";
}

interface TrickCardProps {
  play: TrickPlay;
  mySeat: number;
  playerName: string;
  isCollecting: boolean;
  isAwaitingCollect: boolean;
  isWinner: boolean;
  winnerRelative: number;
  zIndex: number;
  layoutScale: number;
}

function TrickCard({
  play,
  mySeat,
  playerName,
  isCollecting,
  isAwaitingCollect,
  isWinner,
  winnerRelative,
  zIndex,
  layoutScale,
}: TrickCardProps) {
  const rel = relativeSeat(play.seatIndex, mySeat);
  const layout = CARD_LAYOUT[rel];
  const flyFrom = FLY_FROM[rel];
  const collectTo = COLLECT_TO[winnerRelative];
  const layoutX = scalePx(layout.x, layoutScale);
  const layoutY = scalePx(layout.y, layoutScale);

  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    playCardSlide(play.card.id);
    const timer = window.setTimeout(() => setArrived(true), 280);
    return () => window.clearTimeout(timer);
  }, []);

  const motionClass = isCollecting
    ? isWinner
      ? "trick-card-winner"
      : "trick-card-collect"
    : arrived
      ? ""
      : "trick-card-play";

  return (
    <div
      className={`trick-card ${motionClass} ${isWinner && isAwaitingCollect && !isCollecting ? "trick-card-pending-winner" : ""}`}
      style={{
        zIndex: isWinner ? 50 : zIndex,
        ["--from-x" as string]: scalePx(parseInt(flyFrom.x, 10), layoutScale),
        ["--from-y" as string]: scalePx(parseInt(flyFrom.y, 10), layoutScale),
        ["--to-x" as string]: scalePx(parseInt(collectTo.x, 10), layoutScale),
        ["--to-y" as string]: scalePx(parseInt(collectTo.y, 10), layoutScale),
        ["--layout-x" as string]: layoutX,
        ["--layout-y" as string]: layoutY,
        ["--layout-rotate" as string]: `${layout.rotate}deg`,
      }}
    >
      <div className="flex flex-col items-center gap-0.5 landscape-phone:gap-0">
        <PlayingCard card={play.card} size="table" elevated />
        <span
          className={`max-w-[6rem] truncate rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-md landscape-phone:max-w-[5rem] landscape-phone:px-1.5 landscape-phone:py-0.5 landscape-phone:text-[10px] ${
            isWinner && (isCollecting || isAwaitingCollect)
              ? "bg-gold-500 text-felt-900"
              : "bg-black/70 text-white/90 ring-1 ring-white/20"
          }`}
        >
          {playerName}
        </span>
      </div>
    </div>
  );
}

export function TrickArea({ state, mySeat, collecting = false }: TrickAreaProps) {
  const layoutScale = useTrickLayoutScale();

  const isAwaitingCollect = state.awaitingTrickCollect !== null;
  const isCollecting = collecting || !!state.completedTrickDisplay;
  const displayPlays: TrickPlay[] = state.completedTrickDisplay
    ? state.completedTrickDisplay.plays
    : state.currentTrick;

  const winnerSeat =
    state.completedTrickDisplay?.winnerSeat ?? state.awaitingTrickCollect ?? null;
  const winnerName = winnerSeat !== null ? getPlayerName(state, winnerSeat) : null;
  const winnerRelative = winnerSeat !== null ? relativeSeat(winnerSeat, mySeat) : 0;

  return (
    <div className="trick-zone mx-auto px-1">
      <div className="trick-zone-inner relative mx-auto w-full">
        <div className="absolute inset-[6%] rounded-[1.15rem] border-[3px] border-gold-500/55 bg-gradient-to-b from-felt-700/90 to-felt-900 shadow-[inset_0_6px_28px_rgba(0,0,0,0.45),0_0_28px_rgba(232,197,71,0.12)] portrait-phone:inset-[5%] landscape-phone:inset-[4%]" />
        <div className="absolute inset-[11%] rounded-[0.85rem] border border-gold-500/20 portrait-phone:inset-[9%] landscape-phone:inset-[8%]" />

        {displayPlays.length === 0 && !isCollecting && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-white/25 portrait-phone:text-[10px] landscape-phone:text-[9px]">
            אזור הלקיחה
          </p>
        )}

        {displayPlays.map((play, i) => {
          const key = `${play.seatIndex}-${play.card.id}`;
          return (
            <TrickCard
              key={key}
              play={play}
              mySeat={mySeat}
              playerName={getPlayerName(state, play.seatIndex)}
              isCollecting={isCollecting}
              isAwaitingCollect={isAwaitingCollect}
              isWinner={winnerSeat === play.seatIndex}
              winnerRelative={winnerRelative}
              zIndex={10 + i}
              layoutScale={layoutScale}
            />
          );
        })}

        {isCollecting && winnerName && (
          <div className="trick-winner-banner absolute bottom-1 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gold-400/50 bg-gold-500/90 px-3 py-1 text-xs font-bold text-felt-900 shadow-lg shadow-gold-500/30 landscape-phone:bottom-0 landscape-phone:px-2.5 landscape-phone:py-0.5 landscape-phone:text-[11px]">
            🏆 {winnerName} לקח/ה
          </div>
        )}

        {isAwaitingCollect && winnerName && !isCollecting && (
          <div className="absolute bottom-1 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gold-400/30 bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold text-gold-300 backdrop-blur-sm landscape-phone:bottom-0 landscape-phone:text-[10px]">
            {winnerName} זוכה בלקיחה
          </div>
        )}

        {state.contractBid && (
          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center opacity-[0.12]">
            {state.contractBid.trump === "NT" ? (
              <span className="text-4xl font-black tracking-tight text-gold-300 landscape-phone:text-3xl">NT</span>
            ) : (
              <span
                className={`text-6xl landscape-phone:text-5xl ${
                  state.contractBid.trump === "hearts" || state.contractBid.trump === "diamonds"
                    ? "text-[#c41e3a]"
                    : "text-black"
                }`}
              >
                {state.contractBid.trump === "spades"
                  ? "♠"
                  : state.contractBid.trump === "hearts"
                    ? "♥"
                    : state.contractBid.trump === "diamonds"
                      ? "♦"
                      : "♣"}
              </span>
            )}
          </div>
        )}
      </div>

      {state.currentTrick.length > 0 && !isCollecting && !isAwaitingCollect && (
        <p className="mt-0.5 text-center text-[10px] text-white/40 portrait-phone:hidden landscape-phone:hidden">
          {state.currentTrick.length}/4 קלפים בלקיחה
        </p>
      )}
    </div>
  );
}

interface PlayerHandProps {
  hand: Card[];
  legalCardIds: Set<string>;
  selectedCardId?: string | null;
  selectedCardIds?: string[];
  onSelectCard?: (cardId: string) => void;
  onToggleCard?: (cardId: string) => void;
  onPlayCard?: (cardId: string) => void;
  canPlay: boolean;
}

export function PlayerHand({
  hand,
  legalCardIds,
  selectedCardId = null,
  selectedCardIds,
  onSelectCard,
  onToggleCard,
  onPlayCard,
  canPlay,
}: PlayerHandProps) {
  const cards = sortHand(hand);
  const count = cards.length;
  const multiSelected = new Set(selectedCardIds ?? []);
  const { ref, style, spread } = useHandFanLayout(count);

  return (
    <div ref={ref} className="game-hand-dock-hand w-full min-w-0" style={style}>
      <div
        className={`game-hand-fan game-hand-fan--bbo game-hand-fan--slots ${spread ? "is-spread" : ""}`}
      >
        {cards.map((card, index) => {
          const isLegal = legalCardIds.has(card.id);
          const isSelected = selectedCardIds
            ? multiSelected.has(card.id)
            : selectedCardId === card.id;
          const isUnplayable = onToggleCard ? !isLegal : canPlay && !isLegal;
          const isLast = index === cards.length - 1;

          function handlePick() {
            if (onToggleCard) {
              if (!isUnplayable || isSelected) onToggleCard(card.id);
              return;
            }
            if (canPlay && isLegal && onPlayCard) {
              onPlayCard(card.id);
              return;
            }
            if (!isUnplayable && onSelectCard) {
              onSelectCard(card.id);
            }
          }

          return (
            <div
              key={card.id}
              className={`hand-slot ${isLast ? "is-last" : ""} ${isSelected ? "is-selected" : ""} ${isUnplayable ? "is-disabled" : ""}`}
              style={{ zIndex: isSelected ? 50 : index + 1 }}
              role="button"
              tabIndex={isUnplayable && !isSelected ? -1 : 0}
              aria-label={`${card.rank} ${card.suit}`}
              aria-pressed={isSelected}
              onClick={handlePick}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handlePick();
                }
              }}
            >
              <PlayingCard
                card={card}
                size="hand"
                elevated
                selected={isSelected}
                disabled={isUnplayable && !isSelected}
                playable={canPlay && isLegal}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function getMySeat(state: GameState, humanPlayerId: string): number {
  return state.players.find((p) => p.id === humanPlayerId)?.seatIndex ?? 0;
}

export { relativeSeat as getRelativeSeat };
