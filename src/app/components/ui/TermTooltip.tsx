import { useRef, useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Info } from "lucide-react";
import { cn } from "../../lib/cn";
import { methodologyTerms, type MethodologyTermKey } from "../../data/methodologyTerms";

interface TermTooltipProps {
  /** Key from the centralized methodology-terms dictionary. */
  term?: MethodologyTermKey;
  /** Override or custom label (used in aria-label and in `inline` mode). */
  label?: string;
  /** Override or custom definition shown in the popup. */
  definition?: ReactNode;
  /** When true, renders the label next to the icon. */
  inline?: boolean;
  /** Pixel size of the info icon. Defaults to 14. */
  iconSize?: number;
  /** Additional class names on the wrapper. */
  className?: string;
  /** Additional class names on the label text (inline mode). */
  labelClassName?: string;
  /** Preferred side of the popup. Defaults to "top". */
  side?: "top" | "right" | "bottom" | "left";
  /** Optional bolded title above the definition. */
  title?: string;
}

export function TermTooltip({
  term,
  label: labelProp,
  definition: definitionProp,
  inline,
  iconSize = 14,
  className,
  labelClassName,
  side = "top",
  title,
}: TermTooltipProps) {
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entry = term ? methodologyTerms[term] : undefined;
  const label = labelProp ?? entry?.label;
  const definition = definitionProp ?? entry?.definition;

  if (!definition) return null;

  const openNow = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setOpen(true);
  };
  const closeSoon = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <span className={cn("inline-flex items-center gap-1 align-middle", className)}>
      {inline && label && <span className={labelClassName}>{label}</span>}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={label ? `Определение: ${label}` : "Определение термина"}
            onMouseEnter={openNow}
            onMouseLeave={closeSoon}
            onFocus={openNow}
            onBlur={closeSoon}
            className="inline-flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 rounded-full"
          >
            <Info size={iconSize} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side={side}
            sideOffset={6}
            collisionPadding={12}
            onMouseEnter={openNow}
            onMouseLeave={closeSoon}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-[60] max-w-xs p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg leading-snug"
          >
            {title && <p className="font-medium mb-1">{title}</p>}
            <div className={title ? "" : ""}>{definition}</div>
            <Popover.Arrow className="fill-slate-800" width={10} height={5} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}
