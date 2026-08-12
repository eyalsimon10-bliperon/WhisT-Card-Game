"use client";

import { useEffect, useRef } from "react";
import { fetchGameState } from "@/lib/api/client";
import { normalizeGameState } from "@/lib/game/normalize-state";
import type { GameState } from "@/lib/game/types";
import { createClient } from "@/lib/supabase/client";

export function useGameRealtime(code: string, onState: (state: GameState | null) => void) {
  const handlerRef = useRef(onState);
  handlerRef.current = onState;

  useEffect(() => {
    const normalized = code.toUpperCase();
    let cancelled = false;

    async function load() {
      try {
        const state = await fetchGameState(normalized);
        if (!cancelled) handlerRef.current(state ? normalizeGameState(state) : null);
      } catch {
        if (!cancelled) handlerRef.current(null);
      }
    }

    load();

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
            handlerRef.current(normalizeGameState(row.state));
            return;
          }
          void load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [code]);
}
