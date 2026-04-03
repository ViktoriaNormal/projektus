import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface KanbanMetricsProps {
  projectId: string | number;
}

// Мок-данные для графика
const monteCarloData = [
  { date: "05.03", probability: 10 },
  { date: "12.03", probability: 25 },
  { date: "19.03", probability: 50 },
  { date: "26.03", probability: 75 },
  { date: "02.04", probability: 90 },
  { date: "09.04", probability: 95 },
  { date: "16.04", probability: 99 },
];

export default function KanbanMetrics({ projectId }: KanbanMetricsProps) {
  const [forecastTasks, setForecastTasks] = useState(25);
  const [targetDate, setTargetDate] = useState("");

  return (
    <div className="space-y-6">
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
            <BarChart data={monteCarloData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: "Вероятность (%)", angle: -90, position: "insideLeft" }} />
              <Tooltip
                formatter={(value: number) => [`${value}%`, "Вероятность"]}
                contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }}
              />
              <Legend />
              <Bar
                dataKey="probability"
                fill="#3b82f6"
                name="Вероятность завершения"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-700 mb-2">Интерпретация результатов</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• С вероятностью <strong>50%</strong> все {forecastTasks} задач будут завершены к <strong>19 марта</strong></li>
            <li>• С вероятностью <strong>75%</strong> все задачи будут завершены к <strong>26 марта</strong></li>
            <li>• С вероятностью <strong>90%</strong> все задачи будут завершены к <strong>2 апреля</strong></li>
            <li className="mt-2 pt-2 border-t border-blue-300">
              Рекомендуется планировать на основе 75-85% вероятности для реалистичных обязательств
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
