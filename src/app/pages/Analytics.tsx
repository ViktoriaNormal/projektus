import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from "recharts";
import { TrendingUp, Activity, Clock, Zap, Loader2, X, Filter } from "lucide-react";
import { ChartContainer, CHART_TOOLTIP_STYLE } from "../components/ui/ChartContainer";
import { xAxisDefaults, yAxisDefaults } from "../components/ui/chart-axis";
import { Select, SelectOption } from "../components/ui/Select";
import { getProjectSprints, type SprintResponse } from "../api/sprints";
import {
  getVelocityChart, getBurndownChart,
  getKanbanSummary, getCumulativeFlow, getCycleTimeScatter,
  getThroughput, getAvgCycleTime, getThroughputTrend,
  getWipHistory, getCycleTimeDistribution, getThroughputDistribution,
  type VelocityResponse, type BurndownResponse,
  type KanbanSummaryResponse, type CumulativeFlowResponse,
  type CycleTimeScatterResponse, type ThroughputResponse,
  type AvgCycleTimeResponse, type ThroughputTrendResponse,
  type WipHistoryResponse, type DistributionResponse,
  type AnalyticsFilters,
} from "../api/analytics";
import { getProjectBoards, getBoardFields, type BoardResponse, type BoardField } from "../api/boards";
import { getBoardTags, type TagResponse } from "../api/tags";
import { getProjectMembers } from "../api/projects";
import { getUser } from "../api/users";
import { FilterDropdown } from "../components/FilterDropdown";

const METRIC_OPTIONS = [
  { value: "task_count", label: "По количеству задач" },
  { value: "story_points", label: "По Story Points" },
  { value: "estimation_hours", label: "По часам оценки" },
];

const VELOCITY_LIMIT_OPTIONS = [
  { value: 0, label: "Все спринты" },
  { value: 5, label: "Последние 5" },
  { value: 10, label: "Последние 10" },
  { value: 15, label: "Последние 15" },
];

const FILTERABLE_TYPES = new Set(["priority", "select", "checkbox", "multiselect", "user", "user_list", "tags"]);

const tooltipStyle = CHART_TOOLTIP_STYLE;

interface AnalyticsProps {
  projectId: string;
  projectType: string;
}

