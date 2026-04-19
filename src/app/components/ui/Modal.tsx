import { forwardRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";

const SIZE_MAP: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: ModalSize;
  children: ReactNode;
  className?: string;
  /** Prevent closing on outside click / Esc. Useful for forms with unsaved changes. */
  disableDismiss?: boolean;
  /** Hide the default close button in the top-right corner. */
  hideCloseButton?: boolean;
  /** Accessible title for screen readers when no visible title is used. */
  ariaLabel?: string;
}

export function Modal({
  open,
  onOpenChange,
  size = "md",
  children,
  className,
  disableDismiss,
  hideCloseButton,
  ariaLabel,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-label={ariaLabel}
          aria-describedby={undefined}
          onPointerDownOutside={(e) => {
            if (disableDismiss) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (disableDismiss) e.preventDefault();
          }}
          className={cn(
            "fixed z-50 bg-white rounded-2xl shadow-xl flex flex-col",
            "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-[calc(100vw-2rem)] max-h-[90vh]",
            SIZE_MAP[size],
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className,
          )}
        >
          {!hideCloseButton && (
            <Dialog.Close
              className="absolute top-3 right-3 z-10 p-2 rounded-lg hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 inline-flex items-center justify-center"
              aria-label="Закрыть"
            >
              <X size={20} className="text-slate-600" />
            </Dialog.Close>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ModalSlotProps {
  children: ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalSlotProps) {
  return (
    <div className={cn("px-6 pt-6 pb-4 border-b border-slate-200 shrink-0 pr-14", className)}>
      {children}
    </div>
  );
}

export const ModalTitle = forwardRef<HTMLHeadingElement, ModalSlotProps>(
  ({ children, className }, ref) => (
    <Dialog.Title
      ref={ref}
      className={cn("text-xl font-bold text-slate-900", className)}
    >
      {children}
    </Dialog.Title>
  ),
);
ModalTitle.displayName = "ModalTitle";

export const ModalDescription = forwardRef<HTMLParagraphElement, ModalSlotProps>(
  ({ children, className }, ref) => (
    <Dialog.Description
      ref={ref}
      className={cn("text-sm text-slate-600 mt-1", className)}
    >
      {children}
    </Dialog.Description>
  ),
);
ModalDescription.displayName = "ModalDescription";

export function ModalBody({ children, className }: ModalSlotProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-6 py-5", className)}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className }: ModalSlotProps) {
  return (
    <div className={cn("px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0 flex-wrap", className)}>
      {children}
    </div>
  );
}
