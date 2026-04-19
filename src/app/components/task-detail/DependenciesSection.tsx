import { Link } from "react-router";
import { Link as LinkIcon, Plus } from "lucide-react";
import type { TaskDependency } from "../../api/dependencies";
import type { TaskResponse } from "../../api/tasks";

interface DependenciesSectionProps {
  dependencies: TaskDependency[];
  /** Resolves a dependency to the target TaskResponse, or null if not loaded. */
  getDepTask: (dep: TaskDependency) => TaskResponse | null;
  canEditTask: boolean;
  onAddDependency: () => void;
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
  canEditTask,
  onAddDependency,
}: DependenciesSectionProps) {
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
          dependencies.filter(cfg.predicate).map((dep) => {
            const t = getDepTask(dep);
            if (!t) return null;
            return (
              <div key={dep.id} className="p-3 border border-slate-200 rounded-lg">
                <div className={`text-xs font-medium mb-1 ${cfg.color}`}>{cfg.label}</div>
                <Link to={`/tasks/${t.id}`} className="text-sm text-blue-600 hover:underline">
                  {t.key}: {t.name}
                </Link>
              </div>
            );
          }),
        )}
        {dependencies.length === 0 && (
          <p className="text-sm text-slate-400 py-3">Нет связей</p>
        )}
      </div>
    </div>
  );
}
