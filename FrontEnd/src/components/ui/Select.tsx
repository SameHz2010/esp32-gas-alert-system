import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full appearance-none rounded-xl border border-amber-500/20 bg-black/50 px-3 py-2.5 text-sm text-stone-100 outline-none transition-all duration-200",
        "hover:border-amber-400/30 hover:bg-black/70",
        "focus:border-amber-400/50 focus:bg-black/70 focus:ring-2 focus:ring-amber-400/10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
