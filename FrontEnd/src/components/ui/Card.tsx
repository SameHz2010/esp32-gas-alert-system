import { memo } from "react";
import type { GlowLevel } from "@/lib/statusGlow";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @deprecated Use glowLevel instead */
  alert?: boolean;
  glowLevel?: GlowLevel;
  hoverable?: boolean;
  variant?: "default" | "hero" | "metric";
}

export const Card = memo(function Card({
  className,
  alert,
  glowLevel = "none",
  hoverable = true,
  variant = "default",
  children,
  ...props
}: CardProps) {
  const resolvedGlow: GlowLevel =
    alert ? "danger" : glowLevel;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-zinc-950/80 p-4 shadow-[0_0_30px_rgba(0,0,0,0.35)]",
        variant === "hero" &&
          "border-amber-500/35 shadow-[0_0_40px_rgba(255,152,0,0.08)]",
        variant === "metric" && "border-white/10 bg-zinc-950/60",
        variant === "default" && "border-amber-500/20",
        hoverable &&
          "transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-amber-400/35 hover:shadow-[0_12px_40px_rgba(255,152,0,0.12)]",
        resolvedGlow === "danger" && "glow-danger",
        resolvedGlow === "warning" && "glow-warning",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
