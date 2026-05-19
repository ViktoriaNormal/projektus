import type { CSSProperties, ReactElement, ReactNode } from "react";
import {
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  fontSize: "12px",
  lineHeight: 1.45,
  padding: "12px 14px",
  boxShadow: "0 4px 6px -1px rgb(15 23 42 / 0.07), 0 2px 4px -2px rgb(15 23 42 / 0.05)",
};

type ChartSizeable = { width?: number; height?: number };

interface ChartContainerProps {
  /** Один корневой элемент графика Recharts (BarChart / LineChart / …). */
  children: ReactElement;
  /**
   * Высота области графика в пикселях (внутри SVG: сетка, оси, легенда).
   * Задаётся явно — не через процент от родителя, чтобы подписи не обрезались.
   */
  height?: number;
  /** Высота на экранах &lt; md. По умолчанию ≈ 0.88 от height. */
  mobileHeight?: number;
  /**
   * На мобильных график рисуется шире минимум minWidthOnMobile и прокручивается
   * по горизонтали при необходимости.
   */
  scrollableOnMobile?: boolean;
  minWidthOnMobile?: number;
  /**
   * Минимальная ширина графика на всех экранах. Если шире контейнера —
   * включается горизонтальная прокрутка.
   */
  minWidth?: number;
  className?: string;
  header?: ReactNode;
}

/**
 * Обёртка для Recharts: измеряет ширину контейнера и передаёт в график явные
 * width / height. Так подписи осей и легенда не упираются в «height: 100%»
 * от родителя с нулевой/жёсткой высотой.
 */
export function ChartContainer({
  children,
  height = 400,
  mobileHeight,
  scrollableOnMobile,
  minWidthOnMobile = 480,
  minWidth,
  className,
  header,
}: ChartContainerProps) {
  const mh = mobileHeight ?? Math.round(height * 0.88);
  const ref = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);

  const resolveWidth = (floor?: number) => {
    if (cw <= 0) return 0;
    if (!floor) return cw;
    return Math.max(cw, floor);
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      setCw((prev) => (w > 0 && w !== prev ? w : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const injectSize = (w: number, h: number) => {
    if (!isValidElement(children)) return children;
    return cloneElement(children as ReactElement<ChartSizeable>, { width: w, height: h });
  };

  const mobileFloor = scrollableOnMobile
    ? Math.max(minWidth ?? 0, minWidthOnMobile)
    : minWidth;
  const mobileW = resolveWidth(mobileFloor);
  const desktopW = resolveWidth(minWidth);
  const desktopScroll = minWidth != null && desktopW > cw && cw > 0;
  const mobileScroll = mobileFloor != null && mobileW > cw && cw > 0;

  const renderChart = (w: number, h: number, scroll: boolean) => (
    <div
      className={cn(scroll && "overflow-x-auto overflow-y-visible")}
      style={{ minHeight: h }}
    >
      <div className="overflow-visible" style={{ width: scroll ? w : "100%", minHeight: h }}>
        {w > 0 ? injectSize(w, h) : <div style={{ minHeight: h }} aria-hidden className="w-full" />}
      </div>
    </div>
  );

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {header}
      {scrollableOnMobile ? (
        <>
          <div className="md:hidden -mx-4 px-4">
            {renderChart(mobileW, mh, mobileScroll)}
          </div>
          <div className="hidden md:block">
            {renderChart(desktopW, height, desktopScroll)}
          </div>
        </>
      ) : (
        <>
          <div className="md:hidden">
            {renderChart(resolveWidth(minWidth), mh, minWidth != null && mobileW > cw && cw > 0)}
          </div>
          <div className="hidden md:block">
            {renderChart(desktopW, height, desktopScroll)}
          </div>
        </>
      )}
    </div>
  );
}


