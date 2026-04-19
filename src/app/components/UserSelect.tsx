import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Search, X, Copy, Check } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { toast } from "sonner";

export interface UserOption {
  id: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
}

interface UserSelectProps {
  options: UserOption[];
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface UserMultiSelectProps {
  options: UserOption[];
  value: string[];
  onChange: (userIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

const DROPDOWN_HEIGHT = 310; // approx max height of dropdown (search + 6 items)

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

// ── Single user select with search dropdown ─────────────────

export function UserSelect({ options, value, onChange, placeholder = "Не выбран", required, className }: UserSelectProps) {
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

  const selected = value ? options.find(u => u.id === value) : null;
  const filtered = options.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={ref} className={`relative ${open ? "z-40" : ""} ${className || ""}`}>
      <button type="button" onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors text-left bg-white">
        {selected ? (
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar user={{ fullName: selected.fullName, avatarUrl: selected.avatarUrl }} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{selected.fullName}</p>
              {selected.email && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500 truncate">{selected.email}</span>
                  <span role="button" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(selected.email!); toast.success("Email скопирован"); }}
                    className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"><Copy size={11} /></span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-400">{placeholder}</span>
        )}
        <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-30 overflow-hidden ${dropUp ? "bottom-full mb-1" : "top-full mt-1"}`}>
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Поиск..." autoFocus />
            </div>
          </div>
          <div className="max-h-[264px] overflow-y-auto">
            {!required && (
              <button type="button" onClick={() => { onChange(null); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors text-sm ${!value ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}>
                {placeholder}
              </button>
            )}
            {filtered.map(u => (
              <button key={u.id} type="button" onClick={() => { onChange(u.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${value === u.id ? "bg-blue-50" : ""}`}>
                <UserAvatar user={{ fullName: u.fullName, avatarUrl: u.avatarUrl }} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.fullName}</p>
                  {u.email && <p className="text-xs text-slate-500 truncate">{u.email}</p>}
                </div>
                {value === u.id && <Check size={16} className="text-blue-600 shrink-0 ml-auto" />}
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

// ── Multi user select with search + checkboxes ──────────────

export function UserMultiSelect({ options, value, onChange, placeholder = "Выберите пользователей...", className }: UserMultiSelectProps) {
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

  const selectedUsers = value.map(id => options.find(u => u.id === id)).filter(Boolean) as UserOption[];
  const filtered = options.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (userId: string) => {
    onChange(value.includes(userId) ? value.filter(id => id !== userId) : [...value, userId]);
  };

  return (
    <div ref={ref} className={`relative ${open ? "z-40" : ""} ${className || ""}`}>
      <button type="button" onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center justify-between px-4 py-2 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors text-left bg-white">
        <span className="text-sm truncate">
          {selectedUsers.length > 0
            ? `Выбрано: ${selectedUsers.length}`
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
                placeholder="Поиск..." autoFocus />
            </div>
          </div>
          <div className="max-h-[264px] overflow-y-auto">
            {filtered.map(u => {
              const checked = value.includes(u.id);
              return (
                <label key={u.id} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggle(u.id)} className="w-4 h-4 text-purple-600 rounded shrink-0" />
                  <UserAvatar user={{ fullName: u.fullName, avatarUrl: u.avatarUrl }} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.fullName}</p>
                    {u.email && <p className="text-xs text-slate-500 truncate">{u.email}</p>}
                  </div>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Не найдено</p>
            )}
          </div>
        </div>
      )}

      {/* Selected user cards */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2 mt-2">
          {selectedUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg group">
              <div className="flex items-center gap-3">
                <UserAvatar user={{ fullName: u.fullName, avatarUrl: u.avatarUrl }} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{u.fullName}</p>
                  {u.email && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500 truncate">{u.email}</span>
                      <button onClick={() => { navigator.clipboard.writeText(u.email!); toast.success("Email скопирован"); }}
                        className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"><Copy size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => toggle(u.id)} className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
