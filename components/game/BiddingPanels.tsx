"use client";

import { useEffect, useState } from "react";
import { PlayingCard } from "@/components/PlayingCard";
import { sortHand } from "@/lib/game/cards";
import {
  formatContractBid,
  isContractBidLegal,
  isContractConfirmLegal,
} from "@/lib/game/bidding";
import type { ContractBid, ContractSeatDisplay, GameState, Trump } from "@/lib/game/types";
import { SUIT_LABEL, SUIT_SYMBOL } from "@/lib/game/types";

function getContractSeatDisplay(state: GameState, seatIndex: number): ContractSeatDisplay {
  if (
    state.contractConfirmPending &&
    seatIndex === state.highBidderIndex &&
    state.currentPlayerIndex === seatIndex
  ) {
    return "confirm";
  }
  if (state.phase === "bidding_contract" && state.currentPlayerIndex === seatIndex) {
    return "thinking";
  }
  if (state.contractPassSeats.includes(seatIndex)) {
    return "pass";
  }
  if (state.highBidderIndex === seatIndex && state.currentHighBid) {
    return "bid";
  }
  return "waiting";
}

function trumpBadge(trump: Trump): string {
  if (trump === "NT") return "NT";
  return SUIT_SYMBOL[trump];
}

interface ContractBiddingTrackerProps {
  state: GameState;
  mySeat: number;
}

