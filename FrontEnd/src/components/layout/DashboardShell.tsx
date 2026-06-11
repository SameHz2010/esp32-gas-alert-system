"use client";

import { useCallback, useState } from "react";
import { ROOMS } from "@/lib/constants";
import { useRoomStore } from "@/store/roomStore";
import { useAllRoomsRealtime } from "@/hooks/useRoomRealtime";
import { useLayoutCompact, HEADER_LAYOUT_TRANSITION_MS } from "@/hooks/useLayoutCompact";
import { AppHeader } from "@/components/layout/AppHeader";
import { RoomDashboard } from "@/components/dashboard/RoomDashboard";
import { HistorySection } from "@/components/history/HistorySection";
import { FirebaseErrorBanner } from "@/components/layout/FirebaseErrorBanner";
import { ToastHost } from "@/components/ui/ToastHost";
import { cn } from "@/lib/utils";

type ViewMode = "dashboard" | "history";

export function DashboardShell() {
  const activeRoom = useRoomStore((s) => s.activeRoom);
  const layoutCompact = useLayoutCompact();
  const [view, setView] = useState<ViewMode>("dashboard");
  useAllRoomsRealtime(true);

  const currentRoom = ROOMS.find((r) => r.id === activeRoom)!;
  const showDashboard = useCallback(() => setView("dashboard"), []);
  const showHistory = useCallback(() => setView("history"), []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,152,0,0.12),_transparent_35%),linear-gradient(180deg,#0a0a0a_0%,#111_45%,#050505_100%)]">
      <AppHeader
        view={view}
        onShowDashboard={showDashboard}
        onShowHistory={showHistory}
      />

      <main
        className={cn(
          "mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8",
          layoutCompact && view === "dashboard" ? "py-2" : layoutCompact ? "py-3" : "py-6",
        )}
        style={{
          transition: `padding ${HEADER_LAYOUT_TRANSITION_MS}ms ease-out`,
        }}
      >
        <FirebaseErrorBanner />
        {view === "dashboard" ? (
          <RoomDashboard
            roomId={currentRoom.id}
            roomLabel={currentRoom.label}
            layoutCompact={layoutCompact}
          />
        ) : (
          <HistorySection roomId={currentRoom.id} />
        )}
      </main>
      <ToastHost />
    </div>
  );
}
