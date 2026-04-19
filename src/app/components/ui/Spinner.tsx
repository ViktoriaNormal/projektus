import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 16, className }: SpinnerProps) {
  return <Loader2 size={size} className={cn("animate-spin", className)} />;
}

interface PageSpinnerProps {
  size?: number;
  className?: string;
  label?: string;
  /** Tailwind text color class for the spinner icon. Default text-blue-600. */
  tone?: string;
}

export function PageSpinner({ size = 32, className, label, tone = "text-blue-600" }: PageSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 gap-3", className)}>
      <Loader2 size={size} className={cn("animate-spin", tone)} />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}
