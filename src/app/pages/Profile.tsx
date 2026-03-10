import { useState } from "react";
import { User, Mail, Key, Bell, Save, Upload, Phone, Briefcase } from "lucide-react";
import { currentUser } from "../data/mockData";
import { UserAvatar } from "../components/UserAvatar";

export default function Profile() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Мой профиль</h1>
        <p className="text-slate-600 mt-1">Управление личной информацией</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <User size={20} />
              Личная информация
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Полное имя</label>
                <input
                  type="text"
                  defaultValue={currentUser.fullName}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  defaultValue={currentUser.email}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Имя пользователя</label>
                <input
                  type="text"
                  defaultValue={currentUser.username}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center gap-2"
              >
                <Save size={20} />
                Сохранить изменения
              </button>

              {saved && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-900 text-sm">
                  ✓ Профиль успешно обновлён
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Key size={20} />
              Изменить пароль
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Текущий пароль</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Новый пароль</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Подтвердите новый пароль</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md">
                Изменить пароль
              </button>
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-lg font-bold mb-4">Аватар</h2>
            <div className="flex flex-col items-center">
              <UserAvatar user={currentUser} size="xl" className="mb-4" />
              <div className="space-y-2 w-full">
                <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all text-sm flex items-center justify-center gap-2">
                  <Upload size={16} />
                  Загрузить фото
                </button>
                <button className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm">
                  Удалить фото
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-lg font-bold mb-4">Информация</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-600">Роль:</span>
                <p className="font-semibold">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}