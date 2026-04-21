export type PriorityKey = "Критический" | "Критичный" | "Высокий" | "Средний" | "Низкий" | string;

/**
 * Нейтральный серый — для пустых значений и кастомных (не входящих в дефолтные шаблоны).
 * Тот же тон используется для «Нематериального» класса обслуживания.
 */
const NEUTRAL_COLOR = "bg-slate-100 text-slate-700 border-slate-200";

/**
 * Цвета для значений полей «Приоритет» и «Класс обслуживания».
 * Оба типа приходят с бэкенда в одно и то же поле `task.priority` — различает их
 * `board.priorityType` (priority | service_class). Значения не пересекаются, поэтому
 * хранятся в одной таблице. Все кастомные значения, которых нет в таблице, отображаются
 * нейтральным серым цветом (как «Нематериальный»).
 */
const PRIORITY_MAP: Record<string, string> = {
  // Приоритет (priority) — дефолтные значения шаблона.
  "Критический": "bg-red-100 text-red-700 border-red-200",
  "Критичный": "bg-red-100 text-red-700 border-red-200",
  "Блокер": "bg-red-100 text-red-700 border-red-200",
  "Высокий": "bg-orange-100 text-orange-700 border-orange-200",
  "Средний": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Низкий": "bg-green-100 text-green-700 border-green-200",
  // Класс обслуживания (service_class) — дефолтные значения шаблона:
  // Ускоренный → С фиксированной датой → Стандартный → Нематериальный (по убыванию срочности).
  "Ускоренный": "bg-red-100 text-red-700 border-red-200",
  "С фиксированной датой": "bg-purple-100 text-purple-700 border-purple-200",
  "Фиксированная дата": "bg-purple-100 text-purple-700 border-purple-200",
  "Стандартный": "bg-blue-100 text-blue-700 border-blue-200",
  "Нематериальный": NEUTRAL_COLOR,
};

export function priorityColor(priority: string | null | undefined): string {
  if (!priority) return NEUTRAL_COLOR;
  return PRIORITY_MAP[priority] || NEUTRAL_COLOR;
}

export type ProjectStatusKey = "active" | "archived" | "paused" | string;

const PROJECT_STATUS_MAP: Record<string, { color: string; label: string }> = {
  active: { color: "bg-green-100 text-green-700 border-green-200", label: "Активный" },
  paused: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Приостановлен" },
  archived: { color: "bg-slate-100 text-slate-700 border-slate-200", label: "Архивирован" },
};

export function projectStatusColor(status: string | null | undefined): string {
  if (!status) return "bg-slate-100 text-slate-700 border-slate-200";
  return PROJECT_STATUS_MAP[status]?.color || "bg-slate-100 text-slate-700 border-slate-200";
}

export function projectStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return PROJECT_STATUS_MAP[status]?.label || status;
}

export const MEETING_TYPE_LABELS: Record<string, string> = {
  scrum_planning: "Планирование спринта",
  daily_scrum: "Daily Scrum",
  sprint_review: "Обзор спринта",
  sprint_retrospective: "Ретроспектива",
  kanban_daily: "Ежедневная встреча",
  kanban_risk_review: "Обзор рисков",
  kanban_strategy_review: "Обзор стратегии",
  kanban_service_delivery_review: "Обзор предоставления услуг",
  kanban_operations_review: "Обзор операций",
  kanban_replenishment: "Пополнение запасов",
  kanban_delivery_planning: "Планирование поставок",
  custom: "Пользовательское событие",
};

export const MEETING_TYPE_COLORS: Record<string, string> = {
  scrum_planning: "bg-blue-500",
  daily_scrum: "bg-green-500",
  sprint_review: "bg-indigo-500",
  sprint_retrospective: "bg-purple-500",
  kanban_daily: "bg-emerald-500",
  kanban_risk_review: "bg-orange-500",
  kanban_strategy_review: "bg-yellow-500",
  kanban_service_delivery_review: "bg-cyan-500",
  kanban_operations_review: "bg-teal-500",
  kanban_replenishment: "bg-lime-500",
  kanban_delivery_planning: "bg-amber-500",
  custom: "bg-slate-500",
};

export function meetingTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return MEETING_TYPE_LABELS[type] || type;
}

export function meetingTypeColor(type: string | null | undefined): string {
  if (!type) return "bg-slate-500";
  return MEETING_TYPE_COLORS[type] || "bg-slate-500";
}
