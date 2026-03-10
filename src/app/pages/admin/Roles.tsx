import { useState } from "react";
import { Plus, Edit, Trash2, Shield, Lock, Unlock } from "lucide-react";
import { roles } from "../../data/mockData";

export default function AdminRoles() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const permissions = [
    { id: 1, name: "manage_projects", label: "Управление проектами" },
    { id: 2, name: "manage_tasks", label: "Управление задачами" },
    { id: 3, name: "manage_sprints", label: "Управление спринтами" },
    { id: 4, name: "view_analytics", label: "Просмотр аналитики" },
    { id: 5, name: "manage_boards", label: "Управление досками" },
    { id: 6, name: "manage_users", label: "Управление пользователями" },
    { id: 7, name: "manage_roles", label: "Управление ролями" },
    { id: 8, name: "view_logs", label: "Просмотр журнала" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Управление ролями</h1>
          <p className="text-slate-600 mt-1">
            Настройка ролей и прав доступа
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Создать роль
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg">
                  <Shield className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{role.name}</h3>
                  {role.isSystem && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded mt-1">
                      <Lock size={12} />
                      Системная роль
                    </span>
                  )}
                </div>
              </div>
              {!role.isSystem && (
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors">
                    <Edit size={18} />
                  </button>
                  <button className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            <p className="text-slate-600 mb-4">{role.description}</p>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Количество пользователей</span>
              <span className="text-lg font-bold text-slate-900">{role.userCount}</span>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Разрешения:</p>
              <div className="flex flex-wrap gap-2">
                {permissions.slice(0, 4).map((perm) => (
                  <span
                    key={perm.id}
                    className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                  >
                    {perm.label}
                  </span>
                ))}
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                  +{permissions.length - 4} ещё
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Создать новую роль</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название роли</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Введите название роли..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Опишите назначение роли..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Разрешения</label>
                <div className="border border-slate-200 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                  {permissions.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="system-role"
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="system-role" className="text-sm font-medium flex items-center gap-1">
                  <Lock size={14} />
                  Системная роль (не может быть удалена)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md font-medium"
                >
                  Создать роль
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
