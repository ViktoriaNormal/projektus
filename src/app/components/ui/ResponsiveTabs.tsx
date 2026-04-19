import { type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { ScrollableTabs } from "./ScrollableTabs";

export interface ResponsiveTab {
  id: string;
  label: ReactNode;
  /** Short text form for the mobile <select> fallback. Falls back to String(label) if omitted. */
  textLabel?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

interface ResponsiveTabsProps {
  tabs: ResponsiveTab[];
  activeId: string;
  onChange: (id: string) => void;
  /** "scroll" always horizontally scrolls. "select" uses native select on mobile. "auto" picks based on tab count/length. */
  variant?: "scroll" | "select" | "auto";
  className?: string;
}

function shouldUseSelect(tabs: ResponsiveTab[]): boolean {
  if (tabs.length > 4) return true;
  return tabs.some((t) => {
    const label = t.textLabel ?? (typeof t.label === "string" ? t.label : "");
    return label.length > 14;
  });
}

/**
 * Adaptive tab bar. Desktop: pill row. Mobile: either horizontal scroll or native <select>
 * depending on variant.
 */
export function ResponsiveTabs({
  tabs,
  activeId,
  onChange,
  variant = "auto",
  className,
}: ResponsiveTabsProps) {
  const useSelect = variant === "select" || (variant === "auto" && shouldUseSelect(tabs));

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile variant */}
      {useSelect ? (
        <div className="md:hidden">
          <select
            value={activeId}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {tabs.map((t) => (
              <option key={t.id} value={t.id} disabled={t.disabled}>
                {t.textLabel ?? (typeof t.label === "string" ? t.label : t.id)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="md:hidden">
          <ScrollableTabs>
            {tabs.map((t) => (
              <TabButton
                key={t.id}
                tab={t}
                isActive={activeId === t.id}
                onClick={() => onChange(t.id)}
              />
            ))}
          </ScrollableTabs>
        </div>
      )}

      {/* Desktop variant: always row */}
      <div className="hidden md:flex flex-wrap gap-2">
        {tabs.map((t) => (
          <TabButton
            key={t.id}
            tab={t}
            isActive={activeId === t.id}
            onClick={() => onChange(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: ResponsiveTab;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={tab.disabled}
      className={cn(
        "px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap",
        "min-h-[44px] md:min-h-0",
        isActive
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
          : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200",
        tab.disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {tab.icon}
      {tab.label}
      {tab.badge != null && (
        <span
          className={cn(
            "px-1.5 py-0.5 text-xs rounded-full",
            isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700",
          )}
        >
          {tab.badge}
        </span>
      )}
    </button>
  );
}
