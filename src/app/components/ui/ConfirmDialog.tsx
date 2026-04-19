import { type ReactNode, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "./Modal";
import { cn } from "../../lib/cn";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const isDanger = variant === "danger";

  const handleConfirm = async () => {
    try {
      setBusy(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="md">
      <ModalHeader>
        <div className="flex items-start gap-3">
          {isDanger && (
            <div className="shrink-0 mt-0.5">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
          )}
          <div>
            <ModalTitle className={cn(isDanger && "text-red-700")}>{title}</ModalTitle>
          </div>
        </div>
      </ModalHeader>
      {description && (
        <ModalBody className="text-sm text-slate-700 whitespace-pre-line">
          {description}
        </ModalBody>
      )}
      <ModalFooter>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={busy}
          className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm disabled:opacity-60 min-h-[44px] md:min-h-0"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors font-medium text-sm text-white inline-flex items-center gap-2 disabled:opacity-60 min-h-[44px] md:min-h-0",
            isDanger
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
          )}
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  );
}
