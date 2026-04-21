import { Link } from "react-router";
import { Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import type { TaskDependency } from "../../api/dependencies";
import type { TaskResponse } from "../../api/tasks";

interface DependenciesSectionProps {
  dependencies: TaskDependency[];
  /** Resolves a dependency to the target TaskResponse, or null if not loaded. */
  getDepTask: (dep: TaskDependency) => TaskResponse | null;
  /** Link to the detail page of the given task; falls back to `/tasks/{id}` if omitted. */
  buildTaskHref?: (task: TaskResponse) => string;
  canEditTask: boolean;
  onAddDependency: () => void;
  /** Delete handler — when provided, a trash icon is shown next to each dep. */
  onDeleteDependency?: (dep: TaskDependency) => void;
  /** Set of dependency IDs currently being deleted — used to disable buttons. */
  deletingIds?: Set<string>;
}

type DepTypeConfig = { predicate: (d: TaskDependency) => boolean; label: string; color: string };

const DEP_TYPES: DepTypeConfig[] = [
  { predicate: (d) => d.type === "blocks", label: "Блокирует", color: "text-red-600" },
  { predicate: (d) => d.type === "is_blocked_by", label: "Блокируется", color: "text-orange-600" },
  { predicate: (d) => d.type === "parent", label: "Родительская", color: "text-purple-600" },
  { predicate: (d) => d.type === "subtask", label: "Подзадача", color: "text-teal-600" },
  { predicate: (d) => d.type === "relates_to", label: "Связана с", color: "text-blue-600" },
];

export function DependenciesSection({
  dependencies,
  getDepTask,
  buildTaskHref,
  canEditTask,
  onAddDependency,
  onDeleteDependency,
  deletingIds,
}: DependenciesSectionProps) {
  // Defensive filter: if the counterpart task cannot be resolved (e.g. it was deleted and the
  // backend hasn't cleaned the record yet, or the project task list is stale), drop the row.
  const visibleDeps = dependencies.filter((d) => !!getDepTask(d));
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <LinkIcon size={18} /> Связи
        </h2>
        {canEditTask && (
          <button
            onClick={onAddDependency}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus size={16} /> Добавить
          </button>
        )}
      </div>
      <div className="space-y-2">
        {DEP_TYPES.flatMap((cfg) =>
          visibleDeps.filter(cfg.predicate).map((dep) => {
            const t = getDepTask(dep);
            if (!t) return null;
            const href = buildTaskHref ? buildTaskHref(t) : `/tasks/${t.id}`;
            const isDeleting = deletingIds?.has(dep.id) ?? false;
            return (
              <div key={dep.id} className="p-3 border border-slate-200 rounded-lg flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-medium mb-1 ${cfg.color}`}>{cfg.label}</div>
                  <Link to={href} className="text-sm text-blue-600 hover:underline break-words">
                    {t.key}: {t.name}
                  </Link>
                </div>
                {canEditTask && onDeleteDependency && (
                  <button
                    type="button"
                    onClick={() => onDeleteDependency(dep)}
                    disabled={isDeleting}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title="Удалить связь"
                    aria-label="Удалить связь"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          }),
        )}
        {visibleDeps.length === 0 && (
          <p className="text-sm text-slate-400 py-3">Нет связей</p>
        )}
      </div>
    </div>
  );
}
