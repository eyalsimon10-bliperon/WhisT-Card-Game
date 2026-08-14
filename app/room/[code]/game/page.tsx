"use client";

import { useEffect, useState } from "react";
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
import { HumanPlayerHud, OpponentSeats } from "@/components/game/PlayerSeat";
import { getMySeat, PlayerHand, TrickArea } from "@/components/game/TrickArea";
import { useGameRealtime } from "@/hooks/useGameRealtime";
import { unlockCardAudio } from "@/lib/audio/card-sounds";
import { fetchRoom, postGameAction } from "@/lib/api/client";
import { getDisabledTricksForCurrentBidder } from "@/lib/game/bots";
import { getPhaseLabel } from "@/lib/game/engine";
import { getLegalPlays } from "@/lib/game/trick";
import type { ContractBid, GameState } from "@/lib/game/types";
import { getGuestSession } from "@/lib/session/guest";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [state, setState] = useState<GameState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [exchangeSelection, setExchangeSelection] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isBotRoom, setIsBotRoom] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const session = typeof window !== "undefined" ? getGuestSession() : null;
  const humanId = session?.playerId ?? "";

  useGameRealtime(code, setState);

  useEffect(() => {
    const unlock = () => unlockCardAudio();
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
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
        if (room.status !== "playing") {
          router.replace(`/room/${code}`);
        }
      } catch {
        setError("שגיאה בטעינת החדר");
      }
    }

    void init();
  }, [code, router, humanId]);

  useEffect(() => {
    if (state?.awaitingTrickCollect == null) return;

    const timer = setTimeout(() => {
      void runAction({ type: "finalizeTrickCollect" });
    }, 900);

    return () => clearTimeout(timer);
  }, [state?.awaitingTrickCollect]);

  useEffect(() => {
    if (!state?.completedTrickDisplay) return;

    const timer = setTimeout(() => {
      void runAction({ type: "clearCompletedTrick" });
    }, 1500);

    return () => clearTimeout(timer);
  }, [state?.completedTrickDisplay]);

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
        }, 450);
        return () => clearTimeout(timer);
      }
      return;
    }

    const isBotTurn = state.players.find((p) => p.seatIndex === state.currentPlayerIndex)?.isBot;
    if (!isBotTurn) return;

    const delay =
      state.phase === "bidding_contract"
        ? 950
        : state.phase === "bidding_tricks"
          ? 750
          : state.currentTrick.length > 0
            ? 800
            : 650;

    const timer = setTimeout(() => {
      void runAction({ type: "runBots" });
    }, delay);

    return () => clearTimeout(timer);
  }, [state, humanId]);

  async function runAction(action: Parameters<typeof postGameAction>[2]) {
    if (!humanId || actionLoading) return;
    setActionLoading(true);
    try {
      const result = await postGameAction(code, humanId, action);
      if (result.state) setState(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בפעולה");
    } finally {
      setActionLoading(false);
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
    state.awaitingTrickCollect != null || state.completedTrickDisplay != null;
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
              <OpponentSeats state={state} mySeat={mySeat} />
              <div className="game-table-zone landscape-phone:px-[4.25rem] portrait-phone:px-0">
                <TrickArea state={state} mySeat={mySeat} />
              </div>
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
                    <div className="mobile-panel-fit flex flex-col justify-end">
                      <GameOverPanel
                      state={state}
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
