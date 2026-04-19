import { toast } from "sonner";

export function extractErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

export function toastError(e: unknown, fallback: string): void {
  toast.error(extractErrorMessage(e, fallback));
}
