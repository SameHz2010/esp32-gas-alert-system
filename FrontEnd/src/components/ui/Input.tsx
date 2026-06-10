import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "sm" | "md";
}

export function Input({ className, inputSize = "md", type, ...props }: InputProps) {
  const isNumber = type === "number";

  return (
    <input
      type={isNumber ? "text" : type}
      inputMode={isNumber ? "decimal" : props.inputMode}
      className={cn(
        "w-full rounded-xl border border-amber-500/20 bg-black/50 text-stone-100 outline-none transition-all duration-200",
        "placeholder:text-stone-600",
        "hover:border-amber-400/30 hover:bg-black/70",
        "focus:border-amber-400/50 focus:bg-black/70 focus:ring-2 focus:ring-amber-400/10",
        inputSize === "sm" ? "px-3 py-2 text-sm" : "px-3 py-2.5 text-sm",
        isNumber && "input-no-spinner tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
