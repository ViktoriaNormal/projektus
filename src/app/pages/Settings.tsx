import { Bell, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { PageSpinner } from "../components/ui/Spinner";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettingResponse,
} from "../api/notifications";

const NOTIFICATION_TYPES = [
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
    ],
  },
];

export default function Settings() {
  const [settings, setSettings] = useState<Map<string, NotificationSettingResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    getNotificationSettings()
      .then(data => {
        const map = new Map<string, NotificationSettingResponse>();
        data.forEach(s => map.set(s.eventType, s));
        setSettings(map);
      })
      .catch(() => setSettings(new Map()))
      .finally(() => setLoading(false));
  }, []);

  const isEnabled = (eventType: string): boolean => {
    const s = settings.get(eventType);
    return s ? s.enabled : true; // default enabled
  };

  const toggleEnabled = (eventType: string) => {
    setSettings(prev => {
      const next = new Map(prev);
      const current = next.get(eventType);
      if (current) {
        next.set(eventType, { ...current, enabled: !current.enabled });
      } else {
        next.set(eventType, { eventType, enabled: false });
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allTypes = NOTIFICATION_TYPES.flatMap(c => c.items.map(i => i.id));
      const payload: NotificationSettingResponse[] = allTypes.map(eventType => {
        const s = settings.get(eventType);
        return {
          eventType,
          enabled: s?.enabled ?? true,
        };
      });
      await updateNotificationSettings(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* silent */ }
    setSaving(false);
  };

  if (loading) {
    return <PageSpinner />;
  }

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
          Выберите, о каких событиях вы хотите получать уведомления в системе.
        </p>

        <div className="space-y-6">
          {NOTIFICATION_TYPES.map((category, catIndex) => (
            <div key={catIndex}>
              <h3 className="font-semibold text-lg mb-3 text-slate-800">
                {category.category}
              </h3>
              <div className="space-y-3">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border border-slate-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mb-2">
                        <div className="font-medium mb-1">{item.label}</div>
                        <p className="text-xs text-slate-500">
                          {item.description}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer shrink-0 ml-4">
                        <input
                          type="checkbox"
                          checked={isEnabled(item.id)}
                          onChange={() => toggleEnabled(item.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-600">Включено</span>
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
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            Сохранить настройки
          </button>
        </div>

        {saved && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-900 text-sm">
            Настройки успешно сохранены
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold mb-3">Справка по уведомлениям</h3>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex gap-2">
            <span className="flex-shrink-0">•</span>
            <span>Уведомления отображаются в колокольчике в верхней панели</span>
          </div>
          <div className="flex gap-2">
            <span className="flex-shrink-0">•</span>
            <span>Приглашения на встречи можно принять или отклонить прямо из уведомления</span>
          </div>
          <div className="flex gap-2">
            <span className="flex-shrink-0">•</span>
            <span>Нажмите на уведомление о задаче, чтобы перейти к ней</span>
          </div>
        </div>
      </div>
    </div>
  );
}
