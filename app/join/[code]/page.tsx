"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { NameInput } from "@/components/NameInput";
import { fetchRoom, postRoomsAction } from "@/lib/api/client";
import { getOrCreateGuestSession } from "@/lib/session/guest";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [roomExists, setRoomExists] = useState<boolean | null>(null);

  const trimmedName = displayName.trim();
  const isNameValid = trimmedName.length >= 2;

  useEffect(() => {
    async function checkRoom() {
      try {
        const room = await fetchRoom(code);
        if (!room) {
          setRoomExists(false);
          setError("חדר לא נמצא. ייתכן שהקוד שגוי או שהחדר נסגר.");
        } else if (room.status !== "waiting") {
          setRoomExists(false);
          setError("המשחק בחדר זה כבר התחיל.");
        } else if (room.players.length >= room.maxPlayers) {
          setRoomExists(false);
          setError("החדר מלא.");
        } else {
          setRoomExists(true);
        }
      } catch {
        setRoomExists(false);
        setError("שגיאה בטעינת החדר.");
      }
    }
    void checkRoom();
  }, [code]);

  async function handleJoin() {
    setError("");
    if (!isNameValid) {
      setError("יש להזין שם בן לפחות 2 תווים.");
      return;
    }

    setLoading(true);
    try {
      const session = getOrCreateGuestSession(trimmedName);
      const { room } = await postRoomsAction({
        action: "join",
        code,
        playerId: session.playerId,
        displayName: session.displayName,
      });
      if (!room) throw new Error("Join failed");
      router.push(`/room/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהצטרפות. נסה שוב.");
    } finally {
      setLoading(false);
    }
  }

  if (roomExists === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-felt-600/30 via-felt-900 to-felt-900" />

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8">
        {roomExists ? (
          <>
            <header className="mb-8 text-center">
              <p className="text-sm text-white/60">הוזמנת להצטרף לחדר</p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-widest text-gold-400">{code}</p>
            </header>

            <div className="card-surface mb-6 p-5">
              <NameInput value={displayName} onChange={setDisplayName} autoFocus />
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleJoin()}
              disabled={loading || !isNameValid}
            >
              הצטרף לחדר
            </button>
          </>
        ) : (
          <div className="card-surface p-6 text-center">
            <p className="mb-2 font-mono text-xl text-gold-400">{code}</p>
            <p className="mb-6 text-red-200">{error}</p>
            <Link href="/" className="btn-primary inline-flex">
              חזרה לדף הבית
            </Link>
          </div>
        )}

        {error && roomExists && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
