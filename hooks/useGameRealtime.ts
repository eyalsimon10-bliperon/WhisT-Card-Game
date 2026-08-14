"use client";

import { useEffect, useRef } from "react";
import { fetchGameState } from "@/lib/api/client";
import { normalizeGameState } from "@/lib/game/normalize-state";
import type { GameState } from "@/lib/game/types";
import { createClient } from "@/lib/supabase/client";

const POLL_SUBSCRIBED_MS = 4000;
const POLL_UNSUBSCRIBED_MS = 1200;

function fingerprint(state: GameState | null): string {
  if (!state) return "";
  return [
    state.phase,
    state.currentPlayerIndex,
    state.tricksPlayed,
    state.currentTrick.length,
    state.awaitingTrickCollect ?? "",
    state.completedTrickDisplay ? "1" : "0",
    state.trickBidStep,
    state.currentHighBid ? `${state.currentHighBid.tricks}${state.currentHighBid.trump}` : "",
    state.trickBids.join(","),
    state.players.map((p) => `${p.hand.length}:${p.tricksWon}:${p.totalScore}`).join("|"),
  ].join("~");
}

export function useGameRealtime(code: string, onState: (state: GameState | null) => void) {
  const handlerRef = useRef(onState);
  handlerRef.current = onState;

  useEffect(() => {
    const normalized = code.toUpperCase();
    let cancelled = false;
    let inFlight = false;
    let subscribed = false;
    let lastPrint = "";
    let pollId = 0;

    function emit(state: GameState | null) {
      const print = fingerprint(state);
      if (print === lastPrint) return;
      lastPrint = print;
      handlerRef.current(state);
    }

    async function load() {
      if (cancelled || inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const state = await fetchGameState(normalized);
        if (!cancelled) emit(state ? normalizeGameState(state) : null);
      } catch {
        if (!cancelled) emit(null);
      } finally {
        inFlight = false;
      }
    }

    function startPoll() {
      window.clearInterval(pollId);
      const ms = subscribed ? POLL_SUBSCRIBED_MS : POLL_UNSUBSCRIBED_MS;
      pollId = window.setInterval(() => {
        void load();
      }, ms);
    }

    void load();

    const supabase = createClient();
    const channel = supabase
      .channel(`game:${normalized}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_states",
          filter: `room_code=eq.${normalized}`,
        },
        (payload) => {
          const row = payload.new as { state?: GameState } | null;
          if (row?.state && !cancelled) {
            emit(normalizeGameState(row.state));
            return;
          }
          void load();
        }
      )
      .subscribe((status) => {
        subscribed = status === "SUBSCRIBED";
        startPoll();
        if (subscribed) void load();
      });

    startPoll();

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [code]);
}
