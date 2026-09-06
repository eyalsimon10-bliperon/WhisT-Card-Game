"use client";

import type { ReactNode } from "react";

import { BidMark } from "@/components/game/BidMark";
import { getBidProgress } from "@/lib/game/bidding";
import { getRelativeSeat } from "@/lib/game/engine";
import type { GamePlayer, GameState, Trump } from "@/lib/game/types";
import { SUIT_SYMBOL } from "@/lib/game/types";

interface PlayerHudProps {
  player: GamePlayer;
  state: GameState;
  isActive: boolean;
  isMe?: boolean;
  compact?: boolean;
}

function TrumpTile({ trump, size = "md" }: { trump: Trump; size?: "md" | "lg" }) {
  const isRed = trump === "hearts" || trump === "diamonds";

  return (
    <div className={`trump-tile is-${size}`} title={trump === "NT" ? "ללא שליט" : trump}>
      {trump === "NT" ? (
        <span className="trump-tile-nt" dir="ltr">NT</span>
      ) : (
        <span className={`trump-tile-suit ${isRed ? "is-red" : "is-black"}`}>{SUIT_SYMBOL[trump]}</span>
      )}
      <span className="trump-tile-label">שליט</span>
    </div>
  );
}

function StatPill({
  label,
  value,
  highlight,
  warn,
  tone,
  micro,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  warn?: boolean;
  tone?: "made" | "overbid" | "short";
  micro?: boolean;
}) {
  const box =
    tone === "made"
      ? "bg-emerald-500/15 ring-1 ring-emerald-400/40"
      : tone === "overbid"
        ? "bg-rose-500/15 ring-1 ring-rose-400/40"
        : tone === "short"
          ? "bg-amber-500/15 ring-1 ring-amber-400/30"
          : highlight
            ? "bg-gold-500/20 ring-1 ring-gold-400/40"
            : warn
              ? "bg-amber-500/15 ring-1 ring-amber-400/30"
              : "bg-black/30 ring-1 ring-white/10";
  const text =
    tone === "made"
      ? "text-emerald-300"
      : tone === "overbid"
        ? "text-rose-300"
        : tone === "short"
          ? "text-amber-300"
          : highlight
            ? "text-gold-300"
            : warn
              ? "text-amber-300"
              : "text-white";

  return (
    <div
      className={`flex flex-col items-center rounded-md px-2 py-0.5 portrait-phone:px-1.5 portrait-phone:py-0.5 landscape-phone:px-1.5 landscape-phone:py-0.5 ${box}`}
    >
      <span className={`font-medium uppercase tracking-wider text-white/50 ${micro ? "text-[8px]" : "text-[9px]"}`}>
        {label}
      </span>
      <span className={`font-bold tabular-nums leading-none ${micro ? "text-sm" : "text-base"} ${text}`}>
        {value}
      </span>
    </div>
  );
}

function OpponentPlaque({
  player,
  state,
  isActive,
}: {
  player: GamePlayer;
  state: GameState;
  isActive: boolean;
}) {
  const trickBid = state.trickBids[player.seatIndex];
  const call = state.lastContractCalls?.[player.seatIndex] ?? null;
  const progress = state.phase === "playing" ? getBidProgress(player.tricksWon, trickBid) : null;
  const bidTone =
    progress === "made"
      ? "is-made"
      : progress === "overbid"
        ? "is-over"
        : "";
  const isContractWinner = state.contractWinnerIndex === player.seatIndex;

  return (
    <div className={`seat-plaque ${isActive ? "is-turn" : ""} ${isContractWinner ? "is-declarer" : ""}`}>
      <p className="seat-plaque-name">{player.name}</p>
      {state.phase === "playing" && trickBid !== null && trickBid !== undefined ? (
        <p className={`seat-plaque-tricks ${bidTone}`}>
          <span className="seat-plaque-tricks-num">
            {player.tricksWon}/{trickBid}
          </span>
          <span className="seat-plaque-tricks-label">לקיחות</span>
        </p>
      ) : call?.type === "bid" ? (
        <BidMark bid={call.bid} size="sm" />
      ) : call?.type === "pass" ? (
        <span className="pass-mark is-sm">PASS</span>
      ) : trickBid !== null && trickBid !== undefined ? (
        <p className="seat-plaque-tricks">
          <span className="seat-plaque-tricks-num">{trickBid}</span>
          <span className="seat-plaque-tricks-label">הכרזה</span>
        </p>
      ) : (
        <p className="seat-plaque-waiting">{isActive ? "תור" : "—"}</p>
      )}
      {isActive && <span className="seat-plaque-turn">תור</span>}
    </div>
  );
}

