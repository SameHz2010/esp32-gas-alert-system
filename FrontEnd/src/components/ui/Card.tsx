import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  alert?: boolean;
  hoverable?: boolean;
}

export function Card({
  className,
  alert,
  hoverable = true,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-500/20 bg-zinc-950/80 p-4 shadow-[0_0_30px_rgba(0,0,0,0.35)]",
        hoverable &&
          "transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-amber-400/35 hover:shadow-[0_12px_40px_rgba(255,152,0,0.12)]",
        alert && "alert-border-pulse",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
