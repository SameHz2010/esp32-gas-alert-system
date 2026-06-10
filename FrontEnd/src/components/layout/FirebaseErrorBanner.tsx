"use client";

import { AlertTriangle } from "lucide-react";
import { useConnectionStore } from "@/store/connectionStore";

export function FirebaseErrorBanner() {
  const error = useConnectionStore((s) => s.firebaseError);
  if (!error) return null;

  return (
    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
        <div>
          <p className="font-semibold">Firebase connection error</p>
          <p className="mt-1 text-red-200/90">{error}</p>
          <p className="mt-2 text-xs text-red-200/70">
            Fix: Firebase Console → Authentication → enable Anonymous. Then
            Realtime Database → Rules → allow read on <code>devices</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
