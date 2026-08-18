"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CardExchangePanel,
  ContractBiddingPanel,
  ContractBiddingTracker,
  GameOverPanel,
  RoundSummary,
  Scoreboard,
  TrickBiddingPanel,
} from "@/components/game/BiddingPanels";
import { HumanPlayerHud, PlayField } from "@/components/game/PlayerSeat";
import { getMySeat, PlayerHand, TrickArea } from "@/components/game/TrickArea";
import { useGameRealtime } from "@/hooks/useGameRealtime";
import { playCardSlide, playMatchResult, unlockCardAudio } from "@/lib/audio/card-sounds";
import { fetchRoom, postGameAction } from "@/lib/api/client";
import { getDisabledTricksForCurrentBidder } from "@/lib/game/bots";
import { getPhaseLabel, TRICK_HOLD_MS } from "@/lib/game/engine";
import { getLegalPlays } from "@/lib/game/trick";
import type { ContractBid, GameState, TrickPlay } from "@/lib/game/types";
import { getGuestSession } from "@/lib/session/guest";

const TRICK_FLY_IN_MS = 280;
const TRICK_COLLECT_MS = 400;

type HeldTrick = {
  key: string;
  plays: TrickPlay[];
  winner: number;
  seenAt: number;
};

function trickKey(plays: TrickPlay[]): string {
  return plays.map((p) => `${p.seatIndex}:${p.card.id}`).join("|");
}

