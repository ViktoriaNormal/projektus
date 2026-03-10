import { Bell, Mail, Save, Clock } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [deadlineTime, setDeadlineTime] = useState({ value: 1, unit: "days" });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const notificationSettings = [
    {
      category: "События, связанные с задачами",
      items: [
        {
          id: "task_assigned",
          label: "Назначение пользователя исполнителем задачи",
          description: "Уведомление при назначении вас исполнителем задачи",
        },
        {
          id: "comment_mention",
          label: "Упоминание пользователя в комментарии",
          description: "Уведомление при упоминании вас в комментарии к задаче",
        },
        {
          id: "task_status_change_author",
          label: "Изменение статуса задачи (автор)",
          description: "Уведомление при изменении статуса задачи, где вы являетесь автором",
        },
        {
          id: "task_status_change_assignee",
          label: "Изменение статуса задачи (исполнитель)",
          description: "Уведомление при изменении статуса задачи, где вы являетесь исполнителем",
        },
        {
          id: "task_status_change_watcher",
          label: "Изменение статуса задачи (наблюдатель)",
          description: "Уведомление при изменении статуса задачи, где вы являетесь наблюдателем",
        },
        {
          id: "task_deadline_approaching",
          label: "Приближение крайнего срока выполнения задачи",
          description: "Уведомление за указанное время до наступления дедлайна",
          hasTimeConfig: true,
        },
        {
          id: "task_deadline_reached",
          label: "Наступление крайнего срока выполнения задачи",
          description: "Уведомление в момент наступления крайнего срока",
        },
      ],
    },
    {
      category: "События, связанные со встречами",
      items: [
        {
          id: "meeting_invite",
          label: "Получение приглашения на новую встречу",
          description: "Уведомление при получении приглашения на встречу",
        },
        {
          id: "meeting_change",
          label: "Изменение параметров встречи",
          description: "Уведомление при изменении параметров встречи, в которой вы участвуете",
        },
        {
          id: "meeting_cancel",
          label: "Отмена встречи",
          description: "Уведомление при отмене встречи, в которой вы являетесь участником",
        },
        {
          id: "meeting_reminder",
          label: "Напоминание о предстоящем событии",
          description: "Напоминание перед началом встречи",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Настройки уведомлений</h1>
        <p className="text-slate-600 mt-1">
          Персональные настройки уведомлений для различных событий в системе
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Bell size={20} />
          Настройка уведомлений
        </h2>
        <p className="text-slate-600 mb-6">
          Выберите, как вы хотите получать уведомления о различных событиях в
          системе. Для каждого события можно настроить отдельные каналы
          доставки.
        </p>

        <div className="space-y-6">
          {notificationSettings.map((category, catIndex) => (
            <div key={catIndex}>
              <h3 className="font-semibold text-lg mb-3 text-slate-800">
                {category.category}
              </h3>
              <div className="space-y-3">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="mb-3">
                      <div className="font-medium mb-1">{item.label}</div>
                      <p className="text-xs text-slate-500">
                        {item.description}
                      </p>
                    </div>

                    {item.hasTimeConfig && (
                      <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                        <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                          <Clock size={14} />
                          Предупреждать за:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="30"
                            defaultValue={deadlineTime.value}
                            className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <select
                            defaultValue={deadlineTime.unit}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="hours">часов</option>
                            <option value="days">дней</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <Bell size={16} className="text-slate-400" />
                        <span className="text-sm">Внутри системы</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={
                            item.id.includes("assigned") ||
                            item.id.includes("mention") ||
                            item.id.includes("invite") ||
                            item.id.includes("deadline_reached")
                          }
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <Mail size={16} className="text-slate-400" />
                        <span className="text-sm">По email</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center gap-2"
          >
            <Save size={20} />
            Сохранить настройки
          </button>
        </div>

        {saved && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-900 text-sm">
            ✓ Настройки успешно сохранены
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold mb-3">Справка по уведомлениям</h3>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex gap-2">
            <span className="flex-shrink-0">•</span>
            <span>Внутрисистемные уведомления отображаются в колокольчике в верхней панели</span>
          </div>
          <div className="flex gap-2">
            <span className="flex-shrink-0">•</span>
            <span>Email-уведомления отправляются на ваш адрес: {" "}
              <strong>{" admin@company.ru"}</strong>
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-shrink-0">•</span>
            <span>Вы можете настроить каналы уведомлений индивидуально для каждого типа события</span>
          </div>
        </div>
      </div>
    </div>
  );
}
