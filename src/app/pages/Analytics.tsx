import { useState, useEffect, useCallback } from "react";
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
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { TrendingUp, Activity, Clock, Zap, Loader2 } from "lucide-react";
import { analyticsData } from "../data/mockData";
import { getProjects, type ProjectResponse } from "../api/projects";
import { getProjectSprints, type SprintResponse } from "../api/sprints";
import {
  getVelocityChart, getBurndownChart,
  type VelocityResponse, type BurndownResponse,
} from "../api/analytics";

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

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
};

export default function Analytics() {
  const [realProjects, setRealProjects] = useState<ProjectResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);

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

  // Load real projects
  useEffect(() => {
    getProjects().then(projs => {
      const active = projs.filter(p => p.status === "active");
      setRealProjects(active);
      if (active.length > 0) {
        setSelectedProjectId(active[0].id);
      }
    }).catch(() => {});
  }, []);

  // Update selected project + load sprints
  useEffect(() => {
    const proj = realProjects.find(p => p.id === selectedProjectId);
    setSelectedProject(proj || null);
    if (proj?.projectType === "scrum") {
      getProjectSprints(proj.id).then(sp => {
        setSprints(sp);
        const active = sp.find(s => s.status === "active");
        setBurndownSprintId(active?.id || (sp.length > 0 ? sp[sp.length - 1].id : ""));
      }).catch(() => setSprints([]));
    } else {
      setSprints([]);
    }
  }, [selectedProjectId, realProjects]);

  // Load velocity
  const loadVelocity = useCallback(async () => {
    if (!selectedProject || selectedProject.projectType !== "scrum") {
      setVelocityData(null);
      return;
    }
    setLoadingVelocity(true);
    try {
      const data = await getVelocityChart(selectedProject.id, metricType, velocityLimit);
      setVelocityData(data);
    } catch {
      setVelocityData(null);
    } finally {
      setLoadingVelocity(false);
    }
  }, [selectedProject, metricType, velocityLimit]);

  // Load burndown
  const loadBurndown = useCallback(async () => {
    if (!selectedProject || selectedProject.projectType !== "scrum" || !burndownSprintId) {
      setBurndownData(null);
      return;
    }
    setLoadingBurndown(true);
    try {
      const data = await getBurndownChart(selectedProject.id, metricType, burndownSprintId);
      setBurndownData(data);
    } catch {
      setBurndownData(null);
    } finally {
      setLoadingBurndown(false);
    }
  }, [selectedProject, metricType, burndownSprintId]);

  useEffect(() => { loadVelocity(); }, [loadVelocity]);
  useEffect(() => { loadBurndown(); }, [loadBurndown]);

  const metricLabel = METRIC_OPTIONS.find(m => m.value === metricType)?.label || "";
  const metricUnit = metricType === "story_points" ? "SP" : metricType === "estimation_hours" ? "ч" : "задач";

  // Scrum summary metrics
  const metrics = velocityData?.metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Аналитика и отчётность</h1>
          <p className="text-slate-600 mt-1">Визуализация проектных данных</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {realProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} - {p.name}
              </option>
            ))}
          </select>
          {selectedProject?.projectType === "scrum" && (
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {METRIC_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Scrum Metrics Summary */}
      {selectedProject?.projectType === "scrum" && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Средняя скорость",
              value: `${metrics.averageVelocity} ${metricUnit}`,
              change: metrics.velocityTrend > 0 ? `+${metrics.velocityTrend}%` : `${metrics.velocityTrend}%`,
              icon: TrendingUp,
              bgColor: "bg-blue-50",
              textColor: "text-blue-600",
            },
            {
              label: "Выполнение обязательств",
              value: `${metrics.completionRate}%`,
              change: metrics.completionRate >= 80 ? "Хорошо" : "Требует внимания",
              icon: Activity,
              bgColor: "bg-green-50",
              textColor: "text-green-600",
            },
            {
              label: "Средний объём спринта",
              value: `${metrics.averageSprintScope} ${metricUnit}`,
              change: "",
              icon: Zap,
              bgColor: "bg-purple-50",
              textColor: "text-purple-600",
            },
            {
              label: "Завершённых спринтов",
              value: `${metrics.sprintCount}`,
              change: "",
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
                  }`}>
                    {metric.change}
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-sm">{metric.label}</p>
              <p className="text-2xl font-bold mt-1">{metric.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Metrics (mock) */}
      {selectedProject?.projectType === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Средняя скорость", value: "36 SP", change: "+8%", icon: TrendingUp, bgColor: "bg-blue-50", textColor: "text-blue-600" },
            { label: "Время цикла", value: "4.8 дней", change: "-12%", icon: Clock, bgColor: "bg-green-50", textColor: "text-green-600" },
            { label: "Пропускная способность", value: "13 задач/нед", change: "+5%", icon: Activity, bgColor: "bg-purple-50", textColor: "text-purple-600" },
            { label: "Незавершённая работа", value: "18 задач", change: "-3", icon: Zap, bgColor: "bg-orange-50", textColor: "text-orange-600" },
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
      {selectedProject?.projectType === "scrum" && (
        <>
          {/* Velocity Chart */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={24} />
                График скорости команды (Velocity)
              </h2>
              <select
                value={velocityLimit}
                onChange={e => setVelocityLimit(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {VELOCITY_LIMIT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {loadingVelocity ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 size={32} className="animate-spin text-blue-600" />
              </div>
            ) : velocityData && velocityData.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={velocityData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sprint" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="planned" fill="#3b82f6" name="Запланировано" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="completed" fill="#10b981" name="Выполнено" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
              <select
                value={burndownSprintId}
                onChange={e => setBurndownSprintId(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.status === "active" ? "(активный)" : s.status === "completed" ? "(завершён)" : "(запланирован)"}
                  </option>
                ))}
              </select>
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
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={burndownData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
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
                </ResponsiveContainer>
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

      {/* ── KANBAN Charts (mock data) ───────────────────────────── */}
      {selectedProject?.projectType === "kanban" && (
        <>
          {/* Cumulative Flow Diagram */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="text-purple-600" size={24} />
              Накопительная диаграмма потока
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.cumulativeFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="done" stackId="1" stroke="#10b981" fill="#10b981" name="Завершено" />
                <Area type="monotone" dataKey="testing" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Тестирование" />
                <Area type="monotone" dataKey="progress" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="В работе" />
                <Area type="monotone" dataKey="ready" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Готово" />
                <Area type="monotone" dataKey="backlog" stackId="1" stroke="#64748b" fill="#64748b" name="Бэклог" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Интерпретация данных</h3>
              <p className="text-sm text-purple-800">
                Накопительная диаграмма потока показывает общее количество задач в каждом статусе во времени. Толщина каждого цветного слоя — количество задач в соответствующем статусе. Широкий слой означает накопление задач (проблема потока), узкий — быстрое прохождение.
              </p>
            </div>
          </div>

          {/* Cycle Time Scatter */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="text-blue-600" size={24} />
              Диаграмма рассеяния времени производства
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="task" stroke="#64748b" />
                <YAxis dataKey="time" stroke="#64748b" label={{ value: "Дни", angle: -90 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={analyticsData.cycleTime} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Интерпретация данных</h3>
              <p className="text-sm text-blue-800">
                Каждая точка — завершённая задача, по оси Y — сколько дней она выполнялась. Группировка точек близко друг к другу — стабильный процесс, большой разброс — высокая вариативность.
              </p>
            </div>
          </div>

          {/* Throughput */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="text-orange-600" size={24} />
              Скорость поставки (Throughput)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.throughput}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#f59e0b" name="Задач завершено" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-orange-50 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">Интерпретация данных</h3>
              <p className="text-sm text-orange-800">
                Throughput — количество завершённых задач за неделю. Стабильный throughput указывает на устойчивый процесс. Растущий тренд — команда становится эффективнее.
              </p>
            </div>
          </div>

          {/* Average Cycle Time */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="text-indigo-600" size={24} />
              Среднее время производства (Cycle Time)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.avgCycleTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" stroke="#64748b" />
                <YAxis stroke="#64748b" label={{ value: "Дни", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={3} name="Среднее время" dot={{ fill: "#6366f1", r: 5 }} />
                <Line type="monotone" dataKey="p50" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Медиана (50%)" />
                <Line type="monotone" dataKey="p85" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="85-й процентиль" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
              <h3 className="font-semibold text-indigo-900 mb-2">Интерпретация данных</h3>
              <p className="text-sm text-indigo-800">
                Среднее время, медиана 50% и 85-й процентиль. Используйте 85-й процентиль для реалистичных обещаний клиентам. Снижение всех линий — признак улучшения процесса.
              </p>
            </div>
          </div>

          {/* Throughput Trend */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-emerald-600" size={24} />
              Тренд скорости поставки
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.throughputTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" stroke="#64748b" />
                <YAxis stroke="#64748b" label={{ value: "Задач/неделя", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} name="Фактическая скорость" dot={{ fill: "#10b981", r: 5 }} />
                <Line type="monotone" dataKey="trend" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Линия тренда" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
              <h3 className="font-semibold text-emerald-900 mb-2">Интерпретация данных</h3>
              <p className="text-sm text-emerald-800">
                Зелёная линия — фактическое количество завершённых задач в неделю, серая пунктирная — линия тренда. Восходящий тренд означает рост производительности.
              </p>
            </div>
          </div>

          {/* WIP */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="text-cyan-600" size={24} />
              Незавершённая работа (WIP)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={analyticsData.wip}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="wip" stroke="#06b6d4" strokeWidth={3} name="Текущий WIP" dot={{ fill: "#06b6d4", r: 5 }} />
                <Line type="monotone" dataKey="limit" stroke="#ef4444" strokeWidth={2} strokeDasharray="8 4" name="WIP-лимит" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-cyan-50 rounded-lg">
              <h3 className="font-semibold text-cyan-900 mb-2">Интерпретация данных</h3>
              <p className="text-sm text-cyan-800">
                Голубая линия — задачи в работе, красная пунктирная — WIP-лимит. Превышение лимита — сигнал к фокусировке на завершении текущих задач.
              </p>
            </div>
          </div>

          {/* Cycle Time Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="text-violet-600" size={24} />
              Распределение времени производства
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.cycleTimeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" stroke="#64748b" label={{ value: "Диапазон (дни)", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="#64748b" label={{ value: "Количество задач", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#8b5cf6" name="Задач" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-violet-50 rounded-lg">
              <h3 className="font-semibold text-violet-900 mb-2">Интерпретация данных</h3>
              <p className="text-sm text-violet-800">
                Гистограмма показывает, сколько задач завершилось за определённое время. Полезно для прогнозирования сроков и SLA.
              </p>
            </div>
          </div>

          {/* Throughput Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="text-amber-600" size={24} />
              Распределение скорости поставки
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.throughputDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" stroke="#64748b" label={{ value: "Задач в неделю", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="#64748b" label={{ value: "Недель", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#f59e0b" name="Частота" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-amber-50 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">Интерпретация данных</h3>
              <p className="text-sm text-amber-800">
                Распределение используется для вероятностного прогнозирования: "С какой вероятностью мы завершим N задач за M недель?"
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
