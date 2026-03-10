import { useState } from "react";
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
import { TrendingUp, Activity, Clock, Zap, Filter, Download } from "lucide-react";
import { projects, analyticsData } from "../data/mockData";

export default function Analytics() {
  const [selectedProject, setSelectedProject] = useState(projects[0].id);
  const project = projects.find((p) => p.id === selectedProject);

  const activeProjects = projects.filter((p) => p.status === "Активный");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Аналитика и отчётность</h1>
          <p className="text-slate-600 mt-1">Визуализация проектных данных</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(Number(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Средняя скорость",
            value: "36 SP",
            change: "+8%",
            icon: TrendingUp,
            color: "from-blue-500 to-blue-600",
            bgColor: "bg-blue-50",
            textColor: "text-blue-600",
          },
          {
            label: "Время цикла",
            value: "4.8 дней",
            change: "-12%",
            icon: Clock,
            color: "from-green-500 to-green-600",
            bgColor: "bg-green-50",
            textColor: "text-green-600",
          },
          {
            label: "Пропускная способность",
            value: "13 задач/нед",
            change: "+5%",
            icon: Activity,
            color: "from-purple-500 to-purple-600",
            bgColor: "bg-purple-50",
            textColor: "text-purple-600",
          },
          {
            label: "Незавершённая работа",
            value: "18 задач",
            change: "-3",
            icon: Zap,
            color: "from-orange-500 to-orange-600",
            bgColor: "bg-orange-50",
            textColor: "text-orange-600",
          },
        ].map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-md border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${metric.bgColor} p-3 rounded-lg`}>
                <metric.icon className={metric.textColor} size={24} />
              </div>
              <span
                className={`text-sm font-semibold ${
                  metric.change.startsWith("+") || metric.change.startsWith("-")
                    ? metric.change.startsWith("+")
                      ? "text-green-600"
                      : "text-red-600"
                    : "text-slate-600"
                }`}
              >
                {metric.change}
              </span>
            </div>
            <p className="text-slate-600 text-sm">{metric.label}</p>
            <p className="text-2xl font-bold mt-1">{metric.value}</p>
          </div>
        ))}
      </div>

      {project?.type === "scrum" && (
        <>
          {/* Velocity Chart */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={24} />
              График скорости команды
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.velocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="sprint" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="planned" fill="#3b82f6" name="Запланировано" radius={[8, 8, 0, 0]} />
                <Bar dataKey="completed" fill="#10b981" name="Выполнено" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📊 Интерпретация данных</h3>
              <p className="text-sm text-blue-800">
                График показывает производительность команды по спринтам. <strong>Синие столбцы</strong> — количество запланированных Story Points, <strong>зелёные</strong> — фактически завершённых. Идеальная ситуация — когда зелёные столбцы совпадают или превышают синие, это означает, что команда выполняет свои обязательства. В Спринте 5 видно значительное отставание (21 из 34 SP), что требует анализа причин: недооценка сложности, внешние блокеры или проблемы в команде.
              </p>
            </div>
          </div>

          {/* Burndown Chart */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="text-green-600" size={24} />
              Диаграмма сгорания задач
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.burndown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="##64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
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
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">📊 Интерпретация данных</h3>
              <p className="text-sm text-green-800">
                Burndown показывает динамику завершения работы в текущем спринте. <strong>Пунктирная серая линия</strong> — идеальный темп выполнения при равномерной работе, <strong>синяя сплошная</strong> — фактическое количество оставшихся Story Points. Если синяя линия идёт ниже серой — команда опережает план, выше — отстаёт. График показывает, что после небольшого отставания в дни 4-5, команда ускорилась и сейчас приближается к завершению спринта в срок.
              </p>
            </div>
          </div>
        </>
      )}

      {project?.type === "kanban" && (
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="done"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  name="Завершено"
                />
                <Area
                  type="monotone"
                  dataKey="testing"
                  stackId="1"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  name="Тестирование"
                />
                <Area
                  type="monotone"
                  dataKey="progress"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  name="В работе"
                />
                <Area
                  type="monotone"
                  dataKey="ready"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  name="Готово"
                />
                <Area
                  type="monotone"
                  dataKey="backlog"
                  stackId="1"
                  stroke="#64748b"
                  fill="#64748b"
                  name="Бэклог"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">📊 Интерпретация данных</h3>
              <p className="text-sm text-purple-800">
                Накопительная диаграмма потока показывает общее количество задач в каждом статусе во времени. <strong>Толщина каждого цветного слоя</strong> — количество задач в соответствующем статусе. Вертикальное расстояние между границами одинаковых цветов показывает WIP для этого статуса. Широкий слой означае�� накопление задач (проблема потока), узкий — быстрое прохождение. Увеличение зелёного слоя (Завершено) показывает устойчивую поставку ценности.
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                  cursor={{ strokeDasharray: "3 3" }}
                />
                <Scatter data={analyticsData.cycleTime} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📊 Интерпретация данных</h3>
              <p className="text-sm text-blue-800">
                Каждая точка — отдельная завершённая задача, по оси Y — сколько дней она выполнялась. Разброс точек показывает предсказуемость процесса: <strong>если точки группируются близко</strong> — процесс стабильный и предсказуемый, <strong>если разброс большой</strong> — высокая вариативность, сложно прогнозировать сроки. Точки далеко вверху (например, ECOM-98 с 7.1 дня) — выбросы, требующие анализа причин задержки.
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="#f59e0b" name="Задач завершено" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-orange-50 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">📊 Интерпретация данных</h3>
              <p className="text-sm text-orange-800">
                Throughput — количество завершённых задач за период (неделю). Это ключевая метрика производительности в Kanban. <strong>Стабильный throughput</strong> (столбцы примерно одинаковой высоты) указывает на устойчивый процесс. <strong>астущий тренд</strong> — команда становится эффективнее. Пик в неделе 2 (15 задач) может быть результатом завершения накопленных задач, а спад в неделе 3 (11 задач) — сигналом для анализа возможных блокеров.
              </p>
            </div>
          </div>

          {/* Average Cycle Time Line Chart */}
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#6366f1"
                  strokeWidth={3}
                  name="Среднее время"
                  dot={{ fill: "#6366f1", r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="p50"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Медиана (50%)"
                />
                <Line
                  type="monotone"
                  dataKey="p85"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="85-й процентиль"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
              <h3 className="font-semibold text-indigo-900 mb-2">📊 Интерпретация данных</h3>
              <p className="text-sm text-indigo-800">
                График показывает три метрики для прогнозирования сроков. <strong>Среднее время (фиолетовая линия)</strong> — математическое среднее cycle time всех задач за неделю. <strong>Медиана 50% (серая пунктирная)</strong> — половина задач завершается быстрее этого времени, половина — медленнее. <strong>85-й процентиль (оранжевая)</strong> — 85% задач завершаются быстрее этого срока. Используйте 85-й процентиль для реалистичных обещаний клиентам. Снижение всех линий — признак улучшения процесса.
              </p>
            </div>
          </div>

          {/* Throughput Trend Line */}
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Фактическая скорость"
                  dot={{ fill: "#10b981", r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Линия тренда"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
              <h3 className="font-semibold text-emerald-900 mb-2">📊 Интерпретация данных</h3>
              <p className="text-sm text-emerald-800">
                <strong>Зелёная линия</strong> — фактическое количество завершённых задач в неделю, <strong>серая пунктирная</strong> — линия тренда, показывающая общее направление изменений. Восходящий тренд (как здесь) означает, что команда постепенно увеличивает производительность. Эту информацию можно использовать для прогнозирования: если тренд продолжится, в следующих неделях можно ожидать throughput около 14-15 задач.
              </p>
            </div>
          </div>

          {/* WIP (Work in Progress) Line Chart */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="text-cyan-600" size={24} />
              Незавершённая работа (WIP)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={analyticsData.wip}>
                <CartesianGrid strokeDasharray="3 3" stroke="##e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="wip"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  name="Текущий WIP"
                  dot={{ fill: "#06b6d4", r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="limit"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  name="WIP-лимит"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-cyan-50 rounded-lg">
              <h3 className="font-semibold text-cyan-900 mb-2">📊 Интерпретация данных</h3>
              <p className="text-sm text-cyan-800">
                <strong>Голубая линия</strong> — текущее количество задач в работе, <strong>красная пунктирная</strong> — установленный WIP-лимит (максимум). В Kanban важно ограничивать WIP для улучшения потока. На графике видно превышение лимита 10 февраля (16 задач при лимите 15) — это сигнал тревоги. Когда WIP приближается к лимиту, команда должна сфокусироваться на завершении текущих задач, а не брать новые. Стабильный WIP ниже лимита — признак здорового процесса.
              </p>
            </div>
          </div>

          {/* Cycle Time Distribution Histogram */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart className="text-violet-600" size={24} />
              Распределение времени производства
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.cycleTimeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" stroke="##64748b" label={{ value: "Диапазон (дни)", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="#64748b" label={{ value: "Количество задач", angle: -90, position: "insideLeft" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" name="Задач" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-violet-50 rounded-lg">
              <h3 className="font-semibold text-violet-900 mb-2">📊 Интерпретация данных</h3>
              <p className="text-sm text-violet-800">
                Гистограмма показывает, сколько задач завершилось за определённое время. Большинство задач (22) завершаются за 4-6 дней — это <strong>модальное значение</strong> вашего процесса. Такое распределение помогает понять: если взять новую задачу, с какой вероятностью она завершится за N дней. Например, очень мало задач завершается быстрее 2 дней (8 штук), но также мало задач "застревает" надолго (только 3 задачи заняли более 10 дней). Это полезно для прогнозирования и SLA.
              </p>
            </div>
          </div>

          {/* Throughput Distribution Histogram */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart className="text-amber-600" size={24} />
              Распределение скорости поставки
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.throughputDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" stroke="#64748b" label={{ value: "Задач в неделю", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="#64748b" label={{ value: "Недель", angle: -90, position: "insideLeft" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="#f59e0b" name="Частота" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-amber-50 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">📊 Интерпретация данных</h3>
              <p className="text-sm text-amber-800">
                Гистограмма показывает, как часто команда достигает определённого throughput. Чаще всего (8 недель) команда завершает 12-14 задач в неделю — это <strong>типичная производительность</strong>. Такое распределение используется для вероятностного прогнозирования методом Монте-Карло: "С какой вероятностью мы завершим 50 задач за 4 недели?" Узкое распределение означает предсказуемость, широкое — высокую вариативность производительности.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}