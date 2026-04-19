import { type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** compact reduces vertical padding. Useful when embedded in sidebars / small cards. */
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6" : "py-12",
        className,
      )}
    >
      {icon && <div className="text-slate-300 mb-3">{icon}</div>}
      <p className={cn("text-slate-500 font-medium", compact ? "text-sm" : "text-base")}>
        {title}
      </p>
      {description && (
        <p className="text-slate-400 text-sm mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
