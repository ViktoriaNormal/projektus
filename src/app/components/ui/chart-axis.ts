import type { ComponentProps } from "react";
import type { XAxis, YAxis } from "recharts";
import { formatDate, type DatePreset } from "../../lib/format";

type XAxisProps = ComponentProps<typeof XAxis>;
type YAxisProps = ComponentProps<typeof YAxis>;

/** Кегль подписей делений и названий осей (recharts). */
export const CHART_AXIS_FONT_PX = 14;

/**
 * Внешние отступы графика Recharts. Без них подписи оси X и легенда часто обрезаются
 * внутри ResponsiveContainer фиксированной высоты.
 */
/** Легенда сверху — запас под строку легенды в margin.top. */
export const RECHARTS_MARGIN_DEFAULT = {
  top: 36,
  right: 18,
  left: 16,
  bottom: 56,
} as const;

/** Нижняя ось с поворотом подписей, без легенды (dense categories). */
export const RECHARTS_MARGIN_ROTATED_X = {
  top: 36,
  right: 18,
  left: 16,
  bottom: 76,
} as const;

/** Гистограммы: подпись Y слева от оси + заголовок оси X снизу. */
export const RECHARTS_MARGIN_HISTOGRAM = {
  top: 28,
  right: 18,
  left: 64,
  bottom: 100,
} as const;

/** Подпись горизонтальной оси под делениями (единый стиль). */
export function axisTitleXBottom(value: string) {
  return {
    value,
    position: "bottom" as const,
    offset: 8,
    fill: "#64748b",
    style: { fontSize: CHART_AXIS_FONT_PX, textAnchor: "middle" as const },
  };
}

/** Подпись вертикальной оси слева от шкалы (единый стиль). */
export function axisTitleYLeft(value: string, offset: number = 8) {
  return {
    value,
    angle: -90 as const,
    position: "left" as const,
    offset,
    fill: "#64748b",
    style: { fontSize: CHART_AXIS_FONT_PX, textAnchor: "middle" as const },
  };
}

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
    tick: { fontSize: CHART_AXIS_FONT_PX, fill: "#64748b" },
    interval: 0,
    minTickGap: 0,
  };

  if (rotated) {
    base.angle = -35;
    base.textAnchor = "end";
    base.height = opts?.height ?? 80;
  } else if (opts?.height != null) {
    base.height = opts.height;
  } else {
    /* Резерв под подписи делений (тот же кегль, что и у Y). */
    base.height = 56;
    /* Отступы по краям, чтобы первая/последняя подпись не обрезались. */
    if (count >= 2) {
      base.padding = { left: 16, right: 28 };
    }
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
    tick: { fontSize: CHART_AXIS_FONT_PX, fill: "#64748b" },
    width: opts?.width ?? 40,
  };
}
