import { forwardRef, type ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * Sentinel used to represent an "empty" value internally, because Radix Select
 * reserves `""` as the "no selection" placeholder state and throws if an Item has
 * `value=""`. Consumers keep passing `""` normally — the wrapper maps it.
 */
const EMPTY_SENTINEL = "__empty__";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  /** Accessible aria-label when no visible label is attached. */
  ariaLabel?: string;
}

export function Select({
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
  contentClassName,
  children,
  ariaLabel,
}: SelectProps) {
  const internalValue = value === "" ? EMPTY_SENTINEL : value;
  const handleChange = (next: string) => {
    onValueChange(next === EMPTY_SENTINEL ? "" : next);
  };
  return (
    <SelectPrimitive.Root value={internalValue} onValueChange={handleChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "w-full px-4 py-2 border border-slate-200 rounded-lg bg-white",
          "flex items-center justify-between gap-2 text-sm text-left",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "min-h-[40px]",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={16} className="text-slate-400 shrink-0" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            "z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg",
            "w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1rem)]",
            "max-h-[min(var(--radix-select-content-available-height),60vh)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            contentClassName,
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {children}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

interface SelectOptionProps {
  value: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export const SelectOption = forwardRef<HTMLDivElement, SelectOptionProps>(
  ({ value, disabled, children, className }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      value={value === "" ? EMPTY_SENTINEL : value}
      disabled={disabled}
      className={cn(
        // pl-8 оставляет место под абсолютно-позиционированную галочку (left-2 + 14px icon).
        // Важно: отступ именно здесь, а не внутри ItemText — иначе Radix проносит его в Trigger.
        "relative flex items-center gap-2 pl-8 pr-3 py-2 text-sm rounded-md cursor-pointer outline-none",
        "data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700",
        "data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-700",
        "data-[disabled]:opacity-60 data-[disabled]:cursor-not-allowed",
        className,
      )}
    >
      <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
        <Check size={14} />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  ),
);
SelectOption.displayName = "SelectOption";
