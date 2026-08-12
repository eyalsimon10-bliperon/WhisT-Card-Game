"use client";

import { useEffect, useState } from "react";
import { getGuestSession } from "@/lib/session/guest";

interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  autoFocus?: boolean;
}

export function NameInput({ value, onChange, id = "display-name", autoFocus }: NameInputProps) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const session = getGuestSession();
    if (session && !value) {
      onChange(session.displayName);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-white/80">
        שם לתצוגה
      </label>
      <input
        id={id}
        type="text"
        className="input-field"
        placeholder="הכנס את שמך..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={20}
        autoFocus={autoFocus && hydrated}
        autoComplete="nickname"
      />
      <p className="text-xs text-white/45">אין צורך בהרשמה — משחקים כאורח</p>
    </div>
  );
}