export function PlayerHud({ player, state, isActive, isMe, compact }: PlayerHudProps) {
  const trickBid = state.trickBids[player.seatIndex];
  const showTrump =
    (state.phase === "playing" || state.phase === "bidding_tricks") && state.trump;
  const showStats =
    state.phase === "playing" ||
    (state.phase === "bidding_tricks" && trickBid !== null && trickBid !== undefined);
  const isContractWinner = state.contractWinnerIndex === player.seatIndex;
  const bidProgress =
    trickBid !== null && trickBid !== undefined && state.phase === "playing"
      ? getBidProgress(player.tricksWon, trickBid)
      : undefined;
  const bidTone = bidProgress === "short" ? undefined : bidProgress ?? undefined;

  return (
    <div
      className={`relative transition-all duration-300 ${
        isActive ? "scale-[1.03] z-20 portrait-phone:scale-100 landscape-phone:scale-100" : "z-10"
      } w-full max-w-[11rem] portrait-phone:max-w-none landscape-phone:max-w-none ${
        isMe ? "portrait-phone:mx-auto portrait-phone:max-w-[20rem] landscape-phone:mx-auto landscape-phone:max-w-[22rem]" : "portrait-phone:max-w-[8.75rem] landscape-phone:max-w-[7.75rem]"
      }`}
    >
      {isActive && (
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-gold-500/40 via-gold-400/20 to-gold-500/40 blur-sm" />
      )}

      <div
        className={`relative overflow-hidden rounded-2xl border backdrop-blur-md ${
          isActive
            ? "border-gold-400/50 bg-gradient-to-br from-felt-800/95 to-felt-900/95 shadow-lg shadow-gold-500/15"
            : isMe
              ? "border-gold-500/25 bg-gradient-to-br from-felt-800/90 to-black/80"
              : "border-white/10 bg-gradient-to-br from-black/60 to-felt-900/80"
        }`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent ${
            isMe ? "portrait-phone:hidden landscape-phone:hidden" : ""
          }`}
        />

        <div
          className={`flex items-start gap-1.5 p-2 landscape-phone:gap-1 landscape-phone:p-1.5 portrait-phone:gap-1 portrait-phone:p-1.5 ${
            isMe
              ? "portrait-phone:flex-row portrait-phone:items-center portrait-phone:gap-2 portrait-phone:py-1 portrait-phone:px-2 landscape-phone:flex-row landscape-phone:items-center landscape-phone:gap-2 landscape-phone:py-1 landscape-phone:px-2"
              : ""
          }`}
        >
          <div className="relative shrink-0">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold portrait-phone:h-7 portrait-phone:w-7 portrait-phone:text-xs landscape-phone:h-7 landscape-phone:w-7 landscape-phone:text-xs ${
                isActive
                  ? "bg-gold-500 text-felt-900 shadow-md shadow-gold-500/30"
                  : isMe
                    ? "bg-gold-500/25 text-gold-200 ring-1 ring-gold-400/30"
                    : "bg-white/10 text-white/80 ring-1 ring-white/10"
              }`}
            >
              {player.name.charAt(0)}
            </div>
            {isContractWinner && state.phase !== "bidding_contract" && (
              <span
                className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[8px] font-black text-felt-900 shadow"
                title="זוכה החוזה"
              >
                ★
              </span>
            )}
          </div>

          <div
            className={`min-w-0 flex-1 ${
              isMe
                ? "portrait-phone:flex portrait-phone:items-center portrait-phone:justify-between portrait-phone:gap-2 landscape-phone:flex landscape-phone:items-center landscape-phone:justify-between landscape-phone:gap-2"
                : ""
            }`}
          >
            <div className={isMe ? "portrait-phone:min-w-0 landscape-phone:min-w-0" : ""}>
              <p className="truncate text-sm font-bold text-white portrait-phone:text-xs landscape-phone:text-xs">
                {isMe ? "את/ה" : player.name}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 portrait-phone:mt-0 portrait-phone:gap-1 landscape-phone:mt-0 landscape-phone:gap-1">
                <span className="inline-flex items-center gap-0.5 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-white/55 landscape-phone:text-[10px]">
                  <span aria-hidden>🃏</span>
                  <span className="tabular-nums font-semibold text-white/75">{player.hand.length}</span>
                </span>
                {isActive && (
                  <span className="rounded-md bg-gold-500/25 px-1.5 py-0.5 text-[10px] font-bold text-gold-300 animate-pulse">
                    תור
                  </span>
                )}
              </div>
            </div>

            {isMe && showStats && (
              <div className="hidden items-center gap-1.5 portrait-phone:flex landscape-phone:flex">
                <StatPill
                  label="הכרזה"
                  value={trickBid ?? "—"}
                  highlight={isContractWinner}
                  micro
                />
                <StatPill
                  label="לקיחות"
                  value={
                    trickBid !== null && trickBid !== undefined
                      ? `${player.tricksWon}/${trickBid}`
                      : player.tricksWon
                  }
                  tone={bidTone}
                  micro
                />
                {showTrump && state.trump && <TrumpTile trump={state.trump} size="md" />}
              </div>
            )}
          </div>

          {showTrump && state.trump && !isMe && (
            <TrumpTile trump={state.trump} size="md" />
          )}
          {showTrump && state.trump && isMe && (
            <div className="portrait-phone:hidden landscape-phone:hidden">
              <TrumpTile trump={state.trump} size="md" />
            </div>
          )}
        </div>

        {(showStats || (trickBid !== null && trickBid !== undefined)) && (
          <div
            className={`grid grid-cols-2 gap-1 border-t border-white/5 px-2 py-1.5 landscape-phone:gap-0.5 landscape-phone:px-1.5 landscape-phone:py-1 portrait-phone:gap-0.5 portrait-phone:px-1.5 portrait-phone:py-1 ${
              isMe ? "portrait-phone:hidden landscape-phone:hidden" : ""
            }`}
          >
            <StatPill
              label="הכרזה"
              value={trickBid ?? "—"}
              highlight={isContractWinner}
            />
            <StatPill
              label="לקיחות"
              value={
                trickBid !== null && trickBid !== undefined
                  ? `${player.tricksWon}/${trickBid}`
                  : player.tricksWon
              }
              tone={bidTone}
            />
          </div>
        )}

        {state.phase === "playing" && trickBid !== null && trickBid !== undefined && (
          <div
            className={`px-2.5 pb-2 portrait-phone:hidden landscape-phone:hidden ${
              isMe ? "" : "landscape-phone:px-1.5 landscape-phone:pb-1"
            }`}
          >
            <div className="h-1 overflow-hidden rounded-full bg-black/40">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  bidProgress === "overbid"
                    ? "bg-rose-400"
                    : bidProgress === "made"
                      ? "bg-emerald-400"
                      : "bg-gold-500"
                }`}
                style={{ width: `${Math.min(100, (player.tricksWon / Math.max(trickBid, 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function HumanPlayerHud({
  player,
  state,
  isActive,
}: {
  player: GamePlayer;
  state: GameState;
  isActive: boolean;
}) {
  const trickBid = state.trickBids[player.seatIndex];
  const showTrump = state.phase === "playing" && state.trump;
  const bidProgress = getBidProgress(player.tricksWon, trickBid);
  const bidTone = bidProgress === "short" || bidProgress === null ? undefined : bidProgress;

  if (state.phase === "playing") {
    return (
      <div className="px-0.5 pb-0.5 portrait-phone:px-0 landscape-phone:px-0">
        <div className={`game-hud-bar ${isActive ? "is-turn" : ""}`}>
          <div className="game-hud-bar-who">
            <span className="game-hud-bar-name">את/ה</span>
            {isActive && <span className="game-hud-bar-turn">התור שלך</span>}
          </div>
          <div className="game-hud-bar-stats">
            <div className="game-hud-stat">
              <span className="game-hud-stat-label">הכרזה</span>
              <span className="game-hud-stat-value">{trickBid ?? "—"}</span>
            </div>
            <div className={`game-hud-stat ${bidTone ? `is-${bidTone}` : ""}`}>
              <span className="game-hud-stat-label">לקיחות</span>
              <span className="game-hud-stat-value">
                {trickBid !== null && trickBid !== undefined
                  ? `${player.tricksWon}/${trickBid}`
                  : player.tricksWon}
              </span>
            </div>
            {showTrump && state.trump && <TrumpTile trump={state.trump} size="lg" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-0.5 portrait-phone:px-0 landscape-phone:px-0">
      <PlayerHud player={player} state={state} isActive={isActive} isMe />
    </div>
  );
}

export function PlayField({
  state,
  mySeat,
  children,
}: {
  state: GameState;
  mySeat: number;
  children: ReactNode;
}) {
  const positions: Array<{ offset: number; area: "top" | "left" | "right" }> = [
    { offset: 2, area: "top" },
    { offset: 3, area: "left" },
    { offset: 1, area: "right" },
  ];

  return (
    <div className="play-field" dir="ltr">
      {positions.map(({ offset, area }) => {
        const seatIndex = getRelativeSeat(offset, mySeat);
        const player = state.players.find((p) => p.seatIndex === seatIndex);
        if (!player) return null;
        return (
          <div key={area} className={`play-seat is-${area}`}>
            <OpponentPlaque
              player={player}
              state={state}
              isActive={state.currentPlayerIndex === seatIndex}
            />
          </div>
        );
      })}
      <div className="play-felt">{children}</div>
    </div>
  );
}

export { TrumpTile };
