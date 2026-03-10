import { useState } from "react";
import { BarChart3, TrendingUp, Calendar, Target, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

interface KanbanMetricsProps {
  projectId: number;
}

// Мок-данные для графиков
const monteCarloData = [
  { date: "05.03", probability: 10 },
  { date: "12.03", probability: 25 },
  { date: "19.03", probability: 50 },
  { date: "26.03", probability: 75 },
  { date: "02.04", probability: 90 },
  { date: "09.04", probability: 95 },
  { date: "16.04", probability: 99 },
];

const cycleTimeData = [
  { week: "Нед 1", avgTime: 4.2 },
  { week: "Нед 2", avgTime: 5.1 },
  { week: "Нед 3", avgTime: 3.8 },
  { week: "Нед 4", avgTime: 4.5 },
  { week: "Нед 5", avgTime: 3.2 },
  { week: "Нед 6", avgTime: 4.8 },
];

export default function KanbanMetrics({ projectId }: KanbanMetricsProps) {
  const [forecastTasks, setForecastTasks] = useState(25);
  const [targetDate, setTargetDate] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Аналитика и Прогнозирование</h2>
        <p className="text-sm text-slate-600 mt-1">
          Метрики Kanban и вероятностное прогнозирование методом Монте-Карло
        </p>
      </div>

      {/* WIP Limits Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Target size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">WIP Limit соблюден</p>
              <p className="text-2xl font-bold">85%</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Колонок и дорожек в пределах установленных лимитов
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <AlertTriangle size={24} className="text-orange-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Превышений WIP</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Колонок/дорожек с превышенным лимитом незавершенной работы
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Среднее время цикла</p>
              <p className="text-2xl font-bold">4.3 дн.</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Среднее время от начала до завершения задачи
          </p>
        </div>
      </div>

      {/* Service Classes */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <h3 className="text-lg font-bold mb-4">Классы обслуживания</h3>
        <p className="text-sm text-slate-600 mb-4">
          Распределение задач по классам обслуживания
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-red-700">Ускоренный</h4>
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                SLA: 24ч
              </span>
            </div>
            <p className="text-3xl font-bold text-red-700 mb-1">5</p>
            <p className="text-sm text-red-600">Критические задачи требующие немедленного внимания</p>
            <div className="mt-3 h-2 bg-red-200 rounded-full">
              <div className="h-full bg-red-600 rounded-full" style={{ width: "80%" }} />
            </div>
            <p className="text-xs text-red-600 mt-1">80% от WIP-лимита</p>
          </div>

          <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-orange-700">С фиксированной датой</h4>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">
                SLA: до даты
              </span>
            </div>
            <p className="text-3xl font-bold text-orange-700 mb-1">12</p>
            <p className="text-sm text-orange-600">Задачи с четкими дедлайнами</p>
            <div className="mt-3 h-2 bg-orange-200 rounded-full">
              <div className="h-full bg-orange-600 rounded-full" style={{ width: "60%" }} />
            </div>
            <p className="text-xs text-orange-600 mt-1">60% от WIP-лимита</p>
          </div>

          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-blue-700">Стандартный</h4>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                SLA: 7 дн
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-700 mb-1">28</p>
            <p className="text-sm text-blue-600">Обычные задачи проекта</p>
            <div className="mt-3 h-2 bg-blue-200 rounded-full">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: "45%" }} />
            </div>
            <p className="text-xs text-blue-600 mt-1">45% от WIP-лимита</p>
          </div>

          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-purple-700">Нематериальный</h4>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                Без SLA
              </span>
            </div>
            <p className="text-3xl font-bold text-purple-700 mb-1">8</p>
            <p className="text-sm text-purple-600">Улучшения и оптимизация без жестких сроков</p>
            <div className="mt-3 h-2 bg-purple-200 rounded-full">
              <div className="h-full bg-purple-600 rounded-full" style={{ width: "20%" }} />
            </div>
            <p className="text-xs text-purple-600 mt-1">20% от WIP-лимита</p>
          </div>
        </div>
      </div>

      {/* Monte Carlo Forecast */}
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

        {/* Input Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2">Количество задач для прогноза</label>
            <input
              type="number"
              value={forecastTasks}
              onChange={(e) => setForecastTasks(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Целевая дата (опционально)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Probability Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium mb-1">50% вероятность</p>
            <p className="text-2xl font-bold text-green-700">19 марта 2026</p>
            <p className="text-xs text-green-600 mt-1">Медианный сценарий</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 font-medium mb-1">75% вероятность</p>
            <p className="text-2xl font-bold text-blue-700">26 марта 2026</p>
            <p className="text-xs text-blue-600 mt-1">Умеренно оптимистичный</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-700 font-medium mb-1">90% вероятность</p>
            <p className="text-2xl font-bold text-purple-700">02 апреля 2026</p>
            <p className="text-xs text-purple-600 mt-1">Консервативный сценарий</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monteCarloData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: "Вероятность (%)", angle: -90, position: "insideLeft" }} />
              <Tooltip
                formatter={(value: number) => [`${value}%`, "Вероятность"]}
                contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="probability"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 5 }}
                name="Вероятность завершения"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-700 mb-2">Интерпретация результатов</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• С вероятностью <strong>50%</strong> все {forecastTasks} задач будут завершены к <strong>19 марта</strong></li>
            <li>• С вероятностью <strong>75%</strong> все задачи будут завершены к <strong>26 марта</strong></li>
            <li>• С вероятностью <strong>90%</strong> все задачи будут завершены к <strong>2 апреля</strong></li>
            <li className="mt-2 pt-2 border-t border-blue-300">
              💡 Рекомендуется планировать на основе 75-85% вероятности для реалистичных обязательств
            </li>
          </ul>
        </div>
      </div>

      {/* Cycle Time Trend */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <h3 className="text-lg font-bold mb-4">Динамика времени цикла</h3>
        <p className="text-sm text-slate-600 mb-4">
          Среднее время выполнения задач по неделям
        </p>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cycleTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis label={{ value: "Дни", angle: -90, position: "insideLeft" }} />
              <Tooltip
                formatter={(value: number) => [`${value} дней`, "Среднее время"]}
                contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }}
              />
              <Bar dataKey="avgTime" fill="#8b5cf6" name="Среднее время цикла" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-indigo-900 mb-3">Рекомендации на основе метрик</h3>
        <ul className="space-y-2 text-sm text-indigo-800">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Время цикла стабильное, команда работает с предсказуемой скоростью</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 font-bold">⚠</span>
            <span>Обратите внимание на 3 колонки с превышением WIP-лимита</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">ℹ</span>
            <span>Рассмотрите возможность перераспределения "ускоренных" задач для соблюдения SLA</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Прогноз Монте-Карло показывает реалистичные сроки завершения 25 задач</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
