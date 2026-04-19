import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { SprintResponse } from "../../api/sprints";
import type { TaskResponse } from "../../api/tasks";
import type { BoardResponse } from "../../api/boards";
import { formatDate } from "../../lib/format";

interface CompletedSprintRowProps {
  sprint: SprintResponse;
  tasks: TaskResponse[];
  boards: BoardResponse[];
  isExpanded: boolean;
  onToggle: () => void;
  /** How to render each task card. Called with the task and the sprint id. */
  renderTask: (task: TaskResponse, source: string, isDraggable: boolean) => ReactNode;
  groupTasksByBoard: (tasks: TaskResponse[], boards: BoardResponse[]) => { board: BoardResponse; tasks: TaskResponse[] }[];
}

export function CompletedSprintRow({
  sprint,
  tasks,
  boards,
  isExpanded,
  onToggle,
  renderTask,
  groupTasksByBoard,
}: CompletedSprintRowProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors text-left"
      >
        <div>
          <h4 className="font-semibold">{sprint.name}</h4>
          <p className="text-sm text-slate-600">
            {formatDate(sprint.startDate, "dmy")} – {formatDate(sprint.endDate, "dmy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sprint.goal && <p className="text-sm text-slate-500 max-w-sm truncate">{sprint.goal}</p>}
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-slate-200 p-4">
          {tasks.length > 0 ? (
            boards.length > 1 ? (
              <div className="space-y-4">
                {groupTasksByBoard(tasks, boards).map(({ board, tasks: bTasks }) => (
                  <div key={board.id}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{board.name}</span>
                      <span className="text-xs text-slate-400">({bTasks.length})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-start">
                      {bTasks.map((task) => renderTask(task, sprint.id, false))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 items-start">
                {tasks.map((task) => renderTask(task, sprint.id, false))}
              </div>
            )
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Нет задач в этом спринте</p>
          )}
        </div>
      )}
    </div>
  );
}
