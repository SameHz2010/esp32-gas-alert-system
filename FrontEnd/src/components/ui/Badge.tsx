import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-200",
        className,
      )}
    >
      {children}
    </span>
  );
}
