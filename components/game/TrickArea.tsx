"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { PlayingCard } from "@/components/PlayingCard";
import { scalePx, useTrickLayoutScale } from "@/lib/hooks/useTrickLayoutScale";
import type { Card, TrickPlay } from "@/lib/game/types";
import type { GameState } from "@/lib/game/types";

interface TrickAreaProps {
  state: GameState;
  mySeat: number;
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
  isNew: boolean;
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
  isNew,
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

  return (
    <div
      className={`absolute left-1/2 top-1/2 ${isNew ? "trick-card-play" : ""} ${isCollecting ? "trick-card-collect" : ""} ${isWinner && isCollecting ? "trick-card-winner" : ""} ${isWinner && isAwaitingCollect ? "trick-card-pending-winner" : ""}`}
      style={{
        zIndex: isWinner ? 50 : zIndex,
        ["--from-x" as string]: scalePx(parseInt(flyFrom.x, 10), layoutScale),
        ["--from-y" as string]: scalePx(parseInt(flyFrom.y, 10), layoutScale),
        ["--to-x" as string]: scalePx(parseInt(collectTo.x, 10), layoutScale),
        ["--to-y" as string]: scalePx(parseInt(collectTo.y, 10), layoutScale),
        ["--layout-x" as string]: layoutX,
        ["--layout-y" as string]: layoutY,
        ["--layout-rotate" as string]: `${layout.rotate}deg`,
        transform:
          isCollecting || isNew
            ? undefined
            : `translate(calc(-50% + ${layoutX}), calc(-50% + ${layoutY})) rotate(${layout.rotate}deg)`,
      }}
    >
      <div className="flex flex-col items-center gap-0.5 landscape-phone:gap-0">
        <PlayingCard card={play.card} size="table" elevated />
        <span
          className={`max-w-[5.5rem] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-md landscape-phone:max-w-[4rem] landscape-phone:px-1.5 landscape-phone:py-0 landscape-phone:text-[9px] ${
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

export function TrickArea({ state, mySeat }: TrickAreaProps) {
  const layoutScale = useTrickLayoutScale();
  const prevTrickLen = useRef(0);
  const newCardKey = useRef<string | null>(null);

  const isCollecting = !!state.completedTrickDisplay;
  const isAwaitingCollect = state.awaitingTrickCollect !== null;
  const displayPlays: TrickPlay[] = isCollecting
    ? state.completedTrickDisplay!.plays
    : state.currentTrick;

  const winnerSeat =
    state.completedTrickDisplay?.winnerSeat ?? state.awaitingTrickCollect ?? null;
  const winnerName = winnerSeat !== null ? getPlayerName(state, winnerSeat) : null;
  const winnerRelative = winnerSeat !== null ? relativeSeat(winnerSeat, mySeat) : 0;

  useEffect(() => {
    if (!isCollecting && state.currentTrick.length > prevTrickLen.current) {
      const latest = state.currentTrick[state.currentTrick.length - 1];
      newCardKey.current = `${latest.seatIndex}-${latest.card.id}`;
      const timer = setTimeout(() => {
        newCardKey.current = null;
      }, 500);
      prevTrickLen.current = state.currentTrick.length;
      return () => clearTimeout(timer);
    }
    if (isCollecting) {
      prevTrickLen.current = 0;
    } else {
      prevTrickLen.current = state.currentTrick.length;
    }
  }, [state.currentTrick, isCollecting]);

  return (
    <div className="trick-zone mx-auto px-1">
      <div className="trick-zone-inner relative mx-auto w-full">
        <div className="absolute inset-1.5 rounded-[45%] border-2 border-gold-500/25 bg-gradient-to-b from-felt-700/80 to-felt-900/90 shadow-[inset_0_4px_24px_rgba(0,0,0,0.5),0_0_40px_rgba(232,197,71,0.08)] portrait-phone:inset-1 landscape-phone:inset-0.5" />
        <div className="absolute inset-4 rounded-[45%] border border-white/5 portrait-phone:inset-2.5 landscape-phone:inset-2" />

        {displayPlays.length === 0 && !isCollecting && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-white/25 portrait-phone:text-[10px] landscape-phone:text-[9px]">
            אזור הלקיחה
          </p>
        )}

        {displayPlays.map((play, i) => {
          const key = `${play.seatIndex}-${play.card.id}`;
          const isNew = key === newCardKey.current;
          return (
            <TrickCard
              key={key}
              play={play}
              mySeat={mySeat}
              playerName={getPlayerName(state, play.seatIndex)}
              isNew={isNew}
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
          <div className="trick-winner-banner absolute bottom-1 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gold-400/50 bg-gold-500/90 px-3 py-1 text-[10px] font-bold text-felt-900 shadow-lg shadow-gold-500/30 landscape-phone:bottom-0 landscape-phone:px-2 landscape-phone:py-0.5 landscape-phone:text-[9px]">
            🏆 {winnerName} לקח/ה
          </div>
        )}

        {isAwaitingCollect && winnerName && !isCollecting && (
          <div className="absolute bottom-1 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gold-400/30 bg-black/60 px-2.5 py-0.5 text-[9px] font-semibold text-gold-300 backdrop-blur-sm landscape-phone:bottom-0 landscape-phone:text-[8px]">
            {winnerName} זוכה בלקיחה
          </div>
        )}

        {state.contractBid && (
          <div className="absolute top-1 left-1/2 z-[5] -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-2.5 py-0.5 text-[9px] text-gold-300 backdrop-blur-sm landscape-phone:top-0 landscape-phone:text-[8px]">
            {state.contractBid.tricks}{" "}
            {state.contractBid.trump === "NT" ? "NT" : state.contractBid.trump}
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
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onPlayCard?: (cardId: string) => void;
  canPlay: boolean;
}

export function PlayerHand({
  hand,
  legalCardIds,
  selectedCardId,
  onSelectCard,
  onPlayCard,
  canPlay,
}: PlayerHandProps) {
  const count = hand.length;

  return (
    <div className="game-hand-dock-hand w-full overflow-hidden">
      <div
        className="game-hand-fan touch-scroll-x px-0.5 py-0.5"
        style={
          {
            // Slightly widen visible strip when few cards; tighten when many
            ["--hand-visible-strip" as string]:
              count <= 6
                ? "max(1.55rem, calc(var(--card-hand-w) * 0.5))"
                : count <= 10
                  ? "max(1.4rem, calc(var(--card-hand-w) * 0.44))"
                  : "max(1.35rem, calc(var(--card-hand-w) * 0.42))",
          } as CSSProperties
        }
      >
        {hand.map((card, index) => {
          const isLegal = legalCardIds.has(card.id);
          const isSelected = selectedCardId === card.id;
          const isUnplayable = canPlay && !isLegal;

          return (
            <div
              key={card.id}
              className="relative shrink-0"
              style={{ zIndex: isSelected ? 50 : index + 1 }}
            >
              <PlayingCard
                card={card}
                size="hand"
                elevated
                selected={isSelected}
                disabled={isUnplayable}
                playable={canPlay && isLegal}
                onClick={() => {
                  if (canPlay && isLegal && onPlayCard) {
                    onPlayCard(card.id);
                  } else if (!isUnplayable) {
                    onSelectCard(card.id);
                  }
                }}
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
