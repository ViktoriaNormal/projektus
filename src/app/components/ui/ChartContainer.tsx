import { type ReactElement, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "../../lib/cn";

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  fontSize: "12px",
};

interface ChartContainerProps {
  /** A single recharts chart element (LineChart / BarChart / ScatterChart / etc.). */
  children: ReactElement;
  /** Desktop chart height in px. Default 300. Mobile auto = desktop * 0.85. */
  height?: number;
  /** Mobile chart height override in px. Default = height * 0.85. */
  mobileHeight?: number;
  /**
   * If true, on screens below md the chart is rendered inside an `overflow-x-auto`
   * container with a minimum width, allowing the chart to scroll horizontally instead
   * of squeezing x-axis ticks.
   */
  scrollableOnMobile?: boolean;
  /** Minimum width (px) of the inner chart when scrollableOnMobile is enabled. Default 480. */
  minWidthOnMobile?: number;
  className?: string;
  /** Optional content rendered above the chart (legend, toggle, etc.). */
  header?: ReactNode;
}

/**
 * Unified wrapper for recharts charts. Handles responsive sizing and optional horizontal
 * scroll on mobile for dense category axes (scatter plots with many task keys, etc.).
 */
export function ChartContainer({
  children,
  height = 300,
  mobileHeight,
  scrollableOnMobile,
  minWidthOnMobile = 480,
  className,
  header,
}: ChartContainerProps) {
  const mh = mobileHeight ?? Math.round(height * 0.85);

  if (scrollableOnMobile) {
    return (
      <div className={cn("w-full", className)}>
        {header}
        {/* Mobile: horizontal scroll wrapper */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto">
          <div style={{ minWidth: minWidthOnMobile, height: mh }}>
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        </div>
        {/* Desktop: regular responsive container */}
        <div className="hidden md:block" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {header}
      {/* Mobile height */}
      <div className="md:hidden" style={{ height: mh }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      {/* Desktop height */}
      <div className="hidden md:block" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
