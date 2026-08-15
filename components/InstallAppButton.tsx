"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || installed) return null;

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setIosHint((open) => !open);
  }

  const ios = isIosDevice();

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => void handleInstall()}
        className="btn-secondary w-full"
      >
        <InstallIcon />
        התקן במסך הבית
      </button>
      <p className="mt-2 text-center text-xs text-white/40">
        {ios
          ? "שחקו כמו אפליקציה, בלי לפתוח את הדפדפן"
          : "אפשר להתקין את WhisT על הטלפון"}
      </p>
      {iosHint && (
        <div className="mt-3 rounded-xl border border-gold-400/25 bg-black/25 px-3 py-3 text-center text-sm text-white/80">
          {ios ? (
            <>
              ב-Safari לחצו על{" "}
              <span className="font-semibold text-gold-300">שיתוף</span>
              {" "}ואז{" "}
              <span className="font-semibold text-gold-300">הוספה למסך הבית</span>
            </>
          ) : (
            <>
              בתפריט הדפדפן בחרו{" "}
              <span className="font-semibold text-gold-300">הוספה למסך הבית</span>
              {" "}או{" "}
              <span className="font-semibold text-gold-300">התקנת האפליקציה</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InstallIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
    </svg>
  );
}
