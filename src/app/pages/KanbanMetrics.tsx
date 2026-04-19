import { useState, useCallback, useEffect, useMemo } from "react";
import { BarChart3, Loader2, AlertCircle, Info, X, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartContainer, CHART_TOOLTIP_STYLE } from "../components/ui/ChartContainer";
import { xAxisDefaults, yAxisDefaults } from "../components/ui/chart-axis";
import { Select, SelectOption } from "../components/ui/Select";
import {
  getMonteCarloForecast,
  type MonteCarloResponse, type MonteCarloPercentile, type AnalyticsFilters,
} from "../api/analytics";
import { getProjectBoards, getBoardFields, type BoardResponse, type BoardField } from "../api/boards";
import { getBoardTags, type TagResponse } from "../api/tags";
import { getProjectMembers } from "../api/projects";
import { getUser } from "../api/users";
import { FilterDropdown } from "../components/FilterDropdown";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface KanbanMetricsProps {
  projectId: string;
}

const FILTERABLE_TYPES = new Set(["priority", "select", "checkbox", "multiselect", "user", "user_list", "tags"]);

const WEEKS_OPTIONS = [
  { value: 2, label: "2 недели" },
  { value: 4, label: "4 недели (по умолчанию)" },
  { value: 8, label: "8 недель" },
  { value: 12, label: "12 недель" },
  { value: 16, label: "16 недель" },
  { value: 24, label: "24 недели" },
];

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMMM yyyy", { locale: ru });
  } catch {
    return iso;
  }
}

function findPercentile(percentiles: MonteCarloPercentile[], p: number): MonteCarloPercentile | undefined {
  return percentiles.find(x => x.percentile === p);
}

function buildInterpretation(data: MonteCarloResponse, taskCount: number, targetDate?: string): string[] {
  const lines: string[] = [];

  const p50 = findPercentile(data.percentiles, 50);
  const p75 = findPercentile(data.percentiles, 75);
  const p85 = findPercentile(data.percentiles, 85);
  const p90 = findPercentile(data.percentiles, 90);

  if (p50) {
    lines.push(`С вероятностью **50%** все ${taskCount} задач будут завершены к **${formatDate(p50.date)}** — это медианный сценарий, при котором команда работает на уровне средней исторической производительности.`);
  }
  if (p75) {
    lines.push(`С вероятностью **75%** задачи будут завершены к **${formatDate(p75.date)}** — умеренно оптимистичный сценарий, учитывающий возможные замедления.`);
  }
  if (p85) {
    lines.push(`С вероятностью **85%** задачи будут завершены к **${formatDate(p85.date)}** — рекомендуемый уровень для планирования обязательств перед заказчиком.`);
  }
  if (p90) {
    lines.push(`С вероятностью **90%** задачи будут завершены к **${formatDate(p90.date)}** — консервативный сценарий с запасом на непредвиденные обстоятельства.`);
  }

  if (targetDate && data.targetDateProbability != null) {
    const prob = data.targetDateProbability;
    const dateStr = formatDate(targetDate);
    if (prob >= 85) {
      lines.push(`Вероятность завершения к целевой дате **${dateStr}** составляет **${prob}%** — высокая уверенность, дата достижима.`);
    } else if (prob >= 50) {
      lines.push(`Вероятность завершения к целевой дате **${dateStr}** составляет **${prob}%** — умеренный риск, рекомендуется иметь запасной план.`);
    } else {
      lines.push(`Вероятность завершения к целевой дате **${dateStr}** составляет всего **${prob}%** — высокий риск срыва, рекомендуется сократить объём работ или сдвинуть дату.`);
    }
  }

  lines.push("Рекомендуется планировать на основе 75–85% вероятности для реалистичных обязательств.");

  return lines;
}

const PERCENTILE_CARDS = [
  { p: 50, label: "50% вероятность", subtitle: "Медианный сценарий", from: "from-green-50", to: "to-green-100", border: "border-green-200", text: "text-green-700", subtext: "text-green-600" },
  { p: 75, label: "75% вероятность", subtitle: "Умеренно оптимистичный", from: "from-blue-50", to: "to-blue-100", border: "border-blue-200", text: "text-blue-700", subtext: "text-blue-600" },
  { p: 85, label: "85% вероятность", subtitle: "Рекомендуемый для планирования", from: "from-indigo-50", to: "to-indigo-100", border: "border-indigo-200", text: "text-indigo-700", subtext: "text-indigo-600" },
  { p: 90, label: "90% вероятность", subtitle: "Консервативный сценарий", from: "from-purple-50", to: "to-purple-100", border: "border-purple-200", text: "text-purple-700", subtext: "text-purple-600" },
] as const;

