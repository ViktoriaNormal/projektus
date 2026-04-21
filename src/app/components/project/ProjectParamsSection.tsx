import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "../ui/Modal";
import { Select, SelectOption } from "../ui/Select";
import { toastError } from "../../lib/errors";
import { Settings, Lock, Plus, Trash2, X, Info, AlertCircle, Copy, Check, Edit, Search, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  createProjectParam,
  updateProjectParam,
  deleteProjectParam,
  type ProjectParam,
} from "../../api/project-params";
import { searchUsers, getUser, type UserProfileResponse } from "../../api/users";
import type { ProjectReferences } from "../../api/boards";
import { UserSelect, UserMultiSelect, type UserOption } from "../UserSelect";

// ── Helpers ────────────────────────────────────────────────────

const SYSTEM_FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Текст", number: "Число", datetime: "Дата и время", select: "Выпадающий список",
  multiselect: "Множественный выбор", checkbox: "Флажок", user: "Пользователь",
  user_list: "Список пользователей",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Активный" },
  { value: "archived", label: "Архивирован" },
];

function buildFieldTypeLabels(refs: ProjectReferences, opts?: { projectType?: string; scope?: string }): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of refs.fieldTypes || []) {
    if (opts?.projectType && t.availableFor && !t.availableFor.includes(opts.projectType)) continue;
    if (opts?.scope && t.allowedScopes && !t.allowedScopes.includes(opts.scope)) continue;
    map[t.key] = t.name;
  }
  return map;
}

// ── Validation helpers ─────────────────────────────────────────

function isParamEmpty(param: ProjectParam, projectProps?: { name?: string; description?: string; status?: string; ownerId?: string }): boolean {
  // System params backed by project fields
  if (param.isSystem) {
    if (param.name === "Название") return !projectProps?.name?.trim();
    if (param.name === "Описание") return !projectProps?.description?.trim();
    if (param.name === "Статус проекта") return !projectProps?.status;
    if (param.name === "Ответственный за проект") return !projectProps?.ownerId;
    if (param.name === "Дата создания") return false; // always filled
  }
  if (param.fieldType === "checkbox") return false; // checkbox always has a state
  if (param.fieldType === "select" && param.options && param.options.length > 0) return false; // select with options always has first value
  return !param.value?.trim();
}

function validateNumber(val: string): string | null {
  if (!val.trim()) return null;
  if (isNaN(Number(val))) return "Значение должно быть числом";
  return null;
}

function validateDate(dateStr: string): string | null {
  if (!dateStr) return null;
  // Extract year from ISO-like string to catch obvious issues before parsing
  const yearMatch = dateStr.match(/^(\d{4})/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y < 2000 || y > 2100) return "Год должен быть в диапазоне 2000–2100";
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Некорректная дата";
  return null;
}

function validateParamType(param: ProjectParam): string | null {
  if (!param.value?.trim()) return null; // empty — only required check matters
  switch (param.fieldType) {
    case "number": return validateNumber(param.value);
    case "datetime": return validateDate(param.value);
    default: return null;
  }
}

export interface ParamValidationError { paramId: string; paramName: string; message: string; }

function computeParamErrors(
  params: ProjectParam[],
  projectProps: { name: string; description: string; status: string; ownerId: string },
): ParamValidationError[] {
  const errors: ParamValidationError[] = [];
  for (const p of params) {
    if (p.isRequired && isParamEmpty(p, projectProps)) {
      errors.push({ paramId: p.id, paramName: p.name, message: `Обязательный параметр «${p.name}» не заполнен` });
      continue; // don't double-report type errors on empty required
    }
    const typeErr = validateParamType(p);
    if (typeErr) {
      errors.push({ paramId: p.id, paramName: p.name, message: `Параметр «${p.name}» некорректно заполнен: ${typeErr.toLowerCase()}` });
    }
  }
  return errors;
}

// ── DebouncedInput ─────────────────────────────────────────────

