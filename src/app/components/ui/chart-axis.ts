import type { ComponentProps } from "react";
import type { XAxis, YAxis } from "recharts";
import { formatDate, type DatePreset } from "../../lib/format";

type XAxisProps = ComponentProps<typeof XAxis>;
type YAxisProps = ComponentProps<typeof YAxis>;

/**
 * Default X-axis props for recharts. Spread on a real recharts `<XAxis />` so recharts'
 * internal identity check still passes.
 *
 * Fixes the project-wide problem where recharts drops labels by default
 * (`interval="preserveEnd"`). Also rotates labels when the category count is high.
 */
export function xAxisDefaults(opts?: {
  /** Number of data categories / ticks. Drives rotation and height. */
  count?: number;
  /** Rotate labels when count > this. Default 8. */
  angleAfter?: number;
  /** Format date values with formatDate(preset). If set, adds a tickFormatter. */
  datePreset?: DatePreset;
  /** Override height in px. Default 60 (rotated) / 30 (straight). */
  height?: number;
}): Partial<XAxisProps> {
  const count = opts?.count ?? 0;
  const angleAfter = opts?.angleAfter ?? 8;
  const rotated = count > angleAfter;

  const base: Partial<XAxisProps> = {
    stroke: "#64748b",
    tick: { fontSize: 11 },
    interval: 0,
    minTickGap: 0,
  };

  if (rotated) {
    base.angle = -35;
    base.textAnchor = "end";
    base.height = opts?.height ?? 60;
  } else if (opts?.height != null) {
    base.height = opts.height;
  }

  if (opts?.datePreset) {
    const preset = opts.datePreset;
    base.tickFormatter = (value: unknown) => {
      if (value == null || value === "") return "";
      return formatDate(value as string | Date | number, preset);
    };
  }

  return base;
}

/** Default Y-axis props. */
export function yAxisDefaults(opts?: { width?: number }): Partial<YAxisProps> {
  return {
    stroke: "#64748b",
    tick: { fontSize: 11 },
    width: opts?.width ?? 36,
  };
}