export default function KanbanMetrics({ projectId }: KanbanMetricsProps) {
  // Forecast parameters
  const [forecastTasks, setForecastTasks] = useState(10);
  const [targetDate, setTargetDate] = useState("");
  const [weeks, setWeeks] = useState(4);

  // Forecast data
  const [data, setData] = useState<MonteCarloResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Board & field filter state
  const [boards, setBoards] = useState<BoardResponse[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [filterFields, setFilterFields] = useState<BoardField[]>([]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [memberOptions, setMemberOptions] = useState<{ id: string; name: string }[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  // How-it-works toggle
  const [showGuide, setShowGuide] = useState(false);

  // Load boards
  useEffect(() => {
    getProjectBoards(projectId)
      .then(b => setBoards(b.sort((a, c) => a.order - c.order)))
      .catch(() => setBoards([]));
  }, [projectId]);

  // Load project members
  useEffect(() => {
    getProjectMembers(projectId).then(async (members) => {
      const opts: { id: string; name: string }[] = [];
      await Promise.allSettled(
        members.map(async (m) => {
          try {
            const u = await getUser(m.userId);
            opts.push({ id: m.userId, name: u.fullName });
          } catch { opts.push({ id: m.userId, name: m.userId }); }
        })
      );
      setMemberOptions(opts);
    }).catch(() => setMemberOptions([]));
  }, [projectId]);

  // Load board fields and tags
  useEffect(() => {
    if (!selectedBoardId) {
      setFilterFields([]);
      setFilters({});
      setTagOptions([]);
      return;
    }
    Promise.all([
      getBoardFields(selectedBoardId),
      getBoardTags(selectedBoardId).catch(() => [] as TagResponse[]),
    ]).then(([fields, tags]) => {
      const filterable = fields.filter(
        f => FILTERABLE_TYPES.has(f.fieldType) && !f.name.toLowerCase().includes("статус")
      );
      if (!fields.some(f => f.fieldType === "tags")) {
        filterable.push({
          id: "__tags__", name: "Теги", fieldType: "tags",
          isSystem: true, isRequired: false, options: null,
        });
      }
      setFilterFields(filterable);
      setTagOptions(tags.map(t => t.name));
      setFilters({});
    }).catch(() => {
      setFilterFields([]);
      setTagOptions([]);
    });
  }, [selectedBoardId]);

  // Filter helpers
  const toggleFilter = (fieldId: string, value: string) => {
    setFilters(prev => {
      const current = prev[fieldId] || [];
      return {
        ...prev,
        [fieldId]: current.includes(value) ? current.filter(v => v !== value) : [...current, value],
      };
    });
  };
  const clearFilters = () => setFilters({});
  const hasActiveFilters = Object.values(filters).some(f => f.length > 0);

  const getFieldFilterOptions = useCallback((field: BoardField): { value: string; label: string }[] => {
    if (field.fieldType === "checkbox") {
      return [{ value: "true", label: "Да" }, { value: "false", label: "Нет" }];
    }
    if ((field.fieldType === "select" || field.fieldType === "multiselect" || field.fieldType === "priority") && field.options) {
      return field.options.map(o => ({ value: o, label: o }));
    }
    if (field.fieldType === "user" || field.fieldType === "user_list") {
      return memberOptions.map(m => ({ value: m.id, label: m.name }));
    }
    if (field.fieldType === "tags") {
      return tagOptions.map(t => ({ value: t, label: t }));
    }
    return [];
  }, [memberOptions, tagOptions]);

  const analyticsFilters: AnalyticsFilters | undefined = useMemo(() => {
    const hasFilters = Object.values(filters).some(v => v.length > 0);
    if (!selectedBoardId && !hasFilters) return undefined;
    return {
      boardId: selectedBoardId || undefined,
      filters: hasFilters ? filters : undefined,
    };
  }, [selectedBoardId, filters]);

  // Load forecast
  const loadForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMonteCarloForecast(projectId, forecastTasks, targetDate || undefined, weeks, analyticsFilters);
      setData(result);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить прогноз");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, forecastTasks, targetDate, weeks, analyticsFilters]);

  useEffect(() => { loadForecast(); }, [loadForecast]);

  const interpretation = data ? buildInterpretation(data, forecastTasks, targetDate || undefined) : [];

  return (
    <div className="space-y-6">
      {/* How it works guide */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-slate-50 rounded-xl transition-colors"
        >
          <Info size={20} className="text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-slate-700">Как работает прогнозирование Монте-Карло?</span>
          <span className={`ml-auto text-slate-400 transition-transform ${showGuide ? "rotate-180" : ""}`}>&#9662;</span>
        </button>
        {showGuide && (
          <div className="px-5 pb-5 text-sm text-slate-600 space-y-3 border-t border-slate-100 pt-4">
            <p>
              Метод <strong>Монте-Карло</strong> — это статистический подход к прогнозированию, который использует историческую
              производительность команды для моделирования множества возможных сценариев завершения работы.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-slate-700">Принцип работы:</p>
              <ol className="list-decimal ml-5 space-y-1.5">
                <li>Система анализирует, сколько задач команда завершала каждую неделю за выбранный исторический период.</li>
                <li>Запускается 10 000 симуляций: в каждой будущие недели «разыгрываются» случайным образом на основе реальной истории — каждую неделю берётся случайное значение из исторических данных.</li>
                <li>По итогам всех симуляций определяются даты завершения для разных уровней вероятности (50%, 75%, 85%, 90%).</li>
              </ol>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-slate-700">Параметры:</p>
              <ul className="space-y-1.5">
                <li><strong>Количество задач</strong> — сколько задач нужно завершить. Влияет на горизонт прогноза.</li>
                <li><strong>Глубина выборки</strong> — за сколько последних недель берётся история производительности.
                  По умолчанию — 12 недель (минимум 2). Меньшее значение учитывает только недавнюю динамику
                  (полезно, если команда недавно изменилась). Большее — даёт более стабильный прогноз,
                  но может включать устаревшие периоды.</li>
                <li><strong>Целевая дата</strong> — система дополнительно рассчитает вероятность уложиться в эту дату.</li>
              </ul>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800">
                <strong>Важно:</strong> прогноз основан на прошлой производительности. Если команда изменилась, процессы
                перестроились или характер задач существенно отличается — используйте меньшую глубину выборки
                для более актуального прогноза. Для обязательств рекомендуется ориентироваться на вероятность 75–85%.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Board & field filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-5 py-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Доска</label>
          </div>
          <div className="min-w-[200px] flex-1 max-w-sm">
            <Select value={selectedBoardId} onValueChange={setSelectedBoardId} ariaLabel="Фильтр по доске">
              <SelectOption value="">Все доски</SelectOption>
              {boards.map(b => (
                <SelectOption key={b.id} value={b.id}>{b.name}</SelectOption>
              ))}
            </Select>
          </div>
        </div>

        {selectedBoardId && filterFields.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Фильтры по параметрам задач</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium">
                  <X size={12} /> Сбросить
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {filterFields.map((field) => {
                const opts = getFieldFilterOptions(field);
                if (opts.length === 0) return null;
                return (
                  <FilterDropdown
                    key={field.id}
                    label={field.name}
                    options={opts.map(o => o.value)}
                    selectedValues={filters[field.id] || []}
                    onToggle={(v) => toggleFilter(field.id, v)}
                    renderOption={(v) => opts.find(o => o.value === v)?.label || v}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Forecast card */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-lg">
            <BarChart3 size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Вероятностное прогнозирование (Монте-Карло)</h3>
            <p className="text-sm text-slate-600">
              Прогноз дат завершения работ на основе исторических данных
            </p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 leading-relaxed">
          <p>
            Вместо одного фиксированного прогноза алгоритм моделирует <strong>тысячи возможных сценариев</strong> будущего,
            основываясь на реальной скорости работы команды за последние недели. Ключевой принцип — будущее не будет идеальным:
            бывают продуктивные недели и бывают простои, и прогноз учитывает эту <strong>вариативность</strong>.
            В результате вы получаете не одну дату, а спектр дат с разной вероятностью — от оптимистичного до консервативного сценария,
            что позволяет принимать взвешенные решения при планировании сроков.
          </p>
        </div>

        {/* Input Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2">Количество задач для прогноза</label>
            <input
              type="number"
              value={forecastTasks}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1) setForecastTasks(v);
              }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Глубина выборки истории</label>
            <Select
              value={String(weeks)}
              onValueChange={(v) => setWeeks(Number(v))}
              ariaLabel="Глубина выборки"
            >
              {WEEKS_OPTIONS.map(o => (
                <SelectOption key={o.value} value={String(o.value)}>{o.label}</SelectOption>
              ))}
            </Select>
            <p className="text-xs text-slate-400 mt-1">За сколько последних недель учитывать производительность</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Целевая дата (опционально)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Рассчитает вероятность уложиться в эту дату</p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={20} className="text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Empty report — no throughput history */}
        {!loading && !error && data && data.percentiles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
            <AlertCircle size={36} className="text-amber-500 mb-3" />
            <p className="text-slate-600 font-medium mb-2">Недостаточно данных для прогнозирования</p>
            <p className="text-sm text-slate-400 max-w-md">
              За выбранный период ({weeks} нед.) не найдено ни одной завершённой задачи{selectedBoardId ? " по выбранной доске и фильтрам" : ""}.
              Для построения прогноза необходимо, чтобы хотя бы в одной неделе периода были завершённые задачи.
              Попробуйте увеличить глубину выборки или изменить фильтры.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && data && data.percentiles.length > 0 && (
          <>
            {/* Probability Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {PERCENTILE_CARDS.map(card => {
                const pct = findPercentile(data.percentiles, card.p);
                if (!pct) return null;
                return (
                  <div key={card.p} className={`p-4 bg-gradient-to-br ${card.from} ${card.to} border ${card.border} rounded-lg`}>
                    <p className={`text-sm ${card.text} font-medium mb-1`}>{card.label}</p>
                    <p className={`text-2xl font-bold ${card.text}`}>{formatDate(pct.date)}</p>
                    <p className={`text-xs ${card.subtext} mt-1`}>{card.subtitle}</p>
                  </div>
                );
              })}
            </div>

            {/* Target date probability */}
            {targetDate && data.targetDateProbability != null && (
              <div className={`p-4 mb-6 rounded-lg border ${
                data.targetDateProbability >= 85
                  ? "bg-green-50 border-green-200"
                  : data.targetDateProbability >= 50
                  ? "bg-amber-50 border-amber-200"
                  : "bg-red-50 border-red-200"
              }`}>
                <p className={`text-sm font-medium ${
                  data.targetDateProbability >= 85 ? "text-green-700"
                  : data.targetDateProbability >= 50 ? "text-amber-700"
                  : "text-red-700"
                }`}>
                  Вероятность завершения к {formatDate(targetDate)}: <strong>{data.targetDateProbability}%</strong>
                </p>
              </div>
            )}

            {/* Chart */}
            <ChartContainer
              height={320}
              scrollableOnMobile
              minWidthOnMobile={Math.max(560, data.chart.length * 45)}
            >
              <BarChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" {...xAxisDefaults({ count: data.chart.length })} />
                <YAxis {...yAxisDefaults({ width: 56 })} label={{ value: "Вероятность (%)", angle: -90, position: "insideLeft" }} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Вероятность"]}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Legend />
                <Bar
                  dataKey="probability"
                  fill="#3b82f6"
                  name="Вероятность завершения"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>

            {/* Interpretation */}
            {interpretation.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-700 mb-2">Интерпретация результатов</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {interpretation.map((line, i) => (
                    <li key={i} className={i === interpretation.length - 1 ? "mt-2 pt-2 border-t border-blue-300" : ""}>
                      • <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* No data */}
        {!loading && !error && !data && (
          <div className="flex items-center justify-center h-[300px] text-slate-400">
            <p>Нет данных для прогнозирования. Необходимо завершить несколько задач для накопления исторических данных.</p>
          </div>
        )}
      </div>
    </div>
  );
}
