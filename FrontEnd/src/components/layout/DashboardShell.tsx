"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  History,
  LayoutDashboard,
  ShieldAlert,
} from "lucide-react";
import { ROOMS } from "@/lib/constants";
import { useRoomStore } from "@/store/roomStore";
import { useUiStore } from "@/store/uiStore";
import { useAllRoomsRealtime } from "@/hooks/useRoomRealtime";
import { RoomDashboard } from "@/components/dashboard/RoomDashboard";
import { HistorySection } from "@/components/history/HistorySection";
import { FirebaseErrorBanner } from "@/components/layout/FirebaseErrorBanner";
import { cn } from "@/lib/utils";

type ViewMode = "dashboard" | "history";

export function DashboardShell() {
  const activeRoom = useRoomStore((s) => s.activeRoom);
  const setActiveRoom = useRoomStore((s) => s.setActiveRoom);
  const headerCompact = useUiStore((s) => s.headerCompact);
  const toggleHeaderCompact = useUiStore((s) => s.toggleHeaderCompact);
  const [view, setView] = useState<ViewMode>("dashboard");
  useAllRoomsRealtime(activeRoom, view === "dashboard");

  const currentRoom = ROOMS.find((r) => r.id === activeRoom)!;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,152,0,0.12),_transparent_35%),linear-gradient(180deg,#0a0a0a_0%,#111_45%,#050505_100%)]">
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-amber-500/15 bg-black/90 transition-[padding] duration-300",
          headerCompact ? "py-2" : "py-4",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-7xl flex-col px-4 sm:px-6 lg:px-8",
            headerCompact ? "gap-2" : "gap-4",
          )}
        >
          <div
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              headerCompact
                ? "grid-rows-[0fr] opacity-0"
                : "grid-rows-[1fr] opacity-100",
            )}
          >
            <div className="overflow-hidden">
              <div className="animate-fade-in pb-1">
                <div className="mb-1 flex items-center gap-2 text-amber-400">
                  <ShieldAlert className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-[0.3em]">
                    Gas Alert System
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  Sensor Monitoring Dashboard
                </h1>
                <p className="mt-1 text-sm text-stone-400">
                  Real-time Firebase stream for Room 1, Room 2, and Room 3
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {headerCompact && (
                <div className="mr-1 flex items-center gap-1.5 text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Gas Alert
                  </span>
                </div>
              )}
              {ROOMS.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setActiveRoom(room.id)}
                  className={cn(
                    "rounded-full text-sm font-medium transition-all duration-300",
                    headerCompact ? "px-3 py-1.5" : "px-4 py-2",
                    activeRoom === room.id
                      ? "scale-[1.02] bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-[0_0_24px_rgba(255,152,0,0.25)]"
                      : "border border-amber-500/20 bg-black/30 text-stone-300 hover:-translate-y-px hover:border-amber-400/40 hover:bg-black/50",
                  )}
                >
                  {room.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <ViewButton
                active={view === "dashboard"}
                onClick={() => setView("dashboard")}
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Dashboard"
                compact={headerCompact}
              />
              <ViewButton
                active={view === "history"}
                onClick={() => setView("history")}
                icon={<History className="h-4 w-4" />}
                label="History"
                compact={headerCompact}
              />
              <button
                type="button"
                onClick={toggleHeaderCompact}
                title={headerCompact ? "Expand header" : "Compact header"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-black/40 text-stone-300 transition-all duration-300",
                  "hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-100",
                  headerCompact ? "px-2.5 py-1.5" : "px-3 py-2",
                )}
              >
                {headerCompact ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                <span className="hidden text-xs font-medium sm:inline">
                  {headerCompact ? "Expand" : "Compact"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full max-w-7xl px-3 transition-all duration-300 sm:px-6 lg:px-8",
          headerCompact && view === "dashboard" ? "py-2" : headerCompact ? "py-3" : "py-6",
        )}
      >
        <FirebaseErrorBanner />
        {view === "dashboard" ? (
          <RoomDashboard
            roomId={currentRoom.id}
            roomLabel={currentRoom.label}
          />
        ) : (
          <HistorySection roomId={currentRoom.id} />
        )}
      </main>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-300",
        compact ? "px-3 py-1.5" : "px-4 py-2",
        active
          ? "border border-amber-400/40 bg-amber-500/15 text-amber-100 shadow-[0_0_20px_rgba(255,152,0,0.12)]"
          : "border border-white/10 bg-black/30 text-stone-400 hover:-translate-y-px hover:border-amber-400/25 hover:text-stone-200",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
