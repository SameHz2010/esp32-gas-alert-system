"use client";

import { memo, useEffect } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { useToastStore, type ToastItem } from "@/store/toastStore";
import { cn } from "@/lib/utils";

const AUTO_DISMISS_MS = 4200;

export const ToastHost = memo(function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} toast={item} />
      ))}
    </div>
  );
});

const ToastCard = memo(function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const isSuccess = toast.variant === "success";

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.id]);

  return (
    <div
      role="status"
      className={cn(
        "toast-card pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md",
        isSuccess
          ? "border-emerald-400/25 bg-emerald-950/90 text-emerald-50"
          : "border-red-400/25 bg-red-950/90 text-red-50",
      )}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
      )}
      <p className="min-w-0 flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismiss(toast.id)}
        className={cn(
          "shrink-0 rounded-md p-0.5 transition-colors",
          isSuccess
            ? "text-emerald-300/70 hover:bg-emerald-400/10 hover:text-emerald-100"
            : "text-red-300/70 hover:bg-red-400/10 hover:text-red-100",
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});