function DebouncedInput({ value, onSave, className, placeholder, required, requiredMessage, validate }: {
  value: string; onSave: (val: string) => void; className?: string; placeholder?: string;
  required?: boolean; requiredMessage?: string; validate?: (val: string) => string | null;
}) {
  const [local, setLocal] = useState(value);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const localRef = useRef(local);
  const onSaveRef = useRef(onSave);
  const validateRef = useRef(validate);
  localRef.current = local;
  onSaveRef.current = onSave;
  validateRef.current = validate;

  useEffect(() => { if (!dirtyRef.current) setLocal(value); }, [value]);

  function trySave(v: string, showRequiredError: boolean) {
    if (required && !v.trim()) {
      if (showRequiredError) setError(requiredMessage || "Поле не может быть пустым");
      return;
    }
    const vErr = validate?.(v);
    if (vErr) { setError(vErr); return; }
    setError(""); onSave(v);
  }

  function handleChange(v: string) {
    setLocal(v);
    dirtyRef.current = true;
    // Live error clearing
    if (error) {
      const stillRequired = required && !v.trim();
      const stillInvalid = validate?.(v);
      if (!stillRequired && !stillInvalid) setError("");
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    // Don't show required error on debounce — user is still typing
    timerRef.current = setTimeout(() => { dirtyRef.current = false; trySave(v, false); }, 1500);
  }

  function handleBlur() {
    // On blur — flush pending save and show errors
    if (timerRef.current) clearTimeout(timerRef.current);
    dirtyRef.current = false;
    trySave(local, true);
  }

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current); dirtyRef.current = false;
      const v = localRef.current;
      const reqFail = required && !v.trim();
      const valFail = validateRef.current?.(v);
      if (!reqFail && !valFail) onSaveRef.current(v);
    }
  }, []);

  return (
    <div>
      <input type="text" value={local} onChange={e => handleChange(e.target.value)} onBlur={handleBlur}
        className={`${className} ${error ? "border-red-400 ring-2 ring-red-200" : ""}`} placeholder={placeholder} />
      {error && (
        <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ── DateTimeInput ─────────────────────────────────────────────

function DateTimeInput({ value, onSave }: { value: string | null; onSave: (val: string | null) => void }) {
  // Backend stores datetime in UTC ISO; the <input type="date"> / <input type="time">
  // fields show the user's LOCAL date/time. Naive `.slice()` on the UTC string shifts
  // the displayed moment by the TZ offset (the old bug — 00:00 local saved as 21:00Z,
  // then shown back as "21:00"). Convert explicitly via getFullYear/getMonth/…/getMinutes.
  const pad = (n: number) => n.toString().padStart(2, "0");
  const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toLocalTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const parsed = value ? new Date(value) : null;
  const isValid = !!(parsed && !isNaN(parsed.getTime()));

  const [dateStr, setDateStr] = useState(isValid ? toLocalDate(parsed!) : "");
  const [timeStr, setTimeStr] = useState(isValid ? toLocalTime(parsed!) : "");
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const p = value ? new Date(value) : null;
    const v = !!(p && !isNaN(p.getTime()));
    setDateStr(v ? toLocalDate(p!) : "");
    setTimeStr(v ? toLocalTime(p!) : "");
  }, [value]);

  function trySave(d: string, t: string) {
    if (!d) { setError(""); onSave(null); return; }
    const err = validateDate(d + "T00:00:00Z");
    if (err) { setError(err); return; }
    setError("");
    const iso = t ? new Date(`${d}T${t}:00`).toISOString() : new Date(`${d}T00:00:00`).toISOString();
    onSave(iso);
  }

  function scheduleUpdate(d: string, t: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => trySave(d, t), 800);
  }

  function handleDateChange(d: string) {
    setDateStr(d);
    if (d && error) { const e = validateDate(d + "T00:00:00Z"); if (!e) setError(""); }
    scheduleUpdate(d, timeStr);
  }

  function handleTimeChange(t: string) {
    setTimeStr(t);
    scheduleUpdate(dateStr, t);
  }

  const inputCls = "px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div>
      <div className="flex items-center gap-2">
        <input type="date" value={dateStr} onChange={e => handleDateChange(e.target.value)}
          min="2000-01-01" max="2100-12-31"
          className={`w-44 ${inputCls} ${error ? "border-red-400 ring-2 ring-red-200" : ""}`} />
        <div className="relative">
          <input type="time" value={timeStr} onChange={e => handleTimeChange(e.target.value)}
            className={`w-36 ${inputCls} ${timeStr ? "pr-7" : ""}`} />
          {timeStr && (
            <button onClick={() => handleTimeChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition-colors" title="Сбросить время">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          <AlertCircle size={14} className="shrink-0" /><span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ── UserPicker (searchable dropdown for all system users) ──────

const PICKER_DROPDOWN_HEIGHT = 310;

function usePickerDropDirection(ref: React.RefObject<HTMLDivElement | null>, open: boolean) {
  const [dropUp, setDropUp] = useState(false);
  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropUp(spaceBelow < PICKER_DROPDOWN_HEIGHT && rect.top > spaceBelow);
  }, [open, ref]);
  return dropUp;
}

function UserPicker({ value, onSave, multiple }: {
  value: string | null; onSave: (val: string | null) => void; multiple?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfileResponse[]>([]);
  const [loadedUsers, setLoadedUsers] = useState<Map<string, UserProfileResponse>>(new Map());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropUp = usePickerDropDirection(ref, open);

  // Load user profiles for existing IDs
  useEffect(() => {
    if (!value) return;
    const ids = multiple ? value.split(",").map(s => s.trim()).filter(Boolean) : [value];
    ids.forEach(async id => {
      if (loadedUsers.has(id)) return;
      try { const u = await getUser(id); setLoadedUsers(prev => new Map(prev).set(id, u)); } catch { /**/ }
    });
  }, [value, multiple]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSearch(q: string) {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const users = await searchUsers(q, 10);
        setResults(users);
        users.forEach(u => setLoadedUsers(prev => new Map(prev).set(u.id, u)));
      } catch { setResults([]); }
    }, 300);
  }

  const selectedIds = value ? (multiple ? value.split(",").map(s => s.trim()).filter(Boolean) : [value]) : [];

  // ── Single user ──
  if (!multiple) {
    const selected = selectedIds[0] ? loadedUsers.get(selectedIds[0]) : null;
    return (
      <div ref={ref} className={`relative ${open ? "z-40" : ""}`}>
        <button type="button" onClick={() => { setOpen(!open); setQuery(""); setResults([]); }}
          className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg hover:border-purple-400 transition-colors text-left bg-white">
          {selected ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-purple-700">{selected.fullName.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selected.fullName}</p>
                {selected.username && <p className="text-xs text-slate-500 truncate">{selected.username}</p>}
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-400">Выберите пользователя...</span>
          )}
          <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className={`absolute left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-30 overflow-hidden ${dropUp ? "bottom-full mb-1" : "top-full mt-1"}`}>
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" autoFocus value={query} onChange={e => handleSearch(e.target.value)}
                  placeholder="Поиск по имени или логину..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="max-h-[264px] overflow-y-auto">
              {selected && (
                <button type="button" onClick={() => { onSave(null); setOpen(false); }}
                  className="w-full px-3 py-2.5 text-left text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100">
                  Не выбрано
                </button>
              )}
              {results.length > 0 ? results.map(u => (
                <button key={u.id} type="button" onClick={() => { onSave(u.id); setOpen(false); setQuery(""); setResults([]); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${selectedIds.includes(u.id) ? "bg-purple-50" : ""}`}>
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-purple-700">{u.fullName.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.fullName}</p>
                    {u.username && <p className="text-xs text-slate-500 truncate">{u.username}</p>}
                  </div>
                  {selectedIds.includes(u.id) && <Check size={16} className="text-purple-600 shrink-0 ml-auto" />}
                </button>
              )) : query.length >= 2 ? (
                <p className="text-sm text-slate-400 text-center py-4">Не найдено</p>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Введите минимум 2 символа</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Multiple users ──
  const selectedUsersLoaded = selectedIds.map(id => loadedUsers.get(id)).filter(Boolean) as UserProfileResponse[];

  function toggle(userId: string) {
    const updated = selectedIds.includes(userId) ? selectedIds.filter(id => id !== userId) : [...selectedIds, userId];
    onSave(updated.length > 0 ? updated.join(",") : null);
  }

  return (
    <div ref={ref} className={`relative ${open ? "z-40" : ""}`}>
      <button type="button" onClick={() => { setOpen(!open); setQuery(""); setResults([]); }}
        className="w-full flex items-center justify-between px-4 py-2 border border-slate-200 rounded-lg hover:border-purple-400 transition-colors text-left bg-white">
        <span className="text-sm truncate">
          {selectedUsersLoaded.length > 0
            ? `Выбрано: ${selectedUsersLoaded.length}`
            : <span className="text-slate-400">Выберите пользователей...</span>
          }
        </span>
        <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`absolute left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-30 overflow-hidden ${dropUp ? "bottom-full mb-1" : "top-full mt-1"}`}>
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" autoFocus value={query} onChange={e => handleSearch(e.target.value)}
                placeholder="Поиск по имени или логину..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="max-h-[264px] overflow-y-auto">
            {results.length > 0 ? results.map(u => {
              const checked = selectedIds.includes(u.id);
              return (
                <label key={u.id} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggle(u.id)} className="w-4 h-4 text-purple-600 rounded shrink-0" />
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-purple-700">{u.fullName.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.fullName}</p>
                    {u.username && <p className="text-xs text-slate-500 truncate">{u.username}</p>}
                  </div>
                </label>
              );
            }) : query.length >= 2 ? (
              <p className="text-sm text-slate-400 text-center py-4">Не найдено</p>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Введите минимум 2 символа</p>
            )}
          </div>
        </div>
      )}
      {/* Selected user cards */}
      {selectedUsersLoaded.length > 0 && (
        <div className="space-y-2 mt-2">
          {selectedUsersLoaded.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg group">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-purple-700">{u.fullName.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{u.fullName}</p>
                  {u.username && <p className="text-xs text-slate-500 truncate">{u.username}</p>}
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

// ── CopyButton ─────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="text-slate-400 hover:text-purple-600 transition-colors shrink-0 p-1 rounded hover:bg-purple-50" title="Скопировать"
    >{copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}</button>
  );
}

// ── Types ──────────────────────────────────────────────────────

interface MemberUser { userId: string; fullName: string; username?: string; avatarUrl?: string; }

interface ProjectParamsSectionProps {
  projectId: string;
  projectKey: string;
  projectName: string;
  projectDescription: string;
  projectType: string;
  projectStatus: string;
  projectOwnerId: string;
  projectCreatedAt: string;
  members: MemberUser[];
  refs: ProjectReferences;
  params: ProjectParam[];
  onReload: () => Promise<void>;
  onProjectUpdate: (patch: Partial<{ name: string; description: string | null; status: string; ownerId: string }>) => Promise<void>;
  onValidationChange?: (errors: ParamValidationError[]) => void;
}

// ── Main Component ─────────────────────────────────────────────

export default function ProjectParamsSection({
  projectId, projectKey, projectName, projectDescription, projectType, projectStatus, projectOwnerId, projectCreatedAt, members, refs, params, onReload, onProjectUpdate, onValidationChange,
}: ProjectParamsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");

  const isScrum = projectType === "scrum";
  const FIELD_TYPE_LABELS = buildFieldTypeLabels(refs, { projectType, scope: "project_param" });
  const systemParams = params.filter(p => p.isSystem);
  const customParams = params.filter(p => !p.isSystem);

  // Edit modal for custom params
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const editingParam = editingParamId ? customParams.find(p => p.id === editingParamId) || null : null;
  const [editParamOptionInput, setEditParamOptionInput] = useState("");

  // ── Local value overrides (for values changed locally but not yet saved / rejected by backend) ──
  const [localOverrides, setLocalOverrides] = useState<Map<string, string | null>>(new Map());

  // Local overrides for project-level fields (system params: name, description)
  const [localProjName, setLocalProjName] = useState<string | null>(null);
  const [localProjDesc, setLocalProjDesc] = useState<string | null>(null);

  // Reset overrides when params reload from server
  useEffect(() => { setLocalOverrides(new Map()); }, [params]);
  useEffect(() => { setLocalProjName(null); }, [projectName]);
  useEffect(() => { setLocalProjDesc(null); }, [projectDescription]);

  // Effective values for project fields
  const effName = localProjName ?? projectName;
  const effDesc = localProjDesc ?? projectDescription;

  // Effective params: merge server values with local overrides
  const effectiveParams = useMemo(() =>
    params.map(p => {
      if (localOverrides.has(p.id)) return { ...p, value: localOverrides.get(p.id) ?? null };
      return p;
    }), [params, localOverrides]);

  // ── Validation ────────────────────────────────────────────────
  const validationErrors = useMemo(
    () => computeParamErrors(effectiveParams, { name: effName, description: effDesc, status: projectStatus, ownerId: projectOwnerId }),
    [effectiveParams, effName, effDesc, projectStatus, projectOwnerId],
  );
  const errorsByParamId = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of validationErrors) map.set(e.paramId, e.message);
    return map;
  }, [validationErrors]);

  const prevErrorsJsonRef = useRef("");
  useEffect(() => {
    const json = JSON.stringify(validationErrors);
    if (json !== prevErrorsJsonRef.current) {
      prevErrorsJsonRef.current = json;
      onValidationChange?.(validationErrors);
    }
  }, [validationErrors, onValidationChange]);

  const nameParam = systemParams.find(p => p.name === "Название");
  const descParam = systemParams.find(p => p.name === "Описание");
  const statusParam = systemParams.find(p => p.name === "Статус проекта");
  const ownerParam = systemParams.find(p => p.name === "Ответственный за проект");
  const createdParam = systemParams.find(p => p.name === "Дата создания");

  async function handleSaveParamValue(paramId: string, value: string | null) {
    // Update local override immediately so validation reacts
    setLocalOverrides(prev => new Map(prev).set(paramId, value));

    // Check validity before sending to backend
    const param = effectiveParams.find(p => p.id === paramId);
    if (param) {
      const testParam = { ...param, value };
      if (param.isRequired && isParamEmpty(testParam)) return; // don't send, inline error shows
      const typeErr = validateParamType(testParam);
      if (typeErr) return; // don't send, inline error shows
    }

    try {
      await updateProjectParam(projectId, paramId, { value });
      await onReload();
    } catch (e: any) {
      toastError(e, "Не удалось сохранить значение");
    }
  }

  async function handleUpdateCustomParam(paramId: string, updates: Partial<{ name: string; isRequired: boolean; options: string[] | null }>) {
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) return;
      if (params.some(p => p.id !== paramId && p.name.toLowerCase() === trimmed.toLowerCase())) {
        toast.error(`Параметр «${trimmed}» уже существует`); return;
      }
    }
    try {
      await updateProjectParam(projectId, paramId, updates);
      await onReload();
    } catch (e: any) { toastError(e, "Не удалось обновить параметр"); }
  }

  async function addCustomParam() {
    if (!newName.trim()) return;
    if (params.some(p => p.name.toLowerCase() === newName.trim().toLowerCase())) {
      toast.error(`Параметр «${newName.trim()}» уже существует`); return;
    }
    try {
      await createProjectParam(projectId, {
        // Custom project parameters are always optional — the UI doesn't let users mark
        // them as required anymore.
        name: newName.trim(), fieldType: newType, isRequired: false,
        options: ["select", "multiselect"].includes(newType) ? newOptions : null,
      });
      setNewName(""); setNewType("text"); setNewOptions([]);
      setShowAddForm(false);
      await onReload();
    } catch (e: any) { toastError(e, "Не удалось добавить параметр"); }
  }

  async function removeCustomParam(paramId: string) {
    try { await deleteProjectParam(projectId, paramId); await onReload(); }
    catch (e: any) { toastError(e, "Не удалось удалить параметр"); }
  }

  function addOption() {
    if (optionInput.trim() && !newOptions.includes(optionInput.trim())) {
      setNewOptions([...newOptions, optionInput.trim()]); setOptionInput("");
    }
  }

  // ── Render value editor ──────────────────────────────────────
  function renderParamValue(param: ProjectParam) {
    if (param.id === nameParam?.id) {
      return <DebouncedInput value={projectName} onSave={(val) => {
          setLocalProjName(val);
          if (val.trim()) onProjectUpdate({ name: val });
        }}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Название проекта..." />;
    }
    if (param.id === descParam?.id) {
      return <DebouncedInput value={projectDescription} onSave={(val) => {
          setLocalProjDesc(val);
          if (descParam?.isRequired && !val.trim()) return;
          onProjectUpdate({ description: val || null });
        }}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Описание проекта..." />;
    }
    if (param.id === statusParam?.id) {
      return (
        <Select value={projectStatus} onValueChange={(v) => onProjectUpdate({ status: v })}>
          {STATUS_OPTIONS.map(o => <SelectOption key={o.value} value={o.value}>{o.label}</SelectOption>)}
        </Select>
      );
    }
    if (param.id === ownerParam?.id) {
      return (
        <UserPicker value={projectOwnerId} onSave={(val) => { if (val) onProjectUpdate({ ownerId: val }); }} />
      );
    }
    if (param.id === createdParam?.id) {
      const formatted = projectCreatedAt
        ? new Date(projectCreatedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";
      return <input type="text" value={formatted} disabled className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed" />;
    }

    // user / user_list types — from project members
    if (param.fieldType === "user") {
      const memberOptions = members.map(m => ({ id: m.userId, fullName: m.fullName, username: m.username, avatarUrl: m.avatarUrl }));
      return <UserSelect options={memberOptions} value={param.value || null} onChange={val => handleSaveParamValue(param.id, val)} placeholder="Не выбран" />;
    }
    if (param.fieldType === "user_list") {
      const memberOptions = members.map(m => ({ id: m.userId, fullName: m.fullName, username: m.username, avatarUrl: m.avatarUrl }));
      const selectedIds = param.value ? param.value.split(",").map(s => s.trim()).filter(Boolean) : [];
      return <UserMultiSelect options={memberOptions} value={selectedIds} onChange={ids => handleSaveParamValue(param.id, ids.length > 0 ? ids.join(",") : null)} />;
    }

    if (param.fieldType === "select" && param.options && param.options.length > 0) {
      return (
        <Select
          value={param.value ?? ""}
          onValueChange={(v) => handleSaveParamValue(param.id, v === "" ? null : v)}
          placeholder="Не выбрано"
        >
          {!param.isRequired && <SelectOption value="">Не выбрано</SelectOption>}
          {param.options.map(opt => <SelectOption key={opt} value={opt}>{opt}</SelectOption>)}
        </Select>
      );
    }
    if (param.fieldType === "multiselect" && param.options && param.options.length > 0) {
      const selected = param.value ? param.value.split(",").map(s => s.trim()) : [];
      return (
        <div className="border border-slate-200 rounded-lg p-2 space-y-1">
          {param.options.map(opt => {
            const isChecked = selected.includes(opt);
            const isLastChecked = isChecked && selected.length === 1 && param.isRequired;
            return (
              <label key={opt} className={`flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded transition-colors ${isLastChecked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                <input type="checkbox" checked={isChecked} disabled={isLastChecked}
                  onChange={(e) => {
                    const updated = e.target.checked ? [...selected, opt] : selected.filter(s => s !== opt);
                    handleSaveParamValue(param.id, updated.length > 0 ? updated.join(",") : null);
                  }}
                  className="w-4 h-4 text-purple-600 rounded" />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }
    if (param.fieldType === "checkbox") {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={param.value === "true"}
            onChange={(e) => handleSaveParamValue(param.id, e.target.checked ? "true" : "false")}
            className="w-4 h-4 text-purple-600 rounded" />
          <span className="text-sm">{param.value === "true" ? "Да" : "Нет"}</span>
        </label>
      );
    }
    if (param.fieldType === "datetime") {
      return <DateTimeInput value={param.value} onSave={(val) => handleSaveParamValue(param.id, val)} />;
    }
    if (param.fieldType === "number") {
      return <DebouncedInput value={param.value || ""} onSave={(val) => handleSaveParamValue(param.id, val || null)}
        validate={validateNumber}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Введите число..." />;
    }
    return <DebouncedInput value={param.value || ""} onSave={(val) => handleSaveParamValue(param.id, val || null)}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Введите значение..." />;
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <Settings size={20} className="text-purple-600" />
          <h2 className="text-lg font-bold">Параметры проекта</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Параметры проекта определяют его ключевые свойства. Системные параметры нельзя удалить, но можно заполнить их значениями.
        </p>

        {validationErrors.length > 0 && (
          <div className="mb-5 p-4 bg-red-50 border border-red-300 rounded-lg" style={{ overflowAnchor: "none" }}>
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 mb-1">
                  Не все параметры заполнены корректно ({validationErrors.length})
                </p>
                <ul className="text-xs text-red-700 space-y-0.5">
                  {validationErrors.map(e => <li key={e.paramId}>— {e.message}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Project meta: key + type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Ключ проекта</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-700">{projectKey}</p>
              <CopyButton text={projectKey} />
            </div>
          </div>
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Тип проекта</span>
            </div>
            <p className="text-sm font-medium text-slate-700">{isScrum ? "Scrum" : "Kanban"}</p>
          </div>
        </div>

        {/* System params */}
        <div className="space-y-3">
          {systemParams.map((param) => {
            const err = errorsByParamId.get(param.id);
            return (
              <div key={param.id} className={`p-4 border rounded-lg bg-slate-50 ${err ? "border-red-300" : "border-slate-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={14} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-medium">{param.name}{param.isRequired && <span className="text-red-500 ml-0.5">*</span>}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                    {SYSTEM_FIELD_TYPE_LABELS[param.fieldType] || FIELD_TYPE_LABELS[param.fieldType] || param.fieldType}
                  </span>
                </div>
                {renderParamValue(param)}
                {err && (
                  <div className="flex items-center gap-2 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs" style={{ overflowAnchor: "none" }}>
                    <AlertCircle size={14} className="shrink-0" /><span>{err}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              Тип проекта ({isScrum ? "Scrum" : "Kanban"}) фиксируется при создании и определяет доступные функции:
              {isScrum ? " спринты, бэклог продукта, Story Points, Burndown-диаграмма."
                : " WIP-лимиты, классы обслуживания, Kanban-аналитика, прогнозирование методом Монте-Карло."}
            </p>
          </div>
        </div>

        {/* Custom params */}
        <div className="mt-6">
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-base font-bold">Кастомные параметры проекта</h3>
              <p className="text-sm text-slate-500 mt-0.5">Дополнительные параметры, специфичные для этого проекта.</p>
            </div>
            {!showAddForm && (
              <button onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm shrink-0">
                <Plus size={16} /> Добавить параметр
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="p-4 border-2 border-purple-300 rounded-lg bg-purple-50 mb-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Название параметра *</label>
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Например: Бюджет проекта" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Тип параметра *</label>
                    <Select value={newType} onValueChange={setNewType}>
                      {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                        <SelectOption key={val} value={val}>{label}</SelectOption>
                      ))}
                    </Select>
                  </div>
                </div>
                {["select", "multiselect"].includes(newType) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Варианты для выбора</label>
                    <div className="flex gap-2 mb-2">
                      <input type="text" value={optionInput} onChange={(e) => setOptionInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Введите вариант..." />
                      <button onClick={addOption} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"><Plus size={18} /></button>
                    </div>
                    {newOptions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newOptions.map(opt => (
                          <span key={opt} className="px-2 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-2">
                            {opt}
                            <button onClick={() => setNewOptions(newOptions.filter(o => o !== opt))} className="hover:text-red-600"><X size={14} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setShowAddForm(false); setNewName(""); setNewType("text"); setNewOptions([]); }}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Отмена</button>
                  <button onClick={addCustomParam} disabled={!newName.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Добавить</button>
                </div>
              </div>
            </div>
          )}

          {customParams.length > 0 ? (
            <div className="space-y-3">
              {customParams.map((param) => {
                const err = errorsByParamId.get(param.id);
                return (
                  <div key={param.id} className={`border rounded-lg bg-white p-4 ${err ? "border-red-300" : "border-slate-200"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium text-sm">{param.name}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">кастомное</span>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{FIELD_TYPE_LABELS[param.fieldType] || param.fieldType}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setEditingParamId(param.id); setEditParamOptionInput(""); }}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Настройки параметра">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => removeCustomParam(param.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Удалить параметр">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {renderParamValue(param)}
                    {err && (
                      <div className="flex items-center gap-2 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                        <AlertCircle size={14} className="shrink-0" /><span>{err}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : !showAddForm ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
              <p className="text-slate-600 mb-3">Нет кастомных параметров проекта</p>
              <button onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Добавить первый параметр
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Edit Param Modal */}
      <Modal
        open={!!editingParam}
        onOpenChange={(next) => { if (!next) setEditingParamId(null); }}
        size="lg"
      >
        {editingParam && (
          <>
            <ModalHeader>
              <ModalTitle>Настройки параметра</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Название *</label>
                  <DebouncedInput
                    value={editingParam.name}
                    onSave={(val) => { handleUpdateCustomParam(editingParam.id, { name: val }); }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Название параметра..." required requiredMessage="Название не может быть пустым"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Тип параметра</label>
                  <input type="text" value={FIELD_TYPE_LABELS[editingParam.fieldType] || editingParam.fieldType} disabled
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed" />
                </div>
                {["select", "multiselect"].includes(editingParam.fieldType) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Варианты для выбора</label>
                    <div className="flex gap-2 mb-2">
                      <input type="text" value={editParamOptionInput}
                        onChange={(e) => setEditParamOptionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const trimmed = editParamOptionInput.trim();
                            if (trimmed && !(editingParam.options || []).includes(trimmed)) {
                              const newOpts = [...(editingParam.options || []), trimmed];
                              handleUpdateCustomParam(editingParam.id, { options: newOpts });
                              setEditParamOptionInput("");
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Введите вариант..." />
                      <button onClick={() => {
                        const trimmed = editParamOptionInput.trim();
                        if (trimmed && !(editingParam.options || []).includes(trimmed)) {
                          const newOpts = [...(editingParam.options || []), trimmed];
                          handleUpdateCustomParam(editingParam.id, { options: newOpts });
                          setEditParamOptionInput("");
                        }
                      }} className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"><Plus size={16} /></button>
                    </div>
                    {editingParam.options && editingParam.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {editingParam.options.map(opt => (
                          <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                            {opt}
                            <button onClick={() => {
                              const newOpts = editingParam.options!.filter(o => o !== opt);
                              handleUpdateCustomParam(editingParam.id, { options: newOpts });
                            }} className="hover:text-red-600"><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <button onClick={() => setEditingParamId(null)}
                className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                Готово
              </button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
