"use client";

import { useEffect, useRef } from "react";
import { fetchRoom } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";

const POLL_SUBSCRIBED_MS = 5000;
const POLL_UNSUBSCRIBED_MS = 2000;

function fingerprint(room: Room | null): string {
  if (!room) return "";
  return `${room.code}:${room.status}:${room.hostId}:${room.players.map((p) => p.id).join(",")}`;
}

export function useRoomRealtime(code: string, onRoom: (room: Room | null) => void) {
  const handlerRef = useRef(onRoom);
  handlerRef.current = onRoom;

  useEffect(() => {
    const normalized = code.toUpperCase();
    let cancelled = false;
    let inFlight = false;
    let subscribed = false;
    let lastPrint = "";
    let pollId = 0;

    function emit(room: Room | null) {
      const print = fingerprint(room);
      if (print === lastPrint) return;
      lastPrint = print;
      handlerRef.current(room);
    }

    async function load() {
      if (cancelled || inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const room = await fetchRoom(normalized);
        if (!cancelled) emit(room);
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