export function ContractBiddingTracker({ state, mySeat }: ContractBiddingTrackerProps) {
  const seats = [0, 1, 2, 3].map((offset) => (mySeat + offset) % 4);
  const seatLabels = ["את/ה", "ימין", "מול", "שמאל"];

  return (
    <div className="shrink-0 px-0.5 landscape-phone:mb-0 portrait-phone:mb-1.5 mb-1.5">
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-white/40 portrait-phone:hidden landscape-phone:hidden">
        מעקב הכרזות
      </p>
      <div className="grid grid-cols-4 gap-1.5 landscape-phone:gap-1 portrait-phone:gap-1.5">
        {seats.map((seatIndex, i) => {
          const player = state.players.find((p) => p.seatIndex === seatIndex);
          if (!player) return null;

          const display = getContractSeatDisplay(state, seatIndex);
          const isMe = seatIndex === mySeat;

          return (
            <div
              key={seatIndex}
              className={`relative flex flex-col items-center rounded-xl border px-1.5 py-2 transition-all duration-300 portrait-phone:rounded-xl portrait-phone:px-1 portrait-phone:py-1.5 landscape-phone:rounded-lg landscape-phone:px-1 landscape-phone:py-1 ${
                display === "thinking" || display === "confirm"
                  ? "border-gold-400/70 bg-gold-500/15 shadow-lg shadow-gold-500/20"
                  : display === "pass"
                    ? "border-white/10 bg-white/5"
                    : display === "bid"
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-white/5 bg-black/20"
              }`}
            >
              {(display === "thinking" || display === "confirm") && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-1.5 py-0.5 text-[9px] font-bold text-felt-900 landscape-phone:-top-1 landscape-phone:text-[8px]">
                  {display === "confirm" ? "אישור" : "תור"}
                </span>
              )}

              <div
                className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold portrait-phone:mb-0.5 portrait-phone:h-7 portrait-phone:w-7 portrait-phone:text-[11px] landscape-phone:mb-0.5 landscape-phone:h-6 landscape-phone:w-6 landscape-phone:text-[10px] ${
                  isMe ? "bg-gold-500/30 text-gold-200" : "bg-white/10 text-white/70"
                }`}
              >
                {player.name.charAt(0)}
              </div>

              <p className="max-w-full truncate text-[11px] font-semibold text-white/90 portrait-phone:text-[11px] landscape-phone:text-[10px]">
                {isMe ? "את/ה" : player.name}
              </p>
              <p className="text-[8px] text-white/30 portrait-phone:hidden landscape-phone:hidden">{seatLabels[i]}</p>

              <div className="mt-1 flex min-h-[1.25rem] items-center justify-center portrait-phone:mt-0.5 portrait-phone:min-h-[1.2rem] landscape-phone:mt-0.5 landscape-phone:min-h-[1.1rem]">
                {display === "pass" && (
                  <span className="contract-pass-badge rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold tracking-wide text-white/70 landscape-phone:text-[11px]">
                    PASS
                  </span>
                )}
                {display === "bid" && state.currentHighBid && (
                  <span className="text-center text-sm font-bold text-emerald-300 landscape-phone:text-xs">
                    {state.currentHighBid.tricks}
                    <span className="mx-0.5">{trumpBadge(state.currentHighBid.trump)}</span>
                  </span>
                )}
                {display === "confirm" && state.currentHighBid && (
                  <span className="text-center text-sm font-bold text-gold-300 landscape-phone:text-xs">
                    {state.currentHighBid.tricks}
                    <span className="mx-0.5">{trumpBadge(state.currentHighBid.trump)}</span>
                  </span>
                )}
                {display === "thinking" && (
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:300ms]" />
                  </span>
                )}
                {display === "waiting" && (
                  <span className="text-xs text-white/25">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {state.contractConfirmPending && state.currentHighBid && (
        <p className="mt-1.5 text-center text-[11px] text-gold-300/90 portrait-phone:text-[11px] landscape-phone:mt-1 landscape-phone:text-[10px]">
          3 PASS —{" "}
          <span className="font-semibold">
            {state.players.find((p) => p.seatIndex === state.highBidderIndex)?.name}
          </span>{" "}
          מאשר/ת את {formatContractBid(state.currentHighBid)}
        </p>
      )}
    </div>
  );
}

interface ContractBiddingPanelProps {
  state: GameState;
  isMyTurn: boolean;
  onBid: (bid: ContractBid) => void;
  onPass: () => void;
}

const TRUMP_OPTIONS: { trump: Trump; symbol: string; label: string; isRed?: boolean }[] = [
  { trump: "spades", symbol: SUIT_SYMBOL.spades, label: "עלה" },
  { trump: "hearts", symbol: SUIT_SYMBOL.hearts, label: "לב", isRed: true },
  { trump: "diamonds", symbol: SUIT_SYMBOL.diamonds, label: "יהלום", isRed: true },
  { trump: "clubs", symbol: SUIT_SYMBOL.clubs, label: "תלתן" },
  { trump: "NT", symbol: "NT", label: "ללא שליט" },
];

export function ContractBiddingPanel({
  state,
  isMyTurn,
  onBid,
  onPass,
}: ContractBiddingPanelProps) {
  const isConfirmPhase = state.contractConfirmPending;
  const confirmBase = state.currentHighBid;

  const [selectedTrump, setSelectedTrump] = useState<Trump | null>(
    isConfirmPhase && confirmBase ? confirmBase.trump : null
  );
  const [selectedTricks, setSelectedTricks] = useState<number | null>(
    isConfirmPhase && confirmBase ? confirmBase.tricks : null
  );

  const tricks = Array.from(
    { length: 13 - state.minContractTricks + 1 },
    (_, i) => state.minContractTricks + i
  );

  useEffect(() => {
    if (isConfirmPhase && state.currentHighBid) {
      setSelectedTrump(state.currentHighBid.trump);
      setSelectedTricks(state.currentHighBid.tricks);
      return;
    }
    setSelectedTrump(null);
    setSelectedTricks(null);
  }, [
    state.currentHighBid?.tricks,
    state.currentHighBid?.trump,
    state.minContractTricks,
    state.currentPlayerIndex,
    isConfirmPhase,
  ]);

  function isTrumpAvailable(trump: Trump): boolean {
    if (isConfirmPhase && confirmBase) {
      return tricks.some((t) => isContractConfirmLegal({ tricks: t, trump }, confirmBase));
    }
    return tricks.some((t) =>
      isContractBidLegal({ tricks: t, trump }, state.currentHighBid, state.minContractTricks)
    );
  }

  function isTricksAvailable(tricksCount: number): boolean {
    if (!selectedTrump) return false;
    const bid = { tricks: tricksCount, trump: selectedTrump };
    if (isConfirmPhase && confirmBase) {
      return isContractConfirmLegal(bid, confirmBase);
    }
    return isContractBidLegal(bid, state.currentHighBid, state.minContractTricks);
  }

  function handleConfirmBid() {
    if (selectedTrump && selectedTricks !== null) {
      onBid({ tricks: selectedTricks, trump: selectedTrump });
      if (!isConfirmPhase) {
        setSelectedTrump(null);
        setSelectedTricks(null);
      }
    }
  }

  const previewBid: ContractBid | null =
    selectedTrump && selectedTricks !== null
      ? { tricks: selectedTricks, trump: selectedTrump }
      : null;

  const canConfirm =
    previewBid !== null &&
    (isConfirmPhase && confirmBase
      ? isContractConfirmLegal(previewBid, confirmBase)
      : isContractBidLegal(previewBid, state.currentHighBid, state.minContractTricks));

  return (
    <div className="bid-panel">
      <div className="shrink-0 text-center">
        <p className="text-sm font-medium text-white/55 portrait-phone:text-xs landscape-phone:text-[11px]">
          חלק א&apos; — הכרזת חוזה ושליט
        </p>
        {isConfirmPhase ? (
          <p className="mt-1 text-sm font-semibold text-gold-300 portrait-phone:text-sm landscape-phone:text-xs">אישור חוזה סופי</p>
        ) : state.currentHighBid ? (
          <p className="mt-1 text-sm text-gold-300 portrait-phone:text-sm landscape-phone:text-xs">
            הכרזה גבוהה: {formatContractBid(state.currentHighBid)}
          </p>
        ) : (
          <p className="mt-1 text-sm text-white/60 portrait-phone:text-sm landscape-phone:text-xs">מינימום: {state.minContractTricks} לקיחות</p>
        )}
        {isConfirmPhase && confirmBase && (
          <p className="mt-1 text-[10px] text-white/50 portrait-phone:hidden landscape-phone:hidden">
            ניתן לאשר או לשנות שליט (לא פחות מ-{formatContractBid(confirmBase)})
          </p>
        )}
        {!isMyTurn && (
          <p className="mt-1 text-xs text-amber-300 animate-pulse portrait-phone:text-[11px] landscape-phone:text-[10px]">ממתין לשחקן אחר...</p>
        )}
      </div>

      {isMyTurn && (
        <>
          <div className="bid-panel-scroll">
            <div className="flex flex-col gap-4 portrait-phone:gap-5 landscape-phone:gap-2">
              <div className="shrink-0">
                <p className="mb-2 text-center text-sm font-medium text-white/70 portrait-phone:mb-2.5 portrait-phone:text-base landscape-phone:mb-1 landscape-phone:text-[11px]">
                  {isConfirmPhase ? "בחר שליט" : "בחר שליט"}
                </p>
                <div className="bid-trump-grid">
                  {TRUMP_OPTIONS.map(({ trump, symbol, label, isRed }) => {
                    const available = isTrumpAvailable(trump);
                    const selected = selectedTrump === trump;
                    return (
                      <button
                        key={trump}
                        type="button"
                        disabled={!available}
                        onClick={() => {
                          setSelectedTrump(trump);
                          setSelectedTricks(null);
                        }}
                        className={`bid-trump-btn ${
                          selected
                            ? "border-gold-400 bg-gold-500/25 shadow-md shadow-gold-500/20"
                            : available
                              ? "border-white/15 bg-white/10 hover:border-white/30"
                              : "cursor-not-allowed border-white/5 bg-white/5 opacity-30"
                        }`}
                      >
                        <span className={`bid-trump-symbol ${isRed ? "text-red-400" : "text-white"}`}>
                          {symbol}
                        </span>
                        <span className="mt-1 hidden text-[10px] text-white/70 sm:block">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedTrump && (
                <div className="shrink-0">
                  <p className="mb-2 text-center text-sm font-medium text-white/70 portrait-phone:mb-2.5 portrait-phone:text-base landscape-phone:mb-1 landscape-phone:text-[11px]">
                    בחר כמות לקיחות
                  </p>
                  <div className="bid-number-grid">
                    {tricks.map((t) => {
                      const available = isTricksAvailable(t);
                      const selected = selectedTricks === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={!available}
                          onClick={() => setSelectedTricks(t)}
                          className={`bid-number-btn ${
                            selected
                              ? "bg-gold-500 text-felt-900 shadow-md"
                              : available
                                ? "bg-white/10 text-white hover:bg-gold-500/30"
                                : "cursor-not-allowed bg-white/5 text-white/20 line-through"
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bid-panel-actions flex gap-2 landscape-phone:gap-1.5">
            <button
              type="button"
              className="btn-primary min-h-[3rem] flex-1 portrait-phone:min-h-[3.25rem] portrait-phone:text-base landscape-phone:min-h-9 landscape-phone:py-1.5 landscape-phone:text-sm"
              disabled={!canConfirm}
              onClick={handleConfirmBid}
            >
              {canConfirm && previewBid
                ? isConfirmPhase
                  ? `אשר ${formatContractBid(previewBid)}`
                  : `הכרז ${formatContractBid(previewBid)}`
                : isConfirmPhase
                  ? "אשר חוזה"
                  : "הכרז"}
            </button>
            {!isConfirmPhase && (
              <button
                type="button"
                className="btn-secondary min-h-[3rem] w-28 shrink-0 portrait-phone:min-h-[3.25rem] portrait-phone:w-32 portrait-phone:text-base landscape-phone:min-h-9 landscape-phone:w-[5.5rem] landscape-phone:px-2 landscape-phone:py-1.5 landscape-phone:text-sm"
                onClick={onPass}
              >
                PASS
              </button>
            )}
          </div>
        </>
      )}

      {state.bidLog.length > 0 && (
        <div className="max-h-16 overflow-y-auto rounded-lg bg-black/20 px-2 py-1.5 portrait-phone:hidden landscape-phone:hidden">
          {state.bidLog.slice(-4).map((log, i) => (
            <p key={i} className="text-[10px] text-white/40">
              {log}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

interface TrickBiddingPanelProps {
  state: GameState;
  isMyTurn: boolean;
  disabledBids: Set<number>;
  onBid: (bid: number) => void;
}

export function TrickBiddingPanel({
  state,
  isMyTurn,
  disabledBids,
  onBid,
}: TrickBiddingPanelProps) {
  const contractPlayer = state.players.find((p) => p.seatIndex === state.contractWinnerIndex);

  return (
    <div className="bid-panel">
      <div className="shrink-0 text-center">
        <p className="text-sm font-medium text-white/55 portrait-phone:text-xs landscape-phone:text-[11px]">
          חלק ב&apos; — הכרזת לקיחות
        </p>
        {state.contractBid && (
          <p className="mt-1 text-sm text-gold-300 portrait-phone:text-sm landscape-phone:text-xs">
            {contractPlayer?.name}: {formatContractBid(state.contractBid)}
          </p>
        )}
        {!isMyTurn && (
          <p className="mt-1 text-xs text-amber-300 animate-pulse portrait-phone:text-[11px] landscape-phone:text-[10px]">
            ממתין לשחקן אחר...
          </p>
        )}
      </div>

      {isMyTurn && (
        <div className="bid-panel-scroll">
          <p className="mb-2 text-center text-sm font-medium text-white/70 portrait-phone:mb-2.5 portrait-phone:text-base landscape-phone:mb-1 landscape-phone:text-[11px]">
            כמה לקיחות את/ה מצפה?
          </p>
          <div className="bid-trick-grid">
            {Array.from({ length: 14 }, (_, i) => i).map((n) => {
              const disabled = disabledBids.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => onBid(n)}
                  className={`bid-trick-btn ${
                    disabled
                      ? "cursor-not-allowed bg-white/5 text-white/20 line-through"
                      : "bg-gold-500/20 text-gold-300 hover:bg-gold-500/40"
                  }`}
                  title={disabled ? "סכום 13 אסור" : undefined}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-1.5 portrait-phone:gap-1.5 landscape-phone:gap-1">
        {state.players.map((p) => {
          const bid = state.trickBids[p.seatIndex];
          if (bid === null) return null;
          return (
            <span key={p.id} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold portrait-phone:text-[11px] landscape-phone:px-2 landscape-phone:py-0.5 landscape-phone:text-[11px]">
              {p.name}: {bid}
            </span>
          );
        })}
      </div>
    </div>
  );
}

interface CardExchangePanelProps {
  state: GameState;
  humanPlayerId: string;
  selectedCardIds: string[];
  onToggleCard: (cardId: string) => void;
  onConfirm: () => void;
}

export function CardExchangePanel({
  state,
  humanPlayerId,
  selectedCardIds,
  onToggleCard,
  onConfirm,
}: CardExchangePanelProps) {
  const player = state.players.find((p) => p.id === humanPlayerId);
  const isReady = state.cardExchangeReady[humanPlayerId];

  return (
    <div className="card-surface space-y-3 p-3 portrait-phone:space-y-1.5 portrait-phone:p-2 landscape-phone:space-y-1 landscape-phone:p-1.5">
      <div className="text-center">
        <p className="text-sm font-semibold text-gold-300 landscape-phone:text-xs portrait-phone:text-xs">4 PASS — החלפת 3 קלפים</p>
        <p className="mt-0.5 text-xs text-white/50 landscape-phone:text-[10px] portrait-phone:text-[10px]">
          בחר 3 קלפים ({selectedCardIds.length}/3)
        </p>
      </div>

      {!isReady && player && (
        <>
          <div className="game-hand-fan game-hand-fan--bbo game-hand-fan-mini touch-scroll-x overflow-hidden px-0.5">
            {sortHand(player.hand).map((card, index) => {
              const selected = selectedCardIds.includes(card.id);
              const full = selectedCardIds.length >= 3 && !selected;
              return (
                <div key={card.id} className="relative shrink-0" style={{ zIndex: selected ? 20 : index + 1 }}>
                  <PlayingCard
                    card={card}
                    size="hand"
                    selected={selected}
                    disabled={full}
                    onClick={() => onToggleCard(card.id)}
                  />
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={selectedCardIds.length !== 3}
            onClick={onConfirm}
          >
            אשר העברה
          </button>
        </>
      )}

      {isReady && (
        <p className="text-center text-sm text-white/50 animate-pulse">ממתין לשחקנים אחרים...</p>
      )}
    </div>
  );
}

interface ScoreboardProps {
  state: GameState;
  phaseLabel?: string;
  humanPlayerId?: string;
}

export function Scoreboard({ state, phaseLabel, humanPlayerId }: ScoreboardProps) {
  return (
    <div className="game-scoreboard">
      <div className="game-scoreboard-round">
        <span className="game-scoreboard-round-num">
          {state.currentRound}/{state.totalRounds}
        </span>
        <span className="game-scoreboard-round-label">סיבוב</span>
        {phaseLabel && <span className="game-scoreboard-phase">{phaseLabel}</span>}
      </div>
      <div className="game-scoreboard-players">
        {state.players.map((p) => {
          const bid = state.trickBids[p.seatIndex];
          const showBid = bid !== null && bid !== undefined;
          const isYou = humanPlayerId != null && p.id === humanPlayerId;
          const isTurn = state.currentPlayerIndex === p.seatIndex;
          const bidMet = showBid && state.phase === "playing" ? p.tricksWon >= bid : null;

          return (
            <div
              key={p.id}
              className={`game-score-cell ${isYou ? "is-you" : ""} ${isTurn ? "is-turn" : ""}`}
            >
              <p className="game-score-name">{isYou ? "את/ה" : p.name}</p>
              <p className="game-score-value">{p.totalScore}</p>
              {showBid && (
                <p
                  className={`game-score-bid ${
                    bidMet === true ? "is-met" : bidMet === false && p.tricksWon > 0 ? "is-short" : ""
                  }`}
                >
                  {state.phase === "playing" ? `${p.tricksWon}/${bid}` : `הכרזה ${bid}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RoundSummaryProps {
  state: GameState;
  onContinue: () => void;
}

export function RoundSummary({ state, onContinue }: RoundSummaryProps) {
  if (!state.roundScores) return null;

  const isVoidRound = state.roundScores[0]?.voidRound ?? false;

  return (
    <div className="card-surface space-y-3 p-4 portrait-phone:space-y-2 portrait-phone:p-2.5 landscape-phone:space-y-1.5 landscape-phone:p-2">
      <h3 className="text-center text-sm font-semibold text-gold-300 landscape-phone:text-xs portrait-phone:text-xs">
        סיכום סיבוב {state.currentRound}
      </h3>

      {isVoidRound && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200">
          סיבוב ללא ניקוד — כולם לא עמדו בהכרזה. הסיבוב נספר, 0 נק&apos; לכולם.
        </div>
      )}

      <div className="space-y-1.5 portrait-phone:space-y-1 landscape-phone:space-y-1">
        {state.roundScores.map((entry) => {
          const metBid = entry.trickBid === entry.tricksWon;
          return (
            <div
              key={entry.seatIndex}
              className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-xs portrait-phone:px-2 portrait-phone:py-1 portrait-phone:text-[11px] landscape-phone:px-2 landscape-phone:py-1 landscape-phone:text-[10px]"
            >
              <span>{entry.name}</span>
              <span className={`text-white/60 ${!metBid && isVoidRound ? "text-amber-300" : ""}`}>
                {entry.trickBid} → {entry.tricksWon}
                {!metBid && isVoidRound && " ✗"}
              </span>
              <span className={isVoidRound ? "text-white/50" : entry.roundScore >= 0 ? "text-emerald-400" : "text-red-400"}>
                {isVoidRound ? "0" : `${entry.roundScore > 0 ? "+" : ""}${entry.roundScore}`}
              </span>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn-primary" onClick={onContinue}>
        {state.currentRound >= state.totalRounds ? "סיום" : "סיבוב הבא"}
      </button>
    </div>
  );
}

interface GameOverPanelProps {
  state: GameState;
  isBotRoom?: boolean;
  onExit: () => void;
  onPlayAgain?: () => void;
}

export function GameOverPanel({ state, isBotRoom, onExit, onPlayAgain }: GameOverPanelProps) {
  const sorted = [...state.players].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sorted[0];

  return (
    <div className="card-surface space-y-3 p-4 text-center portrait-phone:space-y-2 portrait-phone:p-3 landscape-phone:space-y-1.5 landscape-phone:p-2">
      <h2 className="text-xl font-bold text-gold-400 landscape-phone:text-base portrait-phone:text-lg">המשחק הסתיים!</h2>
      <p className="text-sm text-white/60">
        המנצח/ת: <span className="font-semibold text-white">{winner.name}</span> ({winner.totalScore} נק&apos;)
      </p>
      <div className="space-y-1 portrait-phone:space-y-0.5 landscape-phone:space-y-0.5">
        {sorted.map((p, i) => (
          <div key={p.id} className="flex justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-xs portrait-phone:px-2 portrait-phone:py-1 landscape-phone:px-2 landscape-phone:py-1 landscape-phone:text-[10px]">
            <span>
              {i + 1}. {p.name}
            </span>
            <span className="text-gold-300">{p.totalScore}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {isBotRoom && onPlayAgain && (
          <button type="button" className="btn-primary w-full" onClick={onPlayAgain}>
            שחק שוב נגד בוטים
          </button>
        )}
        <button type="button" className={`${isBotRoom ? "btn-secondary" : "btn-primary"} w-full`} onClick={onExit}>
          {isBotRoom ? "חזרה לדף הבית" : "חזרה ללובי"}
        </button>
      </div>
    </div>
  );
}