export default function Analytics({ projectId, projectType }: AnalyticsProps) {
  // Board & filter state
  const [boards, setBoards] = useState<BoardResponse[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [filterFields, setFilterFields] = useState<BoardField[]>([]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [memberOptions, setMemberOptions] = useState<{ id: string; name: string }[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  // Load boards
  useEffect(() => {
    getProjectBoards(projectId)
      .then(b => setBoards(b.sort((a, c) => a.order - c.order)))
      .catch(() => setBoards([]));
  }, [projectId]);

  // Load project members (for user/user_list filter options)
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

  // Load board fields and tags when board is selected
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

  // Compute analytics filters for API calls
  const analyticsFilters: AnalyticsFilters | undefined = useMemo(() => {
    const hasFilters = Object.values(filters).some(v => v.length > 0);
    if (!selectedBoardId && !hasFilters) return undefined;
    return {
      boardId: selectedBoardId || undefined,
      filters: hasFilters ? filters : undefined,
    };
  }, [selectedBoardId, filters]);

  // Scrum controls
  const [metricType, setMetricType] = useState("task_count");
  const [velocityLimit, setVelocityLimit] = useState(0);
  const [sprints, setSprints] = useState<SprintResponse[]>([]);
  const [burndownSprintId, setBurndownSprintId] = useState<string>("");

  // Scrum data
  const [velocityData, setVelocityData] = useState<VelocityResponse | null>(null);
  const [burndownData, setBurndownData] = useState<BurndownResponse | null>(null);
  const [loadingVelocity, setLoadingVelocity] = useState(false);
  const [loadingBurndown, setLoadingBurndown] = useState(false);

  // Load sprints
  useEffect(() => {
    if (projectType === "scrum") {
      getProjectSprints(projectId).then(sp => {
        setSprints(sp);
        const active = sp.find(s => s.status === "active");
        setBurndownSprintId(active?.id || (sp.length > 0 ? sp[sp.length - 1].id : ""));
      }).catch(() => setSprints([]));
    } else {
      setSprints([]);
    }
  }, [projectId, projectType]);

  // Load velocity
  const loadVelocity = useCallback(async () => {
    if (projectType !== "scrum") {
      setVelocityData(null);
      return;
    }
    setLoadingVelocity(true);
    try {
      const data = await getVelocityChart(projectId, metricType, velocityLimit, analyticsFilters);
      setVelocityData(data);
    } catch {
      setVelocityData(null);
    } finally {
      setLoadingVelocity(false);
    }
  }, [projectId, projectType, metricType, velocityLimit, analyticsFilters]);

  // Load burndown
  const loadBurndown = useCallback(async () => {
    if (projectType !== "scrum" || !burndownSprintId) {
      setBurndownData(null);
      return;
    }
    setLoadingBurndown(true);
    try {
      const data = await getBurndownChart(projectId, metricType, burndownSprintId, analyticsFilters);
      setBurndownData(data);
    } catch {
      setBurndownData(null);
    } finally {
      setLoadingBurndown(false);
    }
  }, [projectId, projectType, metricType, burndownSprintId, analyticsFilters]);

  useEffect(() => { loadVelocity(); }, [loadVelocity]);
  useEffect(() => { loadBurndown(); }, [loadBurndown]);

  const metricLabel = METRIC_OPTIONS.find(m => m.value === metricType)?.label || "";
  const metricUnit = metricType === "story_points" ? "SP" : metricType === "estimation_hours" ? "ч" : "задач";

  // Scrum summary metrics
  const metrics = velocityData?.metrics;

  // Kanban data
  const [kanbanSummary, setKanbanSummary] = useState<KanbanSummaryResponse | null>(null);
  const [cumulativeFlow, setCumulativeFlow] = useState<CumulativeFlowResponse | null>(null);
  const [cycleTimeScatter, setCycleTimeScatter] = useState<CycleTimeScatterResponse | null>(null);
  const [throughputData, setThroughputData] = useState<ThroughputResponse | null>(null);
  const [avgCycleTime, setAvgCycleTime] = useState<AvgCycleTimeResponse | null>(null);
  const [throughputTrend, setThroughputTrend] = useState<ThroughputTrendResponse | null>(null);
  const [wipHistory, setWipHistory] = useState<WipHistoryResponse | null>(null);
  const [cycleTimeDist, setCycleTimeDist] = useState<DistributionResponse | null>(null);
  const [throughputDist, setThroughputDist] = useState<DistributionResponse | null>(null);
  const [loadingKanban, setLoadingKanban] = useState(false);
  const [kanbanErrors, setKanbanErrors] = useState<string[]>([]);

  useEffect(() => {
    if (projectType !== "kanban") return;
    setLoadingKanban(true);
    setKanbanErrors([]);

    const calls: [string, Promise<void>][] = [
      ["summary", getKanbanSummary(projectId, analyticsFilters).then(setKanbanSummary)],
      ["cumulative-flow", getCumulativeFlow(projectId, analyticsFilters).then(setCumulativeFlow)],
      ["cycle-time-scatter", getCycleTimeScatter(projectId, analyticsFilters).then(setCycleTimeScatter)],
      ["throughput", getThroughput(projectId, analyticsFilters).then(setThroughputData)],
      ["avg-cycle-time", getAvgCycleTime(projectId, analyticsFilters).then(setAvgCycleTime)],
      ["throughput-trend", getThroughputTrend(projectId, analyticsFilters).then(setThroughputTrend)],
      ["wip", getWipHistory(projectId, analyticsFilters).then(setWipHistory)],
      ["cycle-time-distribution", getCycleTimeDistribution(projectId, analyticsFilters).then(setCycleTimeDist)],
      ["throughput-distribution", getThroughputDistribution(projectId, analyticsFilters).then(setThroughputDist)],
    ];

    Promise.allSettled(calls.map(([, p]) => p)).then(results => {
      const errors: string[] = [];
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          errors.push(`${calls[i][0]}: ${r.reason?.message || "Ошибка загрузки"}`);
        }
      });
      if (errors.length > 0) setKanbanErrors(errors);
    }).finally(() => setLoadingKanban(false));
  }, [projectId, projectType, analyticsFilters]);

  return (
    <div className="space-y-6">
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

      {/* Scrum metric type selector */}
      {projectType === "scrum" && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-slate-600">Единица измерения для расчёта метрик и графиков:</label>
          <div className="min-w-[200px]">
            <Select value={metricType} onValueChange={setMetricType} ariaLabel="Единица измерения">
              {METRIC_OPTIONS.map(m => (
                <SelectOption key={m.value} value={m.value}>{m.label}</SelectOption>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* Scrum Metrics Summary */}
      {projectType === "scrum" && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Средняя скорость команды (Velocity)",
              description: `Среднее количество работы, которое команда выполняет за один спринт. Рассчитывается по всем завершённым спринтам как среднее значение выполненных ${metricUnit}.`,
              value: `${metrics.averageVelocity} ${metricUnit}`,
              change: metrics.velocityTrend > 0 ? `+${metrics.velocityTrend}%` : `${metrics.velocityTrend}%`,
              changeTip: "Тренд по сравнению с предыдущим спринтом",
              icon: TrendingUp,
              bgColor: "bg-blue-50",
              textColor: "text-blue-600",
            },
            {
              label: "Выполнение обязательств",
              description: `Процент выполненной работы от запланированной. Показывает, какую долю запланированного объёма команда реально завершает в спринтах. Значение ≥ 80% считается хорошим.`,
              value: `${metrics.completionRate}%`,
              change: metrics.completionRate >= 80 ? "Хорошо" : "Требует внимания",
              changeTip: "",
              icon: Activity,
              bgColor: "bg-green-50",
              textColor: "text-green-600",
            },
            {
              label: "Средний объём спринта",
              description: `Среднее количество работы, которое команда берёт в спринт при планировании. Рассчитывается по всем завершённым спринтам.`,
              value: `${metrics.averageSprintScope} ${metricUnit}`,
              change: "",
              changeTip: "",
              icon: Zap,
              bgColor: "bg-purple-50",
              textColor: "text-purple-600",
            },
            {
              label: "Завершённых спринтов",
              description: "Общее количество завершённых спринтов в проекте, по которым рассчитываются все метрики.",
              value: `${metrics.sprintCount}`,
              change: "",
              changeTip: "",
              icon: Clock,
              bgColor: "bg-orange-50",
              textColor: "text-orange-600",
            },
          ].map((metric, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`${metric.bgColor} p-3 rounded-lg`}>
                  <metric.icon className={metric.textColor} size={24} />
                </div>
                {metric.change && (
                  <span className={`text-sm font-semibold ${
                    metric.change.startsWith("+") ? "text-green-600"
                    : metric.change.startsWith("-") ? "text-red-600"
                    : metric.change === "Хорошо" ? "text-green-600"
                    : metric.change === "Требует внимания" ? "text-amber-600"
                    : "text-slate-600"
                  }`} title={metric.changeTip}>
                    {metric.change}
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-sm font-medium">{metric.label}</p>
              <p className="text-2xl font-bold mt-1">{metric.value}</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{metric.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Metrics Summary */}
      {projectType === "kanban" && kanbanSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Средняя скорость", value: `${kanbanSummary.data.averageVelocity} ${kanbanSummary.data.averageVelocityUnit}`, change: kanbanSummary.data.velocityTrend > 0 ? `+${kanbanSummary.data.velocityTrend}%` : `${kanbanSummary.data.velocityTrend}%`, icon: TrendingUp, bgColor: "bg-blue-50", textColor: "text-blue-600" },
            { label: "Время цикла", value: `${kanbanSummary.data.cycleTime} дней`, change: kanbanSummary.data.cycleTimeTrend > 0 ? `+${kanbanSummary.data.cycleTimeTrend}%` : `${kanbanSummary.data.cycleTimeTrend}%`, icon: Clock, bgColor: "bg-green-50", textColor: "text-green-600" },
            { label: "Пропускная способность", value: `${kanbanSummary.data.throughput} задач/нед`, change: kanbanSummary.data.throughputTrend > 0 ? `+${kanbanSummary.data.throughputTrend}%` : `${kanbanSummary.data.throughputTrend}%`, icon: Activity, bgColor: "bg-purple-50", textColor: "text-purple-600" },
            { label: "Незавершённая работа", value: `${kanbanSummary.data.wip} задач`, change: kanbanSummary.data.wipChange > 0 ? `+${kanbanSummary.data.wipChange}` : `${kanbanSummary.data.wipChange}`, icon: Zap, bgColor: "bg-orange-50", textColor: "text-orange-600" },
          ].map((metric, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`${metric.bgColor} p-3 rounded-lg`}>
                  <metric.icon className={metric.textColor} size={24} />
                </div>
                <span className={`text-sm font-semibold ${
                  metric.change.startsWith("+") ? "text-green-600" : metric.change.startsWith("-") ? "text-red-600" : "text-slate-600"
                }`}>
                  {metric.change}
                </span>
              </div>
              <p className="text-slate-600 text-sm">{metric.label}</p>
              <p className="text-2xl font-bold mt-1">{metric.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── SCRUM Charts ────────────────────────────────────────── */}
      {projectType === "scrum" && (
        <>
          {/* Velocity Chart */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={24} />
                График скорости команды (Velocity)
              </h2>
              <div className="min-w-[180px]">
                <Select
                  value={String(velocityLimit)}
                  onValueChange={(v) => setVelocityLimit(Number(v))}
                  ariaLabel="Период velocity"
                >
                  {VELOCITY_LIMIT_OPTIONS.map(o => (
                    <SelectOption key={o.value} value={String(o.value)}>{o.label}</SelectOption>
                  ))}
                </Select>
              </div>
            </div>
            {loadingVelocity ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 size={32} className="animate-spin text-blue-600" />
              </div>
            ) : velocityData && velocityData.data.length > 0 ? (
              <ChartContainer
                height={300}
                scrollableOnMobile
                minWidthOnMobile={Math.max(560, velocityData.data.length * 60)}
              >
                <BarChart data={velocityData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sprint" {...xAxisDefaults({ count: velocityData.data.length })} />
                  <YAxis {...yAxisDefaults()} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="planned" fill="#3b82f6" name="Запланировано" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="completed" fill="#10b981" name="Выполнено" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-400">
                <p>Нет данных для отображения. Завершите хотя бы один спринт.</p>
              </div>
            )}
            {velocityData?.interpretation && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Интерпретация данных</h3>
                <p className="text-sm text-blue-800">{velocityData.interpretation}</p>
              </div>
            )}
          </div>

          {/* Burndown Chart */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity className="text-green-600" size={24} />
                Диаграмма сгорания задач (Burndown)
              </h2>
              <div className="min-w-[200px]">
                <Select value={burndownSprintId} onValueChange={setBurndownSprintId} ariaLabel="Спринт для burndown">
                  {sprints.map(s => (
                    <SelectOption key={s.id} value={s.id}>
                      {s.name} {s.status === "active" ? "(активный)" : s.status === "completed" ? "(завершён)" : "(запланирован)"}
                    </SelectOption>
                  ))}
                </Select>
              </div>
            </div>
            {loadingBurndown ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 size={32} className="animate-spin text-green-600" />
              </div>
            ) : burndownData && burndownData.data.length > 0 ? (
              <>
                {burndownData.sprintName && (
                  <p className="text-sm text-slate-500 mb-3">Спринт: <strong>{burndownData.sprintName}</strong> ({metricLabel})</p>
                )}
                <ChartContainer
                  height={300}
                  scrollableOnMobile
                  minWidthOnMobile={Math.max(560, burndownData.data.length * 45)}
                >
                  <LineChart data={burndownData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" {...xAxisDefaults({ count: burndownData.data.length })} />
                    <YAxis {...yAxisDefaults()} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ideal"
                      stroke="#94a3b8"
                      strokeDasharray="5 5"
                      name="Идеальная линия"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="remaining"
                      stroke="#3b82f6"
                      name="Осталось"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ChartContainer>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-400">
                <p>Нет данных для выбранного спринта</p>
              </div>
            )}
            {burndownData?.interpretation && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Интерпретация данных</h3>
                <p className="text-sm text-green-800">{burndownData.interpretation}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── KANBAN Charts ─────────────────────────────────────────── */}
      {projectType === "kanban" && (loadingKanban ? (
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {kanbanErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">Ошибки загрузки аналитики</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {kanbanErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
          {[
            { title: "Накопительная диаграмма потока", icon: Activity, iconColor: "text-purple-600", bgColor: "bg-purple-50", textColor: "text-purple-800", titleColor: "text-purple-900", data: cumulativeFlow, render: (d: CumulativeFlowResponse) => (
              <AreaChart data={d.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" {...xAxisDefaults({ count: d.data.length })} />
                <YAxis {...yAxisDefaults()} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {(d.columns || Object.keys(d.data[0] || {}).filter(k => k !== "date")).map((col, i) => {
                  const colors = ["#10b981", "#8b5cf6", "#3b82f6", "#f59e0b", "#64748b", "#ef4444", "#06b6d4", "#f97316"];
                  return <Area key={col} type="monotone" dataKey={col} stackId="1" stroke={colors[i % colors.length]} fill={colors[i % colors.length]} name={col} />;
                })}
              </AreaChart>
            )},
            { title: "Диаграмма рассеяния времени производства", icon: Clock, iconColor: "text-blue-600", bgColor: "bg-blue-50", textColor: "text-blue-800", titleColor: "text-blue-900", data: cycleTimeScatter, scrollableOnMobile: true, render: (d: CycleTimeScatterResponse) => (
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="task" {...xAxisDefaults({ count: d.data.length, angleAfter: 6, height: 80 })} />
                <YAxis dataKey="time" {...yAxisDefaults({ width: 48 })} label={{ value: "Дни", angle: -90 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={d.data} fill="#3b82f6" />
              </ScatterChart>
            )},
            { title: "Скорость поставки (Throughput)", icon: Zap, iconColor: "text-orange-600", bgColor: "bg-orange-50", textColor: "text-orange-800", titleColor: "text-orange-900", data: throughputData, render: (d: ThroughputResponse) => (
              <BarChart data={d.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" {...xAxisDefaults({ count: d.data.length })} />
                <YAxis {...yAxisDefaults()} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#f59e0b" name="Задач завершено" radius={[8, 8, 0, 0]} />
              </BarChart>
            )},
            { title: "Среднее время производства (Cycle Time)", icon: Clock, iconColor: "text-indigo-600", bgColor: "bg-indigo-50", textColor: "text-indigo-800", titleColor: "text-indigo-900", data: avgCycleTime, render: (d: AvgCycleTimeResponse) => (
              <LineChart data={d.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" {...xAxisDefaults({ count: d.data.length })} />
                <YAxis {...yAxisDefaults({ width: 48 })} label={{ value: "Дни", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={3} name="Среднее время" dot={{ fill: "#6366f1", r: 5 }} />
                <Line type="monotone" dataKey="p50" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Медиана (50%)" />
                <Line type="monotone" dataKey="p85" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="85-й процентиль" />
              </LineChart>
            )},
            { title: "Тренд скорости поставки", icon: TrendingUp, iconColor: "text-emerald-600", bgColor: "bg-emerald-50", textColor: "text-emerald-800", titleColor: "text-emerald-900", data: throughputTrend, render: (d: ThroughputTrendResponse) => (
              <LineChart data={d.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" {...xAxisDefaults({ count: d.data.length })} />
                <YAxis {...yAxisDefaults({ width: 56 })} label={{ value: "Задач/неделя", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} name="Фактическая скорость" dot={{ fill: "#10b981", r: 5 }} />
                <Line type="monotone" dataKey="trend" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Линия тренда" />
              </LineChart>
            )},
            { title: "Незавершённая работа (WIP)", icon: Activity, iconColor: "text-cyan-600", bgColor: "bg-cyan-50", textColor: "text-cyan-800", titleColor: "text-cyan-900", data: wipHistory, render: (d: WipHistoryResponse) => (
              <ComposedChart data={d.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" {...xAxisDefaults({ count: d.data.length })} />
                <YAxis {...yAxisDefaults()} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="wip" stroke="#06b6d4" strokeWidth={3} name="Текущий WIP" dot={{ fill: "#06b6d4", r: 5 }} />
                <Line type="monotone" dataKey="limit" stroke="#ef4444" strokeWidth={2} strokeDasharray="8 4" name="WIP-лимит" dot={false} />
              </ComposedChart>
            )},
            { title: "Распределение времени производства", icon: Activity, iconColor: "text-violet-600", bgColor: "bg-violet-50", textColor: "text-violet-800", titleColor: "text-violet-900", data: cycleTimeDist, render: (d: DistributionResponse) => (
              <BarChart data={d.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" {...xAxisDefaults({ count: d.data.length })} label={{ value: "Диапазон (дни)", position: "insideBottom", offset: -5 }} />
                <YAxis {...yAxisDefaults({ width: 56 })} label={{ value: "Количество задач", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#8b5cf6" name="Задач" radius={[8, 8, 0, 0]} />
              </BarChart>
            )},
            { title: "Распределение скорости поставки", icon: Activity, iconColor: "text-amber-600", bgColor: "bg-amber-50", textColor: "text-amber-800", titleColor: "text-amber-900", data: throughputDist, render: (d: DistributionResponse) => (
              <BarChart data={d.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" {...xAxisDefaults({ count: d.data.length })} label={{ value: "Задач в неделю", position: "insideBottom", offset: -5 }} />
                <YAxis {...yAxisDefaults({ width: 56 })} label={{ value: "Недель", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#f59e0b" name="Частота" radius={[8, 8, 0, 0]} />
              </BarChart>
            )},
          ].map((chart, idx) => {
            const Icon = chart.icon;
            const hasData = chart.data && (chart.data as any).data?.length > 0;
            const count = (chart.data as any)?.data?.length ?? 0;
            // Dense scatter (tasks) needs wider per-point spacing than week-based charts
            const perPoint = chart.scrollableOnMobile ? 28 : 48;
            const minWidth = Math.max(560, count * perPoint);
            return (
              <div key={idx} className="bg-white rounded-xl p-4 md:p-6 shadow-md border border-slate-100">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Icon className={chart.iconColor} size={24} />
                  {chart.title}
                </h2>
                {hasData ? (
                  <ChartContainer
                    height={300}
                    scrollableOnMobile
                    minWidthOnMobile={minWidth}
                  >
                    {chart.render(chart.data as any)}
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-400">
                    <p>Нет данных для отображения. Завершите несколько задач для построения графика.</p>
                  </div>
                )}
                {chart.data?.interpretation && (
                  <div className={`mt-4 p-4 ${chart.bgColor} rounded-lg`}>
                    <h3 className={`font-semibold ${chart.titleColor} mb-2`}>Интерпретация данных</h3>
                    <p className={`text-sm ${chart.textColor}`}>{chart.data.interpretation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </>
      ))}
    </div>
  );
}
