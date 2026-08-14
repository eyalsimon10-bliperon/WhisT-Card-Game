"use client";

import { useEffect, useState } from "react";
import { BidMark, PassMark, SuitGlyph } from "@/components/game/BidMark";
import { playMatchResult, unlockCardAudio } from "@/lib/audio/card-sounds";
import {
  formatContractBid,
  getBidProgress,
  getRoundShape,
  getTotalTrickBids,
  isContractBidLegal,
  isContractConfirmLegal,
} from "@/lib/game/bidding";
import type { Card, ContractBid, ContractSeatDisplay, GameState, Trump } from "@/lib/game/types";
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
  const call = state.lastContractCalls?.[seatIndex];
  if (call?.type === "pass") return "pass";
  if (call?.type === "bid") return "bid";
  return "waiting";
}

interface ContractBiddingTrackerProps {
  state: GameState;
  mySeat: number;
}

export function ContractBiddingTracker({ state, mySeat }: ContractBiddingTrackerProps) {
  const seats = [0, 1, 2, 3].map((offset) => (mySeat + offset) % 4);

  return (
    <div className="shrink-0 px-0.5 landscape-phone:mb-0 portrait-phone:mb-1.5 mb-1.5">
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-white/40 portrait-phone:hidden landscape-phone:hidden">
        מעקב הכרזות
      </p>
      <div className="grid grid-cols-4 gap-1.5 landscape-phone:gap-1 portrait-phone:gap-1.5">
        {seats.map((seatIndex) => {
          const player = state.players.find((p) => p.seatIndex === seatIndex);
          if (!player) return null;

          const display = getContractSeatDisplay(state, seatIndex);
          const call = state.lastContractCalls?.[seatIndex] ?? null;
          const isMe = seatIndex === mySeat;
          const bid = call?.type === "bid" ? call.bid : display === "confirm" ? state.currentHighBid : null;

          return (
            <div
              key={seatIndex}
              className={`relative flex flex-col items-center rounded-xl border px-1 py-2 transition-all duration-300 portrait-phone:px-1 portrait-phone:py-1.5 landscape-phone:rounded-lg landscape-phone:px-1 landscape-phone:py-1 ${
                display === "thinking" || display === "confirm"
                  ? "border-gold-400/70 bg-gold-500/15 shadow-lg shadow-gold-500/20"
                  : display === "pass"
                    ? "border-white/10 bg-white/5"
                    : display === "bid"
                      ? "border-gold-400/35 bg-black/30"
                      : "border-white/5 bg-black/20"
              }`}
            >
              {(display === "thinking" || display === "confirm") && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-1.5 py-0.5 text-[9px] font-bold text-felt-900 landscape-phone:-top-1 landscape-phone:text-[8px]">
                  {display === "confirm" ? "אישור" : "תור"}
                </span>
              )}

              <p className="max-w-full truncate text-xs font-extrabold text-white portrait-phone:text-[12px] landscape-phone:text-[11px]">
                {isMe ? "את/ה" : player.name}
              </p>

              <div className="mt-1.5 flex min-h-[2.1rem] items-center justify-center portrait-phone:mt-1 portrait-phone:min-h-[2rem] landscape-phone:mt-0.5 landscape-phone:min-h-[1.7rem]">
                {call?.type === "pass" && <PassMark size="md" />}
                {bid && <BidMark bid={bid} size="lg" />}
                {display === "thinking" && !call && (
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:300ms]" />
                  </span>
                )}
                {display === "waiting" && !call && !bid && (
                  <span className="text-sm text-white/25">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {state.contractConfirmPending && state.currentHighBid && (
        <p className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-gold-300/90 portrait-phone:text-[11px] landscape-phone:mt-1 landscape-phone:text-[10px]">
          3 PASS —
          <span className="font-semibold">
            {state.players.find((p) => p.seatIndex === state.highBidderIndex)?.name}
          </span>
          מאשר/ת
          <BidMark bid={state.currentHighBid} size="sm" />
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
          <p className="mt-1.5 flex items-center justify-center gap-2 text-sm text-gold-300 portrait-phone:text-sm landscape-phone:text-xs">
            הכרזה גבוהה
            <BidMark bid={state.currentHighBid} size="md" />
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
                  {TRUMP_OPTIONS.map(({ trump, label }) => {
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
                            ? "is-selected"
                            : available
                              ? ""
                              : "is-disabled"
                        }`}
                      >
                        <span className={`bid-trump-face ${trump === "NT" ? "is-nt" : ""}`}>
                          <SuitGlyph
                            trump={trump}
                            className={trump === "NT" ? "bid-trump-nt" : "bid-trump-suit"}
                          />
                        </span>
                        <span className="bid-trump-caption">{label}</span>
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
          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-sm text-gold-300 portrait-phone:text-sm landscape-phone:text-xs">
            <span>{contractPlayer?.name}</span>
            <BidMark bid={state.contractBid} size="md" />
          </p>
        )}
        <div className="mt-1.5 flex justify-center">
          <RoundShapeBadge trickBids={state.trickBids} size="lg" />
        </div>
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
  onConfirm: () => void;
}

export function CardExchangePanel({
  state,
  humanPlayerId,
  selectedCardIds,
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
        <button
          type="button"
          className="btn-primary"
          disabled={selectedCardIds.length !== 3}
          onClick={onConfirm}
        >
          אשר העברה
        </button>
      )}

      {isReady && (
        <p className="text-center text-sm text-white/50 animate-pulse">ממתין לשחקנים אחרים...</p>
      )}
    </div>
  );
}

function RoundShapeBadge({
  trickBids,
  size = "sm",
}: {
  trickBids: (number | null)[];
  size?: "sm" | "lg";
}) {
  const shape = getRoundShape(trickBids);
  if (!shape) return null;
  const total = getTotalTrickBids(trickBids);
  const label = shape === "over" ? "OVER" : "UNDER";

  if (size === "lg") {
    return (
      <span className={`game-round-shape-lg is-${shape} ${shape === "over" ? "bg-amber-400 text-felt-900" : "bg-sky-300 text-sky-950"}`}>
        {label}
        <span className="font-semibold opacity-80">({total})</span>
      </span>
    );
  }

  return <span className={`game-round-shape is-${shape}`}>{label}</span>;
}

function scoreToneClass(score: number): string {
  if (score > 0) return "is-plus";
  if (score < 0) return "is-minus";
  return "";
}

function getScorePlaces(players: { id?: string; seatIndex?: number; totalScore: number }[]): {
  leaderIds: Set<string>;
  lastIds: Set<string>;
  leaderSeats: Set<number>;
  lastSeats: Set<number>;
} {
  const empty = {
    leaderIds: new Set<string>(),
    lastIds: new Set<string>(),
    leaderSeats: new Set<number>(),
    lastSeats: new Set<number>(),
  };
  if (players.length < 2) return empty;

  const scores = players.map((p) => p.totalScore);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  if (max === min) return empty;

  const leaderIds = new Set<string>();
  const lastIds = new Set<string>();
  const leaderSeats = new Set<number>();
  const lastSeats = new Set<number>();

  for (const p of players) {
    if (p.totalScore === max) {
      if (p.id) leaderIds.add(p.id);
      if (p.seatIndex != null) leaderSeats.add(p.seatIndex);
    }
    if (p.totalScore === min) {
      if (p.id) lastIds.add(p.id);
      if (p.seatIndex != null) lastSeats.add(p.seatIndex);
    }
  }

  return { leaderIds, lastIds, leaderSeats, lastSeats };
}

function bidProgressClass(progress: ReturnType<typeof getBidProgress>): string {
  if (progress === "made") return "is-made text-emerald-400";
  if (progress === "overbid") return "is-overbid text-rose-400";
  if (progress === "short") return "is-short text-amber-300";
  return "";
}

interface ScoreboardProps {
  state: GameState;
  phaseLabel?: string;
  humanPlayerId?: string;
}

export function Scoreboard({ state, phaseLabel, humanPlayerId }: ScoreboardProps) {
  const roundShape = getRoundShape(state.trickBids);
  const showPlayProgress = state.phase === "playing" || state.phase === "round_scoring";
  const { leaderIds, lastIds } = getScorePlaces(state.players);

  return (
    <div className="game-scoreboard">
      <div className={`game-scoreboard-round ${roundShape ? `is-${roundShape}` : ""}`}>
        <span className="game-scoreboard-round-num">
          {state.currentRound}/{state.totalRounds}
        </span>
        <span className="game-scoreboard-round-label">סיבוב</span>
        <RoundShapeBadge trickBids={state.trickBids} />
        {phaseLabel && !roundShape && <span className="game-scoreboard-phase">{phaseLabel}</span>}
      </div>
      <div className="game-scoreboard-players">
        {state.players.map((p) => {
          const bid = state.trickBids[p.seatIndex];
          const showBid = bid !== null && bid !== undefined;
          const isYou = humanPlayerId != null && p.id === humanPlayerId;
          const isTurn = state.currentPlayerIndex === p.seatIndex;
          const isLead = leaderIds.has(p.id);
          const isLast = lastIds.has(p.id);
          const progress = showPlayProgress ? getBidProgress(p.tricksWon, bid) : null;
          const liveProgress = progress === "short" ? null : progress;

          return (
            <div
              key={p.id}
              className={`game-score-cell ${isYou ? "is-you" : ""} ${isTurn ? "is-turn" : ""} ${isLead ? "is-lead" : ""} ${isLast ? "is-last" : ""}`}
            >
              <p className="game-score-name">{isYou ? "את/ה" : p.name}</p>
              {(isLead || isLast) && (
                <span className={`game-score-place ${isLead ? "is-lead" : "is-last"}`}>
                  {isLead ? "★ מוביל" : "אחרון"}
                </span>
              )}
              <p className={`game-score-value ${scoreToneClass(p.totalScore)}`}>{p.totalScore}</p>
              {showBid && (
                <p className={`game-score-bid ${bidProgressClass(liveProgress)}`}>
                  {showPlayProgress ? `${p.tricksWon}/${bid}` : `הכרזה ${bid}`}
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

function RecapMiniCard({ card, winner }: { card: Card; winner?: boolean }) {
  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <div
      className={`recap-mini-card ${isRed ? "is-red" : ""} ${winner ? "is-winner" : ""}`}
      title={`${card.rank}${SUIT_SYMBOL[card.suit]}`}
    >
      <span className="recap-mini-rank">{card.rank}</span>
      <span className="recap-mini-suit">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

export function RoundSummary({ state, onContinue }: RoundSummaryProps) {
  if (!state.roundScores) return null;

  const isVoidRound = state.roundScores[0]?.voidRound ?? false;
  const history = state.trickHistory ?? [];
  const lastRound = state.currentRound >= state.totalRounds;
  const contractLabel = state.contractBid ? formatContractBid(state.contractBid) : null;
  const contractWinner = state.players.find((p) => p.seatIndex === state.contractWinnerIndex);
  const { leaderSeats, lastSeats } = getScorePlaces(
    state.roundScores.map((entry) => ({
      seatIndex: entry.seatIndex,
      totalScore: entry.totalScore,
    }))
  );

  return (
    <div className="round-recap">
      <div className="round-recap-scroll">
        <header className="space-y-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 landscape-phone:text-[9px]">
            סיבוב {state.currentRound} מתוך {state.totalRounds}
          </p>
          <h3 className="text-2xl font-bold text-gold-300 portrait-phone:text-xl landscape-phone:text-lg">
            סיכום הסיבוב
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <RoundShapeBadge trickBids={state.trickBids} size="lg" />
            {contractLabel && (
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 landscape-phone:text-[10px]">
                חוזה {contractLabel}
                {contractWinner ? ` · ${contractWinner.name}` : ""}
              </span>
            )}
          </div>
        </header>

        {isVoidRound && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-center text-sm text-amber-200 landscape-phone:py-1.5 landscape-phone:text-xs">
            סיבוב ללא ניקוד — כולם לא עמדו בהכרזה. 0 נק&apos; לכולם.
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <table className="recap-score-table">
            <thead>
              <tr>
                <th>שחקן</th>
                <th>הכרזה</th>
                <th>לקיחות</th>
                <th>סיבוב</th>
                <th>סה״כ</th>
              </tr>
            </thead>
            <tbody>
              {state.roundScores.map((entry) => {
                const progress = getBidProgress(entry.tricksWon, entry.trickBid);
                const isLead = leaderSeats.has(entry.seatIndex);
                const isLast = lastSeats.has(entry.seatIndex);
                const roundClass = isVoidRound
                  ? "text-white/45"
                  : entry.roundScore > 0
                    ? "text-emerald-400"
                    : entry.roundScore < 0
                      ? "text-rose-400"
                      : "text-white/70";
                const totalClass =
                  entry.totalScore > 0
                    ? "text-emerald-400"
                    : entry.totalScore < 0
                      ? "text-rose-400"
                      : "text-gold-300";

                return (
                  <tr key={entry.seatIndex} className={isLead ? "is-lead" : isLast ? "is-last" : ""}>
                    <td className="text-white">
                      <span className="inline-flex items-center gap-1">
                        {isLead && <span className="text-gold-400" aria-hidden>★</span>}
                        {entry.name}
                        {isLead && <span className="text-[10px] font-extrabold text-gold-400">מוביל</span>}
                        {isLast && <span className="text-[10px] font-extrabold text-slate-400">אחרון</span>}
                      </span>
                    </td>
                    <td className="text-white/80">{entry.trickBid}</td>
                    <td className={bidProgressClass(progress)}>
                      {entry.tricksWon}
                      <span className="ms-0.5 text-[11px] font-semibold opacity-80">
                        {progress === "overbid" ? "+" : progress === "made" ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className={roundClass}>
                      {isVoidRound ? "0" : `${entry.roundScore > 0 ? "+" : ""}${entry.roundScore}`}
                    </td>
                    <td className={totalClass}>{entry.totalScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {history.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-white/70 landscape-phone:text-xs">קלפים שנלקחו</h4>
            <div className="space-y-2.5 landscape-phone:space-y-1.5">
              {state.players.map((player) => {
                const wonTricks = history.filter((trick) => trick.winnerSeat === player.seatIndex);
                return (
                  <div
                    key={player.id}
                    className="rounded-xl border border-white/10 bg-black/25 px-2.5 py-2 landscape-phone:px-2 landscape-phone:py-1.5"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 landscape-phone:mb-1">
                      <p className="truncate text-sm font-bold text-white landscape-phone:text-xs">
                        {player.name}
                      </p>
                      <p className="shrink-0 text-xs font-semibold text-white/50 landscape-phone:text-[10px]">
                        {wonTricks.length} לקיחות
                      </p>
                    </div>
                    {wonTricks.length === 0 ? (
                      <p className="text-xs text-white/35">לא לקח/ה לקיחות</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 landscape-phone:gap-1">
                        {wonTricks.map((trick, trickIndex) => (
                          <div key={`${player.id}-${trickIndex}`} className="recap-won-trick">
                            {trick.plays.map((play) => (
                              <RecapMiniCard
                                key={play.card.id}
                                card={play.card}
                                winner={play.seatIndex === trick.winnerSeat}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="round-recap-actions">
        <button type="button" className="btn-primary" onClick={onContinue}>
          {lastRound ? "סיום המשחק" : "סיבוב הבא"}
        </button>
      </div>
    </div>
  );
}

interface GameOverPanelProps {
  state: GameState;
  humanPlayerId?: string;
  isBotRoom?: boolean;
  onExit: () => void;
  onPlayAgain?: () => void;
}

export function GameOverPanel({
  state,
  humanPlayerId,
  isBotRoom,
  onExit,
  onPlayAgain,
}: GameOverPanelProps) {
  const sorted = [...state.players].sort((a, b) => b.totalScore - a.totalScore);
  const topScore = sorted[0]?.totalScore ?? 0;
  const winners = sorted.filter((p) => p.totalScore === topScore);
  const me = state.players.find((p) => p.id === humanPlayerId);
  const didWin = !!me && me.totalScore === topScore;
  const winnerNames = winners.map((p) => (p.id === humanPlayerId ? "את/ה" : p.name));

  const resultKey = `${state.roomCode}:${sorted.map((p) => `${p.id}:${p.totalScore}`).join("|")}`;

  useEffect(() => {
    unlockCardAudio();
    playMatchResult(didWin, resultKey);
  }, [didWin, resultKey]);

  return (
    <div className="game-over-panel card-surface space-y-4 p-4 text-center portrait-phone:space-y-3 portrait-phone:p-3.5 landscape-phone:space-y-1.5 landscape-phone:p-2">
      <header className="relative z-[1] space-y-1.5 landscape-phone:space-y-0.5">
        <p className="game-over-kicker">תוצאות המשחק</p>
        <h2 className={`game-over-title ${didWin ? "" : "is-loss"}`}>
          {didWin ? "ניצחת!" : "המשחק הסתיים"}
        </h2>
        <p className="game-over-sub">
          {winners.length > 1
            ? `תיקו במקום הראשון: ${winnerNames.join(" · ")}`
            : `המנצח/ת: ${winnerNames[0]}`}
          <span className="text-white/40"> · </span>
          {state.totalRounds} סיבובים
        </p>
      </header>

      <div className="game-over-board relative z-[1]" role="table" aria-label="טבלת ניקוד סופית">
        <div className="game-over-board-head" role="row">
          <span>מקום</span>
          <span>שחקן</span>
          <span>ניקוד</span>
        </div>
        {sorted.map((p, i) => {
          const isWinner = p.totalScore === topScore;
          const isYou = p.id === humanPlayerId;
          const place = i + 1;
          const scoreClass =
            p.totalScore > 0 ? "is-plus" : p.totalScore < 0 ? "is-minus" : "";
          const scoreLabel = `${p.totalScore > 0 ? "+" : ""}${p.totalScore}`;

          return (
            <div
              key={p.id}
              role="row"
              className={`game-over-row ${isWinner ? "is-winner" : ""} ${isYou ? "is-you" : ""}`}
            >
              <span className={`game-over-rank is-${place}`} aria-label={`מקום ${place}`}>
                {place}
              </span>
              <div className="min-w-0 text-start">
                <p className="game-over-name">{isYou ? "את/ה" : p.name}</p>
                <span className="game-over-meta">
                  {isWinner
                    ? "מקום ראשון"
                    : place === sorted.length
                      ? "מקום אחרון"
                      : `מקום ${place}`}
                </span>
              </div>
              <span className={`game-over-score ${scoreClass}`}>{scoreLabel}</span>
            </div>
          );
        })}
      </div>

      <div className="relative z-[1] space-y-2 landscape-phone:space-y-1">
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