/** Only one seat should drive collect — the player who put the 4th card, or the host/first human if a bot did. */
function isTrickCollectLeader(
  plays: TrickPlay[],
  players: GameState["players"],
  humanId: string,
  hostId: string | null
): boolean {
  const last = plays[plays.length - 1];
  if (!last) return false;
  const lastPlayer = players.find((p) => p.seatIndex === last.seatIndex);
  if (!lastPlayer) return false;
  if (lastPlayer.id === humanId) return true;
  if (!lastPlayer.isBot) return false;
  if (hostId && hostId === humanId) return true;
  const humans = [...players].filter((p) => !p.isBot).sort((a, b) => a.seatIndex - b.seatIndex);
  return humans[0]?.id === humanId;
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [state, setState] = useState<GameState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [exchangeSelection, setExchangeSelection] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isBotRoom, setIsBotRoom] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [trickCollecting, setTrickCollecting] = useState(false);
  const [heldTrick, setHeldTrick] = useState<HeldTrick | null>(null);
  const actionLock = useRef(false);
  const heldTrickRef = useRef<HeldTrick | null>(null);

  const session = typeof window !== "undefined" ? getGuestSession() : null;
  const humanId = session?.playerId ?? "";

  useGameRealtime(code, setState);

  useEffect(() => {
    const unlock = () => unlockCardAudio();
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("touchstart", unlock, { passive: true });
    unlock();
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  useEffect(() => {
    if (!humanId) {
      router.replace(`/join/${code}`);
      return;
    }

    async function init() {
      try {
        const room = await fetchRoom(code);
        if (!room) {
          setError("חדר לא נמצא");
          return;
        }
        setIsBotRoom(room.isBotRoom ?? false);
        setHostId(room.hostId);
        if (room.status !== "playing") {
          router.replace(`/room/${code}`);
        }
      } catch {
        setError("שגיאה בטעינת החדר");
      }
    }

    void init();
  }, [code, router, humanId]);

  // Keep a local snapshot of the finished trick so late realtime updates cannot erase the 4th card early.
  useEffect(() => {
    if (!state) return;

    if (state.awaitingTrickCollect != null && state.currentTrick.length === 4) {
      const key = trickKey(state.currentTrick);
      if (heldTrickRef.current?.key !== key) {
        const nextHeld: HeldTrick = {
          key,
          plays: state.currentTrick,
          winner: state.awaitingTrickCollect,
          seenAt: Date.now(),
        };
        heldTrickRef.current = nextHeld;
        setHeldTrick(nextHeld);
        setTrickCollecting(false);
      }
      return;
    }

    if (state.completedTrickDisplay) {
      const key = trickKey(state.completedTrickDisplay.plays);
      if (!heldTrickRef.current || heldTrickRef.current.key !== key) {
        const nextHeld: HeldTrick = {
          key,
          plays: state.completedTrickDisplay.plays,
          winner: state.completedTrickDisplay.winnerSeat,
          seenAt: heldTrickRef.current?.seenAt ?? Date.now(),
        };
        heldTrickRef.current = nextHeld;
        setHeldTrick(nextHeld);
      }
      setTrickCollecting(true);
      return;
    }

    const held = heldTrickRef.current;
    if (!held) {
      setTrickCollecting(false);
      return;
    }

    const minShow = TRICK_FLY_IN_MS + TRICK_HOLD_MS + TRICK_COLLECT_MS;
    const remaining = minShow - (Date.now() - held.seenAt);
    if (remaining <= 0) {
      heldTrickRef.current = null;
      setHeldTrick(null);
      setTrickCollecting(false);
      return;
    }

    const timer = window.setTimeout(() => {
      heldTrickRef.current = null;
      setHeldTrick(null);
      setTrickCollecting(false);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [
    state?.awaitingTrickCollect,
    state?.completedTrickDisplay,
    state?.currentTrick,
    state?.tricksPlayed,
  ]);

  // One client finalizes after the hold; others only watch the local snapshot.
  useEffect(() => {
    if (!state || !humanId) return;
    if (state.awaitingTrickCollect == null || state.currentTrick.length < 4) return;

    const holdUntil = state.trickHoldUntil ?? Date.now() + TRICK_HOLD_MS;
    const waitMs = Math.max(TRICK_FLY_IN_MS, holdUntil - Date.now());
    const plays = state.currentTrick;
    const lead = isTrickCollectLeader(plays, state.players, humanId, hostId);

    const lookTimer = window.setTimeout(() => setTrickCollecting(true), waitMs);

    if (!lead) {
      return () => window.clearTimeout(lookTimer);
    }

    let cancelled = false;
    const finalizeTimer = window.setTimeout(() => {
      void (async () => {
        for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
          if (actionLock.current) {
            await new Promise((r) => setTimeout(r, 120));
            continue;
          }
          actionLock.current = true;
          try {
            const result = await postGameAction(code, humanId, { type: "finalizeTrickCollect" });
            if (result.state) setState(result.state);
            if (!result.state?.awaitingTrickCollect) return;
            const retryIn = Math.max(
              120,
              (result.state.trickHoldUntil ?? Date.now()) - Date.now()
            );
            await new Promise((r) => setTimeout(r, retryIn));
          } catch {
            return;
          } finally {
            actionLock.current = false;
          }
        }
      })();
    }, waitMs);

    return () => {
      cancelled = true;
      window.clearTimeout(lookTimer);
      window.clearTimeout(finalizeTimer);
    };
  }, [
    state?.awaitingTrickCollect,
    state?.trickHoldUntil,
    state?.currentTrick,
    state?.players,
    humanId,
    hostId,
    code,
  ]);

  // After cards are locked into completedTrickDisplay, clear them (collect animation).
  useEffect(() => {
    if (!state?.completedTrickDisplay || !humanId) return;

    const plays = state.completedTrickDisplay.plays;
    const lead = isTrickCollectLeader(plays, state.players, humanId, hostId);
    setTrickCollecting(true);

    if (!lead) return;

    const timer = window.setTimeout(() => {
      void runAction({ type: "clearCompletedTrick" });
    }, TRICK_COLLECT_MS);

    return () => window.clearTimeout(timer);
  }, [state?.completedTrickDisplay, state?.players, humanId, hostId]);

  useEffect(() => {
    if (!state || !humanId) return;
    if (state.awaitingTrickCollect != null || state.completedTrickDisplay) return;

    if (state.phase === "card_exchange") {
      const humanReady = state.cardExchangeReady[humanId];
      const pendingBot = state.players.some(
        (p) => p.isBot && !state.cardExchangeReady[p.id]
      );
      if (humanReady && pendingBot) {
        const timer = setTimeout(() => {
          void runAction({ type: "runBots" });
        }, 180);
        return () => clearTimeout(timer);
      }
      return;
    }

    const isBotTurn = state.players.find((p) => p.seatIndex === state.currentPlayerIndex)?.isBot;
    if (!isBotTurn) return;

    const delay =
      state.phase === "bidding_contract"
        ? 320
        : state.phase === "bidding_tricks"
          ? 220
          : state.currentTrick.length > 0
            ? 260
            : 140;

    const timer = setTimeout(() => {
      void runAction({ type: "runBots" });
    }, delay);

    return () => clearTimeout(timer);
  }, [state, humanId]);

  async function runAction(action: Parameters<typeof postGameAction>[2]) {
    if (!humanId || actionLock.current) return;
    actionLock.current = true;
    const silent =
      action.type === "resolveTrick" ||
      action.type === "finalizeTrickCollect" ||
      action.type === "clearCompletedTrick" ||
      action.type === "runBots";
    if (!silent) setActionLoading(true);
    try {
      const result = await postGameAction(code, humanId, action);
      if (result.state) setState(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בפעולה");
    } finally {
      actionLock.current = false;
      if (!silent) setActionLoading(false);
    }
  }

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-red-200">{error}</p>
      </main>
    );
  }

  if (!state || !session) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
      </main>
    );
  }

  const mySeat = getMySeat(state, humanId);
  const me = state.players.find((p) => p.id === humanId)!;
  const isMyTurn = state.currentPlayerIndex === mySeat;
  const trickAnimating =
    state.awaitingTrickCollect != null ||
    state.completedTrickDisplay != null ||
    heldTrick != null;
  const canPlay = isMyTurn && !trickAnimating && !actionLoading;

  const legalPlays =
    state.phase === "playing" && state.trump
      ? getLegalPlays(me.hand, state.currentTrick, state.trump)
      : [];
  const legalCardIds = new Set(legalPlays.map((c) => c.id));

  function handleContractBid(bid: ContractBid) {
    void runAction({ type: "contract", contractAction: { type: "bid", bid } });
  }

  function handlePass() {
    void runAction({ type: "contract", contractAction: { type: "pass" } });
  }

  function handleTrickBid(bid: number) {
    void runAction({ type: "trickBid", bid });
  }

  function handlePlayCard(cardId: string) {
    playCardSlide(cardId);
    void runAction({ type: "playCard", cardId });
    setSelectedCardId(null);
  }

  function handleToggleExchange(cardId: string) {
    setExchangeSelection((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 3) return prev;
      return [...prev, cardId];
    });
  }

  function handleConfirmExchange() {
    void runAction({ type: "cardExchange", cardIds: exchangeSelection });
    setExchangeSelection([]);
  }

  function handleContinueRound() {
    if (state && state.currentRound >= state.totalRounds) {
      const ranked = [...state.players].sort((a, b) => b.totalScore - a.totalScore);
      const topScore = ranked[0]?.totalScore ?? 0;
      const me = state.players.find((p) => p.id === humanId);
      const resultKey = `${state.roomCode}:${ranked.map((p) => `${p.id}:${p.totalScore}`).join("|")}`;
      unlockCardAudio();
      playMatchResult(!!me && me.totalScore === topScore, resultKey);
    }
    void runAction({ type: "advanceRound" });
  }

  const disabledTrickBids = getDisabledTricksForCurrentBidder(state);

  async function handlePlayAgainBots() {
    if (!state) return;
    await runAction({
      type: "playAgainBots",
      totalRounds: state.totalRounds ?? 13,
    });
  }

  async function handleExit() {
    await runAction({ type: "resetRoom" });
    router.push(isBotRoom ? "/" : `/room/${code}`);
  }

  return (
    <main className="game-shell relative bg-felt-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-felt-700/40 via-felt-900 to-felt-900" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-2 pb-0 pt-0.5 landscape-phone:px-1 portrait-phone:px-1.5">
        <header className="shrink-0">
          <Scoreboard
            state={state}
            phaseLabel={getPhaseLabel(state.phase)}
            humanPlayerId={humanId}
          />
        </header>

        <div className="relative min-h-0 flex-1">
          {state.phase === "playing" ? (
            <div className="relative flex h-full min-h-0 flex-col">
              <PlayField state={state} mySeat={mySeat}>
                <TrickArea
                  state={state}
                  mySeat={mySeat}
                  collecting={trickCollecting}
                  heldTrick={heldTrick}
                />
              </PlayField>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="mobile-panel-sheet w-full">
                <div className="mobile-panel-fit flex flex-col justify-start gap-2">
                  {state.phase === "bidding_contract" && (
                    <div className="bid-phase-stack">
                      <ContractBiddingTracker state={state} mySeat={mySeat} />
                      <ContractBiddingPanel
                        state={state}
                        isMyTurn={isMyTurn && !actionLoading}
                        onBid={handleContractBid}
                        onPass={handlePass}
                      />
                    </div>
                  )}

                  {state.phase === "bidding_tricks" && (
                    <div className="bid-phase-stack">
                      <TrickBiddingPanel
                        state={state}
                        isMyTurn={isMyTurn && !actionLoading}
                        disabledBids={disabledTrickBids}
                        onBid={handleTrickBid}
                      />
                    </div>
                  )}

                  {state.phase === "card_exchange" && (
                    <div className="mobile-panel-fit flex flex-col justify-end">
                      <CardExchangePanel
                      state={state}
                      humanPlayerId={humanId}
                      selectedCardIds={exchangeSelection}
                      onConfirm={handleConfirmExchange}
                      />
                    </div>
                  )}

                  {state.phase === "round_scoring" && (
                    <div className="mobile-panel-fit flex min-h-0 flex-col">
                      <RoundSummary state={state} onContinue={handleContinueRound} />
                    </div>
                  )}

                  {state.phase === "game_over" && (
                    <div className="mobile-panel-fit flex min-h-0 flex-col overflow-y-auto">
                      <GameOverPanel
                      state={state}
                      humanPlayerId={humanId}
                      isBotRoom={isBotRoom}
                      onExit={() => void handleExit()}
                      onPlayAgain={isBotRoom ? () => void handlePlayAgainBots() : undefined}
                    />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {state.phase === "playing" && (
          <footer className="game-hand-dock">
            <HumanPlayerHud player={me} state={state} isActive={isMyTurn && canPlay} />
            <PlayerHand
              hand={me.hand}
              legalCardIds={canPlay ? legalCardIds : new Set(me.hand.map((c) => c.id))}
              selectedCardId={selectedCardId}
              onSelectCard={setSelectedCardId}
              onPlayCard={canPlay ? handlePlayCard : undefined}
              canPlay={canPlay}
            />
          </footer>
        )}

        {(state.phase === "bidding_contract" ||
          state.phase === "bidding_tricks" ||
          state.phase === "card_exchange") && (
          <footer className="game-hand-dock bidding-hand-dock">
            <PlayerHand
              hand={me.hand}
              legalCardIds={
                state.phase === "card_exchange" && exchangeSelection.length >= 3
                  ? new Set(exchangeSelection)
                  : new Set(me.hand.map((c) => c.id))
              }
              selectedCardId={state.phase === "card_exchange" ? null : selectedCardId}
              selectedCardIds={state.phase === "card_exchange" ? exchangeSelection : undefined}
              onSelectCard={setSelectedCardId}
              onToggleCard={state.phase === "card_exchange" ? handleToggleExchange : undefined}
              canPlay={false}
            />
          </footer>
        )}
      </div>
    </main>
  );
}
