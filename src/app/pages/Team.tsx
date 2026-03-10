import { useState } from "react";
import { Search, Mail, Briefcase } from "lucide-react";
import { users } from "../data/mockData";
import { UserAvatar } from "../components/UserAvatar";

export default function Team() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Коллеги</h1>
        <p className="text-slate-600 mt-1">
          Поиск коллег по организации
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Поиск по имени, email или роли..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Briefcase className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Всего сотрудников</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-3 rounded-lg">
              <Search className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Найдено</p>
              <p className="text-2xl font-bold">{filteredUsers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white rounded-xl p-6 shadow-md border border-slate-100 hover:shadow-lg hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col items-center text-center">
              <UserAvatar user={user} size="xl" className="mb-4" />
              
              <h3 className="font-bold text-lg mb-1">{user.fullName}</h3>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-semibold rounded-full mb-3">
                <Briefcase size={14} />
                {user.role}
              </div>

              <div className="w-full space-y-2 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-2 justify-center">
                  <Mail size={14} className="text-slate-400" />
                  <a
                    href={`mailto:${user.email}`}
                    className="hover:text-blue-600 hover:underline truncate"
                  >
                    {user.email}
                  </a>
                </div>
                
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-slate-400">@{user.username}</span>
                </div>
              </div>

              <div className="mt-auto w-full">
                <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md text-sm font-medium">
                  Отправить сообщение
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Search size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">Коллеги не найдены</p>
          <p className="text-slate-400 text-sm mt-1">
            Попробуйте изменить критерии поиска
          </p>
        </div>
      )}
    </div>
  );
}
