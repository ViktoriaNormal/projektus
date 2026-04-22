import { type ReactNode } from "react";
import { Info, Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/cn";

export type InfoCalloutVariant = "info" | "tip" | "warning";

const VARIANT_STYLES: Record<InfoCalloutVariant, { wrap: string; icon: string; title: string; text: string }> = {
  info: {
    wrap: "bg-blue-50 border-blue-200",
    icon: "text-blue-600",
    title: "text-blue-900",
    text: "text-blue-800",
  },
  tip: {
    wrap: "bg-emerald-50 border-emerald-200",
    icon: "text-emerald-600",
    title: "text-emerald-900",
    text: "text-emerald-800",
  },
  warning: {
    wrap: "bg-amber-50 border-amber-200",
    icon: "text-amber-600",
    title: "text-amber-900",
    text: "text-amber-800",
  },
};

const VARIANT_ICON: Record<InfoCalloutVariant, ReactNode> = {
  info: <Info size={18} />,
  tip: <Lightbulb size={18} />,
  warning: <AlertTriangle size={18} />,
};

interface InfoCalloutProps {
  variant?: InfoCalloutVariant;
  title?: ReactNode;
  /** Controls grid layout of children. Defaults to single column. */
  columns?: 1 | 2;
  /** Optional className override for outer wrapper. */
  className?: string;
  children: ReactNode;
  /** When true, renders without the leading (i) icon — useful when parent supplies its own. */
  hideIcon?: boolean;
}

export function InfoCallout({
  variant = "info",
  title,
  columns = 1,
  className,
  hideIcon,
  children,
}: InfoCalloutProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <div className={cn("p-4 border rounded-xl", s.wrap, className)}>
      <div className="flex items-start gap-3">
        {!hideIcon && <span className={cn("shrink-0 mt-0.5", s.icon)}>{VARIANT_ICON[variant]}</span>}
        <div className="min-w-0 flex-1">
          {title && <p className={cn("text-sm font-medium mb-2", s.title)}>{title}</p>}
          <div
            className={cn(
              "text-sm",
              s.text,
              columns === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-1.5" : "space-y-1.5",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface InfoCalloutItemProps {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

function InfoCalloutItem({ icon, children, className }: InfoCalloutItemProps) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

InfoCallout.Item = InfoCalloutItem;
