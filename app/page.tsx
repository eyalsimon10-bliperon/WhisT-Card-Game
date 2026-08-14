"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WhistLogo, WhistWordmark } from "@/components/brand/WhistLogo";
import { NameInput } from "@/components/NameInput";
import { fetchOpenRoomsCount, postRoomsAction } from "@/lib/api/client";
import { getOrCreateGuestSession } from "@/lib/session/guest";
import { ROOM_CODE_LENGTH } from "@/lib/types";

type Tab = "home" | "join";

const ROUND_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 5);

export default function LandingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openRooms, setOpenRooms] = useState(0);
  const [botRounds, setBotRounds] = useState(13);

  const trimmedName = displayName.trim();
  const isNameValid = trimmedName.length >= 2;
  const isCodeValid = roomCode.trim().length === ROOM_CODE_LENGTH;

  useEffect(() => {
    void fetchOpenRoomsCount().then(setOpenRooms).catch(() => setOpenRooms(0));
  }, []);

  function validateName(): boolean {
    if (!isNameValid) {
      setError("יש להזין שם בן לפחות 2 תווים.");
      return false;
    }
    return true;
  }

  async function handleCreateRoom() {
    setError("");
    if (!validateName()) return;

    setLoading(true);
    try {
      const session = getOrCreateGuestSession(trimmedName);
      const { room } = await postRoomsAction({
        action: "create",
        playerId: session.playerId,
        displayName: session.displayName,
      });
      if (!room) throw new Error("No room");
      router.push(`/room/${room.code}`);
    } catch {
      setError("שגיאה ביצירת החדר. נסה שוב.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom() {
    setError("");
    if (!validateName()) return;
    if (!isCodeValid) {
      setError(`יש להזין קוד בן ${ROOM_CODE_LENGTH} תווים.`);
      return;
    }

    setLoading(true);
    try {
      const session = getOrCreateGuestSession(trimmedName);
      const { room } = await postRoomsAction({
        action: "join",
        code: roomCode,
        playerId: session.playerId,
        displayName: session.displayName,
      });
      if (!room) throw new Error("No room");
      router.push(`/room/${room.code}`);
    } catch {
      setError("שגיאה בהצטרפות לחדר. נסה שוב.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePlayVsBots() {
    setError("");
    if (!validateName()) return;

    setLoading(true);
    try {
      const session = getOrCreateGuestSession(trimmedName);
      const result = await postRoomsAction({
        action: "botPractice",
        playerId: session.playerId,
        displayName: session.displayName,
        totalRounds: botRounds,
      });
      if (!result.roomCode) throw new Error("No room");
      router.push(`/room/${result.roomCode}/game`);
    } catch {
      setError("שגיאה בהתחלת משחק נגד בוטים.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickMatch() {
    setError("");
    if (!validateName()) return;

    setLoading(true);
    try {
      const session = getOrCreateGuestSession(trimmedName);
      const { room } = await postRoomsAction({
        action: "quickMatch",
        playerId: session.playerId,
        displayName: session.displayName,
      });
      if (!room) throw new Error("No room");
      router.push(`/room/${room.code}`);
    } catch {
      setError("שגיאה במציאת משחק. נסה שוב.");
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(value: string) {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH);
    setRoomCode(cleaned);
    setError("");
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-felt-600/30 via-felt-900 to-felt-900" />
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-gold-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-40 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 portrait-phone:px-4 portrait-phone:py-6 landscape-phone:max-w-none landscape-phone:px-6 landscape-phone:py-4">
        <header className="mb-8 text-center landscape-phone:mb-4">
          <WhistLogo className="mx-auto h-20 w-20 drop-shadow-lg landscape-phone:h-14 landscape-phone:w-14" />
          <h1 dir="ltr" className="mt-3 text-4xl landscape-phone:mt-1.5 landscape-phone:text-3xl">
            <WhistWordmark />
          </h1>
          <p className="mt-2 text-sm text-white/60">משחק קלפים ל-4 שחקנים</p>
          <p className="mt-1 text-xs text-white/40">Mini-Bridge • מובייל ראשון</p>
        </header>

        <div className="card-surface mb-6 p-5">
          <NameInput value={displayName} onChange={setDisplayName} autoFocus />
        </div>

        <div className="mb-4 flex rounded-xl bg-white/5 p-1">
          <button
            type="button"
            onClick={() => { setActiveTab("home"); setError(""); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${activeTab === "home" ? "bg-gold-500 text-felt-900" : "text-white/70 hover:text-white"}`}
          >
            התחלה מהירה
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("join"); setError(""); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${activeTab === "join" ? "bg-gold-500 text-felt-900" : "text-white/70 hover:text-white"}`}
          >
            הצטרפות עם קוד
          </button>
        </div>

        {activeTab === "home" ? (
          <div className="flex flex-1 flex-col gap-3">
            <div className="card-surface p-4 portrait-phone:p-3">
              <label htmlFor="bot-rounds" className="mb-2 block text-sm text-white/60 portrait-phone:text-xs">
                מספר סיבובים נגד בוטים
              </label>
              <select
                id="bot-rounds"
                value={botRounds}
                onChange={(e) => setBotRounds(Number(e.target.value))}
                className="input-field portrait-phone:py-2 portrait-phone:text-sm"
              >
                {ROUND_OPTIONS.map((n) => (
                  <option key={n} value={n} className="bg-felt-800">
                    {n} סיבובים
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-white/40">ברירת מחדל: 13 סיבובים</p>
            </div>

            <button
              type="button"
              className="btn-primary bg-emerald-600 hover:bg-emerald-500"
              onClick={handlePlayVsBots}
              disabled={loading || !isNameValid}
            >
              <BotIcon />
              משחק נגד בוטים
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleCreateRoom}
              disabled={loading || !isNameValid}
            >
              <PlusIcon />
              צור חדר פרטי
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleQuickMatch}
              disabled={loading || !isNameValid}
            >
              <BoltIcon />
              משחק מהיר
              {openRooms > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {openRooms} פנויים
                </span>
              )}
            </button>

            <p className="text-center text-xs text-white/40">
              משחק בוטים — 3 יריבים חכמים, מתחיל מיד
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2">
              <label htmlFor="room-code" className="block text-sm font-medium text-white/80">
                קוד חדר
              </label>
              <input
                id="room-code"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                className="input-field text-center font-mono text-2xl tracking-[0.3em] uppercase"
                placeholder="ABCDEF"
                value={roomCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                maxLength={ROOM_CODE_LENGTH}
              />
            </div>

            <button
              type="button"
              className="btn-primary mt-auto"
              onClick={handleJoinRoom}
              disabled={loading || !isNameValid || !isCodeValid}
            >
              <DoorIcon />
              הצטרף לחדר
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <footer className="mt-8 text-center text-xs text-white/30">
          מצב הדגמה — נתונים נשמרים מקומית בדפדפן
        </footer>
      </div>
    </main>
  );
}

function BotIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
  );
}
