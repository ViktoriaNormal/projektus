import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

interface ScrollableTabsProps {
  children: ReactNode;
  className?: string;
  /** Content rendered after the tabs, always visible (e.g. "+ Add" button). */
  trailing?: ReactNode;
}

/**
 * Horizontal scroll container for tab rows that may overflow on narrow screens.
 * Provides edge scroll arrows when content doesn't fit.
 * Tabs themselves (children) stay as-is — wrapper only adds scroll behaviour.
 */
export function ScrollableTabs({ children, className, trailing }: ScrollableTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 2);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scrollBy = (dx: number) => {
    scrollRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      {showLeft && (
        <button
          type="button"
          aria-label="Прокрутить влево"
          onClick={() => scrollBy(-200)}
          className="shrink-0 hidden md:inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50"
        >
          <ChevronLeft size={16} />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        {children}
      </div>
      {showRight && (
        <button
          type="button"
          aria-label="Прокрутить вправо"
          onClick={() => scrollBy(200)}
          className="shrink-0 hidden md:inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50"
        >
          <ChevronRight size={16} />
        </button>
      )}
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
