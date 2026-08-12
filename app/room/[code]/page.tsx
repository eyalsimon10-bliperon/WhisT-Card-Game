"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchGameState, postGameAction, postRoomsAction } from "@/lib/api/client";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { getGuestSession } from "@/lib/session/guest";
import type { Room } from "@/lib/types";
import { MAX_PLAYERS } from "@/lib/types";

const ROUND_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 5);

export default function RoomLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [totalRounds, setTotalRounds] = useState(13);
  const [starting, setStarting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useRoomRealtime(code, setRoom);

  useEffect(() => {
    const session = getGuestSession();
    if (!session) {
      router.replace(`/join/${code}`);
      return;
    }

    async function init() {
      try {
        const result = await postRoomsAction({
          action: "join",
          code,
          playerId: session!.playerId,
          displayName: session!.displayName,
        });

        if (!result.room) {
          setError("שגיאה בהצטרפות לחדר");
          setInitialized(true);
          return;
        }

        const current = result.room;
        setRoom(current);
        setTotalRounds(current.totalRounds ?? 13);

        if (current.status === "playing") {
          const inRoom = current.players.some((p) => p.id === session!.playerId);
          if (inRoom) {
            const game = await fetchGameState(code);
            if (game && game.phase !== "game_over") {
              router.replace(`/room/${code}/game`);
              return;
            }
            await postRoomsAction({ action: "resetWaiting", code });
          } else {
            setError("המשחק בחדר זה כבר התחיל.");
            setInitialized(true);
            return;
          }
        }

        setInitialized(true);
      } catch {
        setError("חדר לא נמצא. ייתכן שהחדר נסגר.");
        setInitialized(true);
      }
    }

    void init();
  }, [code, router]);

  useEffect(() => {
    if (!initialized || !room) return;
    const session = getGuestSession();
    if (!session) return;

    if (room.status === "playing") {
      const inRoom = room.players.some((p) => p.id === session.playerId);
      if (inRoom) {
        router.replace(`/room/${code}/game`);
      }
    }
  }, [room, initialized, code, router]);

  const session = typeof window !== "undefined" ? getGuestSession() : null;
  const isHost = session && room ? room.hostId === session.playerId : false;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : "";

  function handleCopyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    if (session) {
      await postRoomsAction({ action: "leave", code, playerId: session.playerId });
    }
    router.push("/");
  }

  async function handleStartGame() {
    if (!session || !room || !isHost) return;

    setStarting(true);
    setError("");
    try {
      await postGameAction(code, session.playerId, {
        type: "start",
        totalRounds,
      });
      router.push(`/room/${code}/game`);
    } catch {
      await postRoomsAction({ action: "resetWaiting", code });
      setError("שגיאה בהתחלת המשחק");
      setStarting(false);
    }
  }

  if (!initialized || !room) {
    if (error) {
      return (
        <main className="flex min-h-dvh items-center justify-center px-5">
          <div className="card-surface max-w-sm p-6 text-center">
            <p className="mb-4 text-red-200">{error}</p>
            <Link href="/" className="btn-primary inline-flex">
              חזרה לדף הבית
            </Link>
          </div>
        </main>
      );
    }
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
      </main>
    );
  }

  const emptySeats = MAX_PLAYERS - room.players.length;

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-felt-600/20 via-felt-900 to-felt-900" />

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6 portrait-phone:px-4 landscape-phone:max-w-none landscape-phone:px-6 landscape-phone:py-4">
        <header className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => void handleLeave()}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="עזוב חדר"
          >
            <ArrowRightIcon />
          </button>
          <div className="text-center">
            <p className="text-xs text-white/50">קוד חדר</p>
            <button
              type="button"
              onClick={handleCopyCode}
              className="font-mono text-2xl font-bold tracking-widest text-gold-400"
            >
              {code}
            </button>
          </div>
          <div className="w-10" />
        </header>

        <div className="card-surface mb-6 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">שחקנים</p>
              <p className="text-2xl font-bold">
                {room.players.length}
                <span className="text-lg text-white/40">/{MAX_PLAYERS}</span>
              </p>
            </div>
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300">
              {emptySeats > 0 ? `${emptySeats} ימולאו בבוטים` : "מוכן"}
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gold-500 transition-all duration-500"
              style={{ width: `${(room.players.length / MAX_PLAYERS) * 100}%` }}
            />
          </div>
        </div>

        {isHost && (
          <div className="card-surface mb-6 p-4">
            <label htmlFor="rounds" className="mb-2 block text-sm text-white/60">
              מספר סיבובים
            </label>
            <select
              id="rounds"
              value={totalRounds}
              onChange={(e) => setTotalRounds(Number(e.target.value))}
              className="input-field"
            >
              {ROUND_OPTIONS.map((n) => (
                <option key={n} value={n} className="bg-felt-800">
                  {n} סיבובים
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-white/40">ברירת מחדל: 13 סיבובים</p>
          </div>
        )}

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-white/60">שחקנים בחדר</h2>
          <ul className="space-y-2">
            {room.players.map((player, index) => {
              const isMe = session?.playerId === player.id;
              return (
                <li
                  key={player.id}
                  className={`card-surface flex items-center gap-3 p-3 ${isMe ? "border-gold-500/30 bg-gold-500/5" : ""}`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      player.isHost
                        ? "bg-gold-500/20 text-gold-400"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {player.name}
                      {isMe && <span className="mr-1 text-xs text-white/40">(את/ה)</span>}
                    </p>
                    <p className="text-xs text-white/40">
                      {player.isHost ? "מארח/ת" : `שחקן ${index + 1}`}
                    </p>
                  </div>
                  {player.isHost && (
                    <span className="rounded-md bg-gold-500/15 px-2 py-0.5 text-xs text-gold-400">
                      👑
                    </span>
                  )}
                </li>
              );
            })}

            {Array.from({ length: emptySeats }).map((_, i) => (
              <li
                key={`empty-${i}`}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                  <span className="text-white/20">🤖</span>
                </div>
                <p className="text-sm text-white/30">בוט (ימולא בהתחלה)</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-auto space-y-3">
          <button type="button" className="btn-secondary" onClick={handleCopyLink}>
            <ShareIcon />
            {copied ? "הועתק!" : "שתף קישור לחדר"}
          </button>

          {isHost ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleStartGame()}
              disabled={starting}
            >
              <PlayIcon />
              {starting ? "מתחיל..." : "התחל משחק"}
            </button>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/50">
              ממתין למארח/ת להתחיל...
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
