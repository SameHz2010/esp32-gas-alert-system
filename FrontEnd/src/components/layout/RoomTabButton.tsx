"use client";

import { memo } from "react";
import type { RoomId } from "@/lib/constants";
import { getGlowLevel, getLabelMeta } from "@/lib/statusGlow";
import type { SensorReading } from "@/lib/types";
import { useHoverIntent } from "@/hooks/useHoverIntent";
import { RoomTabTooltip } from "@/components/layout/RoomTabTooltip";
import { cn } from "@/lib/utils";

interface RoomTabButtonProps {
  roomId: RoomId;
  label: string;
  gasLabel: number;
  latestReading?: SensorReading;
  isActive: boolean;
  compact?: boolean;
  onClick: () => void;
}

export const RoomTabButton = memo(function RoomTabButton({
  roomId,
  label,
  gasLabel,
  latestReading,
  isActive,
  compact,
  onClick,
}: RoomTabButtonProps) {
  const meta = getLabelMeta(gasLabel);
  const glowLevel = getGlowLevel(gasLabel);
  const { hovered, hoverHandlers } = useHoverIntent();

  return (
    <span
      className="room-tab-wrap relative inline-flex overflow-visible"
      {...hoverHandlers}
    >
      <span
        className={cn(
          "room-tab-shell inline-flex rounded-full",
          isActive && "room-tab-shell-active",
          glowLevel === "danger" && "room-tab-danger",
          glowLevel === "warning" && "room-tab-warning",
        )}
        style={
          {
            "--room-state-color": meta.color,
          } as React.CSSProperties
        }
        data-gas-label={gasLabel}
        data-gas-state={meta.name}
      >
        <span className="room-tab-border-beam" aria-hidden />
        <button
          type="button"
          onClick={onClick}
          data-room={roomId}
          data-active={isActive || undefined}
          aria-label={`${label}, ${meta.name}`}
          className={cn(
            "room-tab-inner relative z-[1] rounded-full text-sm font-medium",
            compact ? "px-3 py-1.5" : "px-4 py-2",
            isActive && "room-tab-inner-active",
          )}
        >
          <span className="room-tab-inner-content inline-flex items-center gap-2">
            <span
              className={cn(
                "room-tab-status-dot shrink-0 rounded-full transition-[background-color,box-shadow] duration-500 ease-out",
                compact ? "h-2 w-2" : "h-2.5 w-2.5",
              )}
              style={{ backgroundColor: meta.color }}
            />
            <span className="room-tab-label">{label}</span>
          </span>
        </button>
      </span>

      <RoomTabTooltip
        visible={hovered}
        roomLabel={label}
        gasLabel={gasLabel}
        latest={latestReading}
      />
    </span>
  );
});
