"use client";

import { memo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
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
import { HEADER_LAYOUT_TRANSITION_MS } from "@/hooks/useLayoutCompact";
import { RoomTabButton } from "@/components/layout/RoomTabButton";
import { cn } from "@/lib/utils";

type ViewMode = "dashboard" | "history";

interface AppHeaderProps {
  view: ViewMode;
  onShowDashboard: () => void;
  onShowHistory: () => void;
}

export const AppHeader = memo(function AppHeader({
  view,
  onShowDashboard,
  onShowHistory,
}: AppHeaderProps) {
  const activeRoom = useRoomStore((s) => s.activeRoom);
  const setActiveRoom = useRoomStore((s) => s.setActiveRoom);
  const headerCompact = useUiStore((s) => s.headerCompact);
  const toggleHeaderCompact = useUiStore((s) => s.toggleHeaderCompact);
  const roomSnapshots = useRoomStore(
    useShallow((s) => ({
      room_1: s.readings.room_1[0],
      room_2: s.readings.room_2[0],
      room_3: s.readings.room_3[0],
    })),
  );

  const handleRoomSelect = useCallback(
    (roomId: (typeof ROOMS)[number]["id"]) => () => setActiveRoom(roomId),
    [setActiveRoom],
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 overflow-visible border-b border-amber-500/15 bg-black/90",
        headerCompact ? "py-2" : "py-4",
      )}
      style={{
        transitionProperty: "padding",
        transitionDuration: `${HEADER_LAYOUT_TRANSITION_MS}ms`,
        transitionTimingFunction: "ease-out",
      }}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl flex-col overflow-visible px-4 sm:px-6 lg:px-8",
          headerCompact ? "gap-2" : "gap-4",
        )}
      >
        <div
          className="overflow-hidden ease-out"
          style={{
            maxHeight: headerCompact ? 0 : "8.5rem",
            transition: `max-height ${HEADER_LAYOUT_TRANSITION_MS}ms ease-out`,
          }}
          aria-hidden={headerCompact}
        >
          <div className="pb-1">
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

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 overflow-visible">
            {headerCompact && (
              <div className="mr-1 flex items-center gap-1.5 text-amber-400">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Gas Alert
                </span>
              </div>
            )}
            {ROOMS.map((room) => {
              const snapshot = roomSnapshots[room.id];
              return (
                <RoomTabButton
                  key={room.id}
                  roomId={room.id}
                  label={room.label}
                  gasLabel={snapshot?.label ?? 0}
                  latestReading={snapshot}
                  isActive={activeRoom === room.id}
                  compact={headerCompact}
                  onClick={handleRoomSelect(room.id)}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <ViewButton
              active={view === "dashboard"}
              onClick={onShowDashboard}
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
              compact={headerCompact}
            />
            <ViewButton
              active={view === "history"}
              onClick={onShowHistory}
              icon={<History className="h-4 w-4" />}
              label="History"
              compact={headerCompact}
            />
            <button
              type="button"
              onClick={toggleHeaderCompact}
              title={headerCompact ? "Expand header" : "Compact header"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-black/40 text-stone-300",
                "transition-[border-color,background-color,color] duration-200",
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
  );
});

const ViewButton = memo(function ViewButton({
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
        "inline-flex items-center gap-2 rounded-xl text-sm font-medium",
        "transition-[transform,border-color,background-color,box-shadow,color] duration-200",
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
});
