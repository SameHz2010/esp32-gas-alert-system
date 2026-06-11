"use client";

import { AlertTriangle, Clock, Loader2, X } from "lucide-react";
import { LABEL_META } from "@/lib/constants";
import { formatTimeKey } from "@/lib/date";
import type { SensorReading } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  count?: number;
  previewRecords?: SensorReading[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  loading,
  count,
  previewRecords = [],
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const total = count ?? previewRecords.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-black/80 animate-fade-in"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[min(92vh,680px)] w-full max-w-lg animate-scale-in flex-col overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-stone-500 transition hover:bg-white/5 hover:text-stone-300"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="shrink-0 px-5 pb-3 pt-6 text-center sm:px-6 sm:pt-7">
          <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-red-500/15" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-red-400/40 bg-red-500/15 shadow-[0_0_24px_rgba(239,68,68,0.2)]">
              <AlertTriangle
                className="h-7 w-7 text-red-400"
                strokeWidth={2.2}
              />
            </div>
          </div>

          {total > 1 && (
            <span className="mb-2 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-200">
              {total} records
            </span>
          )}

          <h3 className="text-lg font-bold text-white sm:text-xl">{title}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-400">
            {message}
          </p>
        </div>

        {previewRecords.length > 0 && (
          <div className="min-h-0 flex-1 px-5 sm:px-6">
            <div className="flex h-full min-h-0 flex-col rounded-xl border border-white/8 bg-black/40">
              <div className="flex shrink-0 items-center justify-between border-b border-white/6 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Preview
                </p>
                <p className="text-xs text-stone-500">
                  {previewRecords.length}
                  {total > previewRecords.length
                    ? ` of ${total}`
                    : ""}{" "}
                  shown
                </p>
              </div>
              <ul className="dialog-preview-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
                {previewRecords.map((record) => (
                  <PreviewRow key={`${record.dateKey}_${record.timeKey}`} record={record} />
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-4 flex shrink-0 gap-3 border-t border-white/8 bg-black/30 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={cn(secondaryBtn, "flex-1")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(dangerBtn, "flex-1", loading && "opacity-80")}
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ record }: { record: SensorReading }) {
  const meta = LABEL_META[record.label] ?? LABEL_META[0];

  return (
    <li className="flex items-center gap-2 rounded-lg border border-white/6 bg-black/30 px-2.5 py-2">
      <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
      <span className="shrink-0 font-mono text-xs font-semibold text-white">
        {formatTimeKey(record.timeKey)}
      </span>
      <span
        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-black"
        style={{ backgroundColor: meta.color }}
      >
        {record.label} · {meta.name}
      </span>
      <span className="min-w-0 truncate text-[11px] text-stone-400">
        H {record.humidity.toFixed(1)}% · T {record.temperature.toFixed(1)}° ·
        G {record.gas}
      </span>
    </li>
  );
}

const secondaryBtn =
  "rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm font-medium text-stone-300 transition-all duration-200 hover:border-white/20 hover:bg-white/5 disabled:opacity-50";

const dangerBtn =
  "rounded-xl border border-red-500/40 bg-gradient-to-r from-red-600/80 to-red-500/70 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all duration-200 hover:from-red-500 hover:to-red-400 disabled:cursor-not-allowed";
