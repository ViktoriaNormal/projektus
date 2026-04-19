import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, X } from "lucide-react";

// ── DebouncedInput ─────────────────────────────────────────────

export function DebouncedInput({
  value,
  onSave,
  className,
  placeholder,
  required,
  requiredMessage,
}: {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  requiredMessage?: string;
}) {
  const [local, setLocal] = useState(value);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const localRef = useRef(local);
  const onSaveRef = useRef(onSave);
  localRef.current = local;
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!dirtyRef.current) setLocal(value);
  }, [value]);

  function trySave(v: string) {
    if (required && !v.trim()) {
      setError(requiredMessage || "Поле не может быть пустым");
      return;
    }
    setError("");
    onSave(v);
  }

  function handleChange(v: string) {
    setLocal(v);
    if (required && v.trim()) setError("");
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dirtyRef.current = false;
      trySave(v);
    }, 1500);
  }

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        dirtyRef.current = false;
        if (!required || localRef.current.trim()) onSaveRef.current(localRef.current);
      }
    },
    [],
  );

  return (
    <div>
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        className={`${className} ${error ? "border-red-400 ring-2 ring-red-200" : ""}`}
        placeholder={placeholder}
      />
      {error && (
        <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ── DebouncedTextarea ──────────────────────────────────────────

export function DebouncedTextarea({
  value,
  onSave,
  className,
  placeholder,
  rows,
}: {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const localRef = useRef(local);
  const onSaveRef = useRef(onSave);
  localRef.current = local;
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!dirtyRef.current) setLocal(value);
  }, [value]);

  function handleChange(v: string) {
    setLocal(v);
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dirtyRef.current = false;
      onSave(v);
    }, 1500);
  }

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        dirtyRef.current = false;
        onSaveRef.current(localRef.current);
      }
    },
    [],
  );

  return (
    <textarea
      value={local}
      onChange={(e) => handleChange(e.target.value)}
      className={className}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

// ── NoteTextarea ───────────────────────────────────────────────

export function NoteTextarea({ value, onSave }: { value: string | null; onSave: (val: string | null) => void }) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, []);

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  function handleChange(newVal: string) {
    setLocalValue(newVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSave(newVal || null);
    }, 600);
  }

  function handleClear() {
    setLocalValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onSave(null);
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => {
          handleChange(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        rows={1}
        className="w-full px-3 py-1.5 pr-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-hidden"
        placeholder="Правила работы, пояснения для команды..."
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1.5 p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors"
          title="Очистить заметку"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ── WipLimitInput ──────────────────────────────────────────────

export function WipLimitInput({
  value,
  onSave,
}: {
  value: number | null | undefined;
  onSave: (val: number | null) => void;
}) {
  const [local, setLocal] = useState(value == null ? "" : String(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localRef = useRef(local);
  const onSaveRef = useRef(onSave);
  localRef.current = local;
  onSaveRef.current = onSave;

  useEffect(() => {
    setLocal(value == null ? "" : String(value));
  }, [value]);

  function handleChange(raw: string) {
    const cleaned = raw.replace(/[^0-9]/g, "");
    setLocal(cleaned);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSaveRef.current(cleaned === "" ? null : Number(cleaned));
    }, 600);
  }

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        onSaveRef.current(localRef.current === "" ? null : Number(localRef.current));
      }
    },
    [],
  );

  return (
    <div>
      <label className="block text-xs font-medium mb-1">WIP лимит</label>
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Без лимита"
      />
    </div>
  );
}
