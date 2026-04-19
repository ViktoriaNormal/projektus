import { type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface FormFieldProps {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Inline layout: label on the left, input on the right (desktop). Default is stacked. */
  inline?: boolean;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
  inline,
}: FormFieldProps) {
  return (
    <div className={cn(inline ? "md:grid md:grid-cols-[140px_1fr] md:items-center md:gap-4" : "space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className={cn("block text-sm font-medium text-slate-700", inline ? "mb-1 md:mb-0" : "")}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div>
        {children}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        {!error && hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      </div>
    </div>
  );
}
