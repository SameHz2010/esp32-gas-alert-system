import { useToastStore, type ToastVariant } from "@/store/toastStore";

interface ToastOptions {
  message: string;
  variant?: ToastVariant;
}

export function toast({ message, variant = "success" }: ToastOptions) {
  return useToastStore.getState().push({ message, variant });
}

toast.success = (message: string) => toast({ message, variant: "success" });
toast.error = (message: string) => toast({ message, variant: "error" });
