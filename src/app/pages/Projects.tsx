import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Plus, Search, Loader2, X, Save, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "../components/UserAvatar";
import { getProjects, createProject, type ProjectResponse } from "../api/projects";
import { getUser, searchUsers, type UserProfileResponse } from "../api/users";
import { useAuth } from "../contexts/AuthContext";

const statusLabels: Record<string, string> = {
  active: "Активный",
  paused: "Приостановлен",
  archived: "Архивирован",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
  archived: "bg-slate-100 text-slate-700 border-slate-200",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="text-slate-400 hover:text-blue-600 transition-colors shrink-0 p-1 rounded hover:bg-blue-50"
      title="Скопировать"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  );
}


export default function Projects() {
  const { user: authUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [owners, setOwners] = useState<Record<string, UserProfileResponse>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createType, setCreateType] = useState<"scrum" | "kanban">("scrum");
  const [createOwner, setCreateOwner] = useState<UserProfileResponse | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerResults, setOwnerResults] = useState<UserProfileResponse[]>([]);
  const [showOwnerSearch, setShowOwnerSearch] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProjects();
      setProjects(result);
      // Load owner profiles
      const uniqueOwnerIds = [...new Set(result.map((p) => p.ownerId).filter(Boolean))];
      const profiles: Record<string, UserProfileResponse> = {};
      await Promise.all(
        uniqueOwnerIds.map(async (id) => {
          try {
            profiles[id] = await getUser(id);
          } catch {
            // skip
          }
        })
      );
      setOwners(profiles);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Load current user profile as default owner
  useEffect(() => {
    if (authUser?.id) {
      getUser(authUser.id).then(setCreateOwner).catch(() => {});
    }
  }, [authUser]);

  // Owner search
  useEffect(() => {
    if (!ownerSearch.trim()) {
      setOwnerResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await searchUsers(ownerSearch, 10, 0);
        setOwnerResults(results.filter((u) => u.id !== createOwner?.id));
      } catch {
        setOwnerResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [ownerSearch, createOwner]);

  const filteredProjects = projects.filter((project) => {
    const owner = owners[project.ownerId];
    const ownerName = owner?.fullName?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      project.name.toLowerCase().includes(query) ||
      project.key.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query) ||
      ownerName.includes(query);
    const matchesType = filterType === "all" || project.projectType === filterType;
    const matchesStatus = filterStatus === "all" || project.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Проекты</h1>
          <p className="text-slate-600 mt-1">Управление всеми проектами системы</p>
        </div>
        <button
          onClick={() => {
            setCreateName("");
            setCreateDescription("");
            setCreateType("scrum");
            setOwnerSearch("");
            setOwnerResults([]);
            setShowOwnerSearch(false);
            if (authUser?.id) getUser(authUser.id).then(setCreateOwner).catch(() => {});
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Создать проект
        </button>
      </div>

      {/* Search, Filters & Sort */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Поиск по названию, ключу, описанию, ответственному..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все типы</option>
            <option value="scrum">Scrum</option>
            <option value="kanban">Kanban</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активный</option>
            <option value="paused">Приостановлен</option>
            <option value="archived">Архивирован</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* Projects Grid */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const owner = owners[project.ownerId];

            return (
              <div
                key={project.id}
                className="bg-white rounded-xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-all flex flex-col h-full"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-mono font-bold rounded flex items-center gap-1">
                    {project.key}
                    <CopyButton text={project.key} />
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      project.projectType === "scrum"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {project.projectType === "scrum" ? "Scrum" : "Kanban"}
                  </span>
                  <span
                    className={`ml-auto px-3 py-1 text-xs font-semibold rounded border ${
                      statusColors[project.status] || statusColors.active
                    }`}
                  >
                    {statusLabels[project.status] || project.status}
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <h3 className="text-xl font-bold">{project.name}</h3>
                  <CopyButton text={project.name} />
                </div>

                <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  {owner && (
                    <UserAvatar
                      user={{ fullName: owner.fullName, avatarUrl: owner.avatarUrl }}
                      size="sm"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Ответственный</p>
                    <p className="text-sm font-medium">{owner?.fullName || "—"}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Дата создания: {new Date(project.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                </p>

                <div className="mt-auto pt-4">
                  <Link
                    to={`/projects/${project.id}`}
                    className="block w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center rounded-lg transition-all shadow-sm font-medium"
                  >
                    Перейти к проекту
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Search size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">Проекты не найдены</p>
          <p className="text-slate-400 text-sm mt-1">
            Попробуйте изменить критерии поиска
          </p>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Создать проект</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!createName.trim()) {
                  toast.error("Введите название проекта");
                  return;
                }
                if (!createOwner) {
                  toast.error("Выберите ответственного за проект");
                  return;
                }
                setCreating(true);
                try {
                  await createProject({
                    name: createName.trim(),
                    description: createDescription.trim() || undefined,
                    projectType: createType,
                    ownerId: createOwner.id,
                  });
                  toast.success("Проект создан");
                  setShowCreateModal(false);
                  await loadProjects();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Не удалось создать проект");
                } finally {
                  setCreating(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">
                  Название проекта <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите название..."
                  required
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1">Ключ проекта будет сгенерирован автоматически</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Тип проекта <span className="text-red-500">*</span>
                </label>
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as "scrum" | "kanban")}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="scrum">Scrum</option>
                  <option value="kanban">Kanban</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Тип проекта нельзя будет изменить после создания</p>
              </div>

              {/* Owner */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Ответственный <span className="text-red-500">*</span>
                </label>
                {createOwner && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg mb-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={{ fullName: createOwner.fullName, avatarUrl: createOwner.avatarUrl }} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{createOwner.fullName}</p>
                        <p className="text-xs text-slate-500">{createOwner.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOwnerSearch(!showOwnerSearch)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Изменить
                    </button>
                  </div>
                )}
                {(showOwnerSearch || !createOwner) && (
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Поиск пользователя..."
                        value={ownerSearch}
                        onChange={(e) => setOwnerSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        autoFocus={showOwnerSearch}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {ownerResults.length > 0 ? (
                        ownerResults.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => {
                              setCreateOwner(user);
                              setShowOwnerSearch(false);
                              setOwnerSearch("");
                              setOwnerResults([]);
                            }}
                            className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors"
                          >
                            <UserAvatar user={{ fullName: user.fullName, avatarUrl: user.avatarUrl }} size="sm" />
                            <div>
                              <p className="text-sm font-medium">{user.fullName}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-3">
                          {ownerSearch ? "Пользователь не найден" : "Начните вводить имя"}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Опишите цели и задачи проекта..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 h-11 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md font-medium flex items-center gap-2 disabled:opacity-60 whitespace-nowrap"
                >
                  {creating ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Создать проект
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
