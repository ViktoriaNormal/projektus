import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check, X, Calendar } from "lucide-react";

const DROPDOWN_HEIGHT = 310;

function useDropDirection(ref: React.RefObject<HTMLDivElement | null>, open: boolean) {
  const [dropUp, setDropUp] = useState(false);
  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropUp(spaceBelow < DROPDOWN_HEIGHT && rect.top > spaceBelow);
  }, [open, ref]);
  return dropUp;
}

export interface SprintOption {
  id: string;
  name: string;
  status: "planned" | "active" | "completed";
  startDate: string;
  endDate: string;
}

interface SprintSelectProps {
  options: SprintOption[];
  value: string | null;
  onChange: (sprintId: string | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface SprintMultiSelectProps {
  options: SprintOption[];
  value: string[];
  onChange: (sprintIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: "активный", cls: "bg-green-100 text-green-700" },
  planned: { label: "запланирован", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "завершён", cls: "bg-slate-100 text-slate-600" },
};

function SprintInfo({ sprint, compact }: { sprint: SprintOption; compact?: boolean }) {
  const st = STATUS_LABELS[sprint.status];
  const dates = `${new Date(sprint.startDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })} – ${new Date(sprint.endDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <p className={`font-medium truncate ${compact ? "text-sm" : "text-sm"}`}>{sprint.name}</p>
        {st && <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${st.cls}`}>{st.label}</span>}
      </div>
      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
        <Calendar size={10} className="shrink-0" /> {dates}
      </p>
    </div>
  );
}

// ── Single sprint select ────────────────────────────────────

export function SprintSelect({ options, value, onChange, placeholder = "Не выбран", required, className }: SprintSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const dropUp = useDropDirection(ref, open);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = value ? options.find(s => s.id === value) : null;
  const filtered = options.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className={`relative ${open ? "z-40" : ""} ${className || ""}`}>
      <button type="button" onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors text-left bg-white">
        {selected ? <SprintInfo sprint={selected} compact /> : <span className="text-sm text-slate-400">{placeholder}</span>}
        <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-30 overflow-hidden ${dropUp ? "bottom-full mb-1" : "top-full mt-1"}`}>
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Поиск спринта..." autoFocus />
            </div>
          </div>
          <div className="max-h-[264px] overflow-y-auto">
            {!required && (
              <button type="button" onClick={() => { onChange(null); setOpen(false); }}
                className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 transition-colors text-sm ${!value ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}>
                {placeholder}
              </button>
            )}
            {filtered.map(s => (
              <button key={s.id} type="button" onClick={() => { onChange(s.id); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${value === s.id ? "bg-blue-50" : ""}`}>
                <SprintInfo sprint={s} compact />
                {value === s.id && <Check size={16} className="text-blue-600 shrink-0 ml-2" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Не найдено</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Multi sprint select ─────────────────────────────────────

export function SprintMultiSelect({ options, value, onChange, placeholder = "Выберите спринты...", className }: SprintMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const dropUp = useDropDirection(ref, open);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedSprints = value.map(id => options.find(s => s.id === id)).filter(Boolean) as SprintOption[];
  const filtered = options.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const toggle = (sprintId: string) => {
    onChange(value.includes(sprintId) ? value.filter(id => id !== sprintId) : [...value, sprintId]);
  };

  return (
    <div ref={ref} className={`relative ${open ? "z-40" : ""} ${className || ""}`}>
      <button type="button" onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors text-left bg-white">
        <span className="text-sm truncate">
          {selectedSprints.length > 0
            ? `Выбрано: ${selectedSprints.length}`
            : <span className="text-slate-400">{placeholder}</span>
          }
        </span>
        <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-30 overflow-hidden ${dropUp ? "bottom-full mb-1" : "top-full mt-1"}`}>
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Поиск спринта..." autoFocus />
            </div>
          </div>
          <div className="max-h-[264px] overflow-y-auto">
            {filtered.map(s => {
              const checked = value.includes(s.id);
              return (
                <label key={s.id} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} className="w-4 h-4 text-purple-600 rounded shrink-0" />
                  <SprintInfo sprint={s} compact />
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Не найдено</p>
            )}
          </div>
        </div>
      )}

      {selectedSprints.length > 0 && (
        <div className="space-y-2 mt-2">
          {selectedSprints.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg group">
              <SprintInfo sprint={s} />
              <button onClick={() => toggle(s.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
