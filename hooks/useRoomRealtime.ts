"use client";

import { useEffect, useRef } from "react";
import { fetchRoom } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";

const POLL_MS = 2000;

export function useRoomRealtime(code: string, onRoom: (room: Room | null) => void) {
  const handlerRef = useRef(onRoom);
  handlerRef.current = onRoom;

  useEffect(() => {
    const normalized = code.toUpperCase();
    let cancelled = false;

    async function load() {
      try {
        const room = await fetchRoom(normalized);
        if (!cancelled) handlerRef.current(room);
      } catch {
        if (!cancelled) handlerRef.current(null);
      }
    }

    void load();

    const supabase = createClient();
    const channel = supabase
      .channel(`room:${normalized}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `code=eq.${normalized}` },
        () => {
          void load();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_code=eq.${normalized}` },
        () => {
          void load();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void load();
        }
      });

    // Fallback when Realtime is flaky / silent (common with SSR browser clients)
    const pollId = window.setInterval(() => {
      void load();
    }, POLL_MS);

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
