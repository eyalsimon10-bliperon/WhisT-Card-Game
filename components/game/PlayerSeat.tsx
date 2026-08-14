"use client";

import type { GamePlayer, GameState, Trump } from "@/lib/game/types";
import { SUIT_SYMBOL } from "@/lib/game/types";
import { getRelativeSeat } from "@/lib/game/engine";
import { getBidProgress } from "@/lib/game/bidding";

interface PlayerHudProps {
  player: GamePlayer;
  state: GameState;
  isActive: boolean;
  isMe?: boolean;
  compact?: boolean;
}

function TrumpIcon({ trump, size = "md" }: { trump: Trump; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-9 w-9 text-2xl" : size === "md" ? "h-7 w-7 text-lg" : "h-5 w-5 text-sm";
  const isRed = trump === "hearts" || trump === "diamonds";

  if (trump === "NT") {
    return (
      <span
        className={`inline-flex ${sizeClass} items-center justify-center rounded-lg border border-white/20 bg-gradient-to-br from-slate-600/80 to-slate-800/90 text-[10px] font-black tracking-tight text-white shadow-inner`}
        aria-label="NT"
      >
        NT
      </span>
    );
  }

  return (
    <span
      className={`inline-flex ${sizeClass} items-center justify-center rounded-lg border border-white/15 bg-white/10 font-bold shadow-inner ${
        isRed ? "text-red-400" : "text-white"
      }`}
      aria-hidden
    >
      {SUIT_SYMBOL[trump]}
    </span>
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

function OpponentChip({
  player,
  state,
  isActive,
}: {
  player: GamePlayer;
  state: GameState;
  isActive: boolean;
}) {
  const trickBid = state.trickBids[player.seatIndex];
  const showStats =
    state.phase === "playing" ||
    (state.phase === "bidding_tricks" && trickBid !== null && trickBid !== undefined);
  const progress = state.phase === "playing" ? getBidProgress(player.tricksWon, trickBid) : null;
  const bidTone =
    progress === "made"
      ? "text-emerald-300"
      : progress === "overbid"
        ? "text-rose-300"
        : "text-gold-300";

  return (
    <div
      className={`flex max-w-[8.75rem] items-center gap-1.5 rounded-full border px-2 py-1 backdrop-blur-md landscape-phone:max-w-[7.75rem] landscape-phone:gap-1 landscape-phone:px-1.5 landscape-phone:py-0.5 ${
        isActive
          ? "border-gold-400/60 bg-gold-500/20 shadow-sm shadow-gold-500/20"
          : "border-white/10 bg-black/55"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold landscape-phone:h-6 landscape-phone:w-6 landscape-phone:text-[10px] ${
          isActive ? "bg-gold-500 text-felt-900" : "bg-white/10 text-white/80"
        }`}
      >
        {player.name.charAt(0)}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white landscape-phone:text-[11px]">
        {player.name}
      </span>
      {showStats && trickBid !== null && trickBid !== undefined ? (
        <span className={`shrink-0 tabular-nums text-[11px] font-bold landscape-phone:text-[10px] ${bidTone}`}>
          {player.tricksWon}/{trickBid}
        </span>
      ) : (
        <span className="shrink-0 text-[11px] text-white/50 landscape-phone:text-[10px]">🃏{player.hand.length}</span>
      )}
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
                {showTrump && state.trump && <TrumpIcon trump={state.trump} size="sm" />}
              </div>
            )}
          </div>

          {showTrump && state.trump && !isMe && (
            <TrumpIcon trump={state.trump} size={compact ? "sm" : "md"} />
          )}
          {showTrump && state.trump && isMe && (
            <div className="portrait-phone:hidden landscape-phone:hidden">
              <TrumpIcon trump={state.trump} size={compact ? "sm" : "md"} />
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

interface PlayerSeatProps {
  player: GamePlayer;
  state: GameState;
  position: "top" | "left" | "right";
  isActive: boolean;
}

const positionClasses = {
  top: "top-0 left-1/2 -translate-x-1/2 portrait-phone:top-0 landscape-phone:top-0",
  left: "left-0 top-[3.75rem] portrait-phone:left-0 portrait-phone:top-[3.25rem] landscape-phone:left-0.5 landscape-phone:top-1/2 landscape-phone:-translate-y-1/2",
  right: "right-0 top-[3.75rem] portrait-phone:right-0 portrait-phone:top-[3.25rem] landscape-phone:right-0.5 landscape-phone:top-1/2 landscape-phone:-translate-y-1/2",
};

export function PlayerSeat({ player, state, position, isActive }: PlayerSeatProps) {
  return (
    <div className={`absolute ${positionClasses[position]} transition-transform duration-300`}>
      <div className="hidden portrait-phone:block landscape-phone:block">
        <OpponentChip player={player} state={state} isActive={isActive} />
      </div>
      <div className="portrait-phone:hidden landscape-phone:hidden">
        <PlayerHud player={player} state={state} isActive={isActive} compact />
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
        <div
          className={`game-hud-slim ${isActive ? "border-gold-400/50 bg-gold-500/10" : ""}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold landscape-phone:h-6 landscape-phone:w-6 landscape-phone:text-[11px] ${
                isActive ? "bg-gold-500 text-felt-900" : "bg-white/10 text-white/80"
              }`}
            >
              {player.name.charAt(0)}
            </span>
            <span className="truncate text-sm font-semibold text-white landscape-phone:text-xs">את/ה</span>
            {isActive && (
              <span className="rounded-md bg-gold-500/25 px-1.5 py-0.5 text-[10px] font-bold text-gold-300">
                תור
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <StatPill label="הכרזה" value={trickBid ?? "—"} micro />
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
            {showTrump && state.trump && <TrumpIcon trump={state.trump} size="sm" />}
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

export function OpponentSeats({
  state,
  mySeat,
}: {
  state: GameState;
  mySeat: number;
}) {
  const positions: Array<{ offset: number; pos: "top" | "left" | "right" }> = [
    { offset: 1, pos: "right" },
    { offset: 2, pos: "top" },
    { offset: 3, pos: "left" },
  ];

  return (
    <>
      {positions.map(({ offset, pos }) => {
        const seatIndex = getRelativeSeat(offset, mySeat);
        const player = state.players.find((p) => p.seatIndex === seatIndex);
        if (!player || player.seatIndex === mySeat) return null;

        return (
          <PlayerSeat
            key={seatIndex}
            player={player}
            state={state}
            position={pos}
            isActive={state.currentPlayerIndex === seatIndex}
          />
        );
      })}
    </>
  );
}

export { TrumpIcon };
