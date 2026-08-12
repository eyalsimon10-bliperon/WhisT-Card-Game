"use client";

import { useEffect, useRef } from "react";
import { fetchRoom } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";

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

    load();

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
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [code]);
}
