"use client";

import { AlertTriangle } from "lucide-react";
import { ROOMS } from "@/lib/constants";
import { useConnectionStore } from "@/store/connectionStore";

export function FirebaseErrorBanner() {
  const firebaseErrors = useConnectionStore((s) => s.firebaseErrors);
  const entries = ROOMS.map((room) => ({
    room,
    message: firebaseErrors[room.id],
  })).filter((entry): entry is { room: (typeof ROOMS)[number]; message: string } =>
    Boolean(entry.message),
  );

  if (entries.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {entries.map(({ room, message }) => (
        <div
          key={room.id}
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div>
              <p className="font-semibold">
                Firebase connection error — {room.label}
              </p>
              <p className="mt-1 text-red-200/90">{message}</p>
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-red-200/70">
        Fix: Firebase Console → Authentication → enable Anonymous. Then Realtime
        Database → Rules → allow read on <code>devices</code>.
      </p>
    </div>
  );
}
