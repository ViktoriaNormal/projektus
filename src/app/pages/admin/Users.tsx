import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Edit, Trash2, UserCheck, UserX, Shield, X, Loader2,
  AlertCircle, CheckCircle2, Save, Eye, EyeOff, Info, ShieldCheck, Check,
  Briefcase, FolderKanban,
} from 'lucide-react';
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Select, SelectOption } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import {
  getAdminUsersPage, getAdminUsersStats, createAdminUser, updateAdminUser, deleteAdminUser,
  getSystemRoles,
  type AdminUser, type SystemRole, type UpdateUserPayload,
} from '../../api/admin';
import { useInfinitePage } from '../../hooks/useInfinitePage';
import { getUserProjectRoles, type ProjectRoleResponse } from '../../api/users';
import { getPasswordPolicy, type PasswordPolicy } from '../../api/auth';
import { ApiError } from '../../api/client';
import { UserAvatar } from '../../components/UserAvatar';
import { useAuth } from '../../contexts/AuthContext';

interface UserForm {
  username: string;
  email: string;
  fullName: string;
  position: string;
  password: string;
  isActive: boolean;
  roleIds: string[];
}

const emptyForm: UserForm = {
  username: '',
  email: '',
  fullName: '',
  position: '',
  password: '',
  isActive: true,
  roleIds: [],
};

const PAGE_SIZE = 40;

interface UserRolesCellProps {
  user: AdminUser;
  /** `null` — ещё грузим; `undefined` — не начинали; массив — готовые данные. */
  projectRoles: ProjectRoleResponse[] | null | undefined;
  compact?: boolean;
}

function UserRolesCell({ user, projectRoles, compact = false }: UserRolesCellProps) {
  const badgeCls = compact
    ? 'px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1'
    : 'px-3 py-1 text-sm font-semibold rounded-full inline-flex items-center gap-1';
  const iconSize = compact ? 12 : 14;
  const projectList = Array.isArray(projectRoles) ? projectRoles.filter((p) => p.roles.length > 0) : [];
  const hasAny = user.roles.length > 0 || projectList.length > 0;

  return (
    <div className="space-y-2">
      {/* Системные роли */}
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Системные</p>
        {user.roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {user.roles.map((role) => (
              <span key={role.id} className={`${badgeCls} bg-purple-100 text-purple-700`}>
                <Shield size={iconSize} />
                {role.name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Нет системных ролей</span>
        )}
      </div>

      {/* Проектные роли */}
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Проектные</p>
        {projectRoles === null || projectRoles === undefined ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Loader2 size={iconSize} className="animate-spin" />
            Загрузка...
          </span>
        ) : projectList.length === 0 ? (
          <span className="text-xs text-slate-400 italic">Нет проектных ролей</span>
        ) : (
          <div className="space-y-1.5">
            {projectList.map((project) => (
              <div key={project.projectId} className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                  <FolderKanban size={iconSize} className="text-slate-400" />
                  {project.projectName}:
                </span>
                {project.roles.map((role) => (
                  <span key={role.id} className={`${badgeCls} bg-indigo-100 text-indigo-700`}>
                    {role.name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {!hasAny && projectRoles !== null && projectRoles !== undefined && (
        <span className="text-xs text-slate-400 italic">Ролей нет</span>
      )}
    </div>
  );
}

export default function AdminUsers() {
  const { hasFullPermission } = useAuth();
  const canEdit = hasFullPermission('system.users.manage');
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters (серверные)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Глобальные счётчики (не зависят от q/status/role).
  const [stats, setStats] = useState({ total: 0, activeCount: 0, inactiveCount: 0 });

  // Кэш проектных ролей по userId. Дёргаем /users/{id}/project-roles,
  // когда пользователь появляется в текущей странице. `null` — грузим.
  const [projectRoles, setProjectRoles] = useState<Record<string, ProjectRoleResponse[] | null>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Password
  const [showPassword, setShowPassword] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAuxData();
  }, []);

  // Глобальная статистика: при первой загрузке и после create/update/delete.
  useEffect(() => {
    let cancelled = false;
    getAdminUsersStats()
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [reloadToken]);

  const fetcher = useMemo(
    () => async (limit: number, offset: number) => {
      const isActive =
        filterStatus === 'active' ? true :
        filterStatus === 'inactive' ? false : undefined;
      const page = await getAdminUsersPage(limit, offset, {
        q: debouncedQuery || undefined,
        isActive,
        roleId: filterRole === 'all' ? undefined : filterRole,
      });
      return { items: page.users, total: page.total };
    },
    [debouncedQuery, filterStatus, filterRole],
  );

  const {
    items: users,
    total: foundCount,
    loading: usersLoading,
    loadingMore,
    hasMore,
    sentinelRef,
  } = useInfinitePage<AdminUser>(fetcher, PAGE_SIZE, [debouncedQuery, filterStatus, filterRole, reloadToken]);

  const filtersActive =
    debouncedQuery !== '' || filterStatus !== 'all' || filterRole !== 'all';

  // Подтягиваем проектные роли для каждого пользователя, которого впервые увидели на странице.
  useEffect(() => {
    const missing = users.filter((u) => !(u.id in projectRoles));
    if (missing.length === 0) return;
    setProjectRoles((prev) => {
      const next = { ...prev };
      for (const u of missing) next[u.id] = null;
      return next;
    });
    missing.forEach((u) => {
      getUserProjectRoles(u.id)
        .then((list) => {
          setProjectRoles((prev) => ({ ...prev, [u.id]: Array.isArray(list) ? list : [] }));
        })
        .catch(() => {
          setProjectRoles((prev) => ({ ...prev, [u.id]: [] }));
        });
    });
  }, [users, projectRoles]);

  // Сбрасываем кэш проектных ролей после CUD-операций — они могли поменяться.
  useEffect(() => {
    setProjectRoles({});
  }, [reloadToken]);

  async function loadAuxData() {
    const errors: string[] = [];
    try {
      const [rolesResult, policyResult] = await Promise.allSettled([
        getSystemRoles(),
        getPasswordPolicy(),
      ]);

      if (policyResult.status === 'fulfilled' && policyResult.value) {
        setPolicy(policyResult.value);
      }

      if (rolesResult.status === 'fulfilled' && Array.isArray(rolesResult.value)) {
        setRoles(rolesResult.value);
      } else {
        setRoles([]);
        const reason = rolesResult.status === 'rejected'
          ? (rolesResult.reason instanceof ApiError ? rolesResult.reason.message : String(rolesResult.reason))
          : 'Неверный формат ответа';
        errors.push(`Роли: ${reason}`);
      }

      if (errors.length > 0) {
        setMsg({ type: 'error', text: `Не удалось загрузить: ${errors.join('; ')}` });
      }
    } catch {
      setMsg({ type: 'error', text: 'Не удалось загрузить данные' });
    }
  }

  function reloadUsers() {
    setReloadToken((n) => n + 1);
  }

  // Фильтрация теперь серверная — отображаем список как есть.
  const filteredUsers = users;

  const totalCount = stats.total;
  const activeCount = stats.activeCount;
  const inactiveCount = stats.inactiveCount;

  const passwordChecks = policy
    ? [
        { label: `Минимум ${policy.minLength} символов`, passed: form.password.length >= policy.minLength },
        ...(policy.requireDigits ? [{ label: 'Содержит цифру', passed: /\d/.test(form.password) }] : []),
        ...(policy.requireLowercase ? [{ label: 'Содержит строчную букву', passed: /[a-z]/.test(form.password) }] : []),
        ...(policy.requireUppercase ? [{ label: 'Содержит заглавную букву', passed: /[A-Z]/.test(form.password) }] : []),
        ...(policy.requireSpecial ? [{ label: 'Содержит спецсимвол (!@#$%^&*...)', passed: /[^a-zA-Z0-9]/.test(form.password) }] : []),
      ]
    : [];

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setShowPassword(false);
    setModalError('');
    setModalOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setForm({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      position: user.position || '',
      password: '',
      isActive: user.isActive,
      roleIds: user.roles.map((r) => r.id),
    });
    setModalError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setModalError('');

    if (!form.username.trim()) {
      setModalError('Введите имя пользователя');
      return;
    }
    if (!form.email.trim()) {
      setModalError('Введите email');
      return;
    }
    if (!form.fullName.trim()) {
      setModalError('Введите полное имя');
      return;
    }
    if (!form.position.trim()) {
      setModalError('Должность обязательна');
      return;
    }
    if (form.roleIds.length === 0) {
      setModalError('Нужно выбрать хотя бы одну системную роль');
      return;
    }
    if (!editingUser && !form.password) {
      setModalError('Введите пароль');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        // Частичное обновление: отправляем только изменившиеся поля
        const payload: UpdateUserPayload = {};
        if (form.username.trim() !== editingUser.username) payload.username = form.username.trim();
        if (form.email.trim() !== editingUser.email) payload.email = form.email.trim();
        if (form.fullName.trim() !== editingUser.fullName) payload.fullName = form.fullName.trim();
        if (form.position.trim() !== (editingUser.position || '')) payload.position = form.position.trim();
        if (form.isActive !== editingUser.isActive) payload.isActive = form.isActive;
        const oldRoleIds = editingUser.roles.map((r) => r.id).slice().sort();
        const newRoleIds = form.roleIds.slice().sort();
        const rolesChanged =
          oldRoleIds.length !== newRoleIds.length ||
          oldRoleIds.some((id, i) => id !== newRoleIds[i]);
        if (rolesChanged) payload.roleIds = form.roleIds;

        await updateAdminUser(editingUser.id, payload);
        setMsg({ type: 'success', text: `Пользователь "${form.fullName.trim()}" обновлён` });
      } else {
        await createAdminUser({
          username: form.username.trim(),
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          position: form.position.trim(),
          password: form.password,
          isActive: form.isActive,
          roleIds: form.roleIds,
        });
        setMsg({ type: 'success', text: `Пользователь "${form.fullName.trim()}" создан` });
      }
      setModalOpen(false);
      reloadUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message);
      } else {
        setModalError('Не удалось сохранить пользователя');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminUser(deleteTarget.id);
      setMsg({ type: 'success', text: `Пользователь "${deleteTarget.fullName}" удалён` });
      setDeleteTarget(null);
      reloadUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        setMsg({ type: 'error', text: err.message });
      } else {
        setMsg({ type: 'error', text: 'Не удалось удалить пользователя' });
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Управление пользователями</h1>
          <p className="text-slate-600 mt-1">
            Создание и управление учётными записями
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Plus size={20} />
            Создать пользователя
          </button>
        )}
      </div>

      {msg && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl text-sm ${
            msg.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{msg.text}</span>
          <button
            type="button"
            onClick={() => setMsg(null)}
            aria-label="Закрыть"
            className={`shrink-0 -m-1 p-1 rounded-md transition-colors ${
              msg.type === 'success'
                ? 'hover:bg-green-100 text-green-700'
                : 'hover:bg-red-100 text-red-700'
            }`}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Поиск по имени, email или username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus} ariaLabel="Фильтр по статусу">
            <SelectOption value="all">Все пользователи</SelectOption>
            <SelectOption value="active">Активные</SelectOption>
            <SelectOption value="inactive">Заблокированные</SelectOption>
          </Select>

          <Select value={filterRole} onValueChange={setFilterRole} ariaLabel="Фильтр по роли">
            <SelectOption value="all">Все роли</SelectOption>
            {roles.map((role) => (
              <SelectOption key={role.id} value={role.id}>{role.name}</SelectOption>
            ))}
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-1 gap-6 ${filtersActive ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'}`}>
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <UserCheck className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Всего пользователей</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <UserCheck className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Активные</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <UserX className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Заблокированные</p>
              <p className="text-2xl font-bold">{inactiveCount}</p>
            </div>
          </div>
        </div>

        {filtersActive && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 shadow-md border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-3 rounded-lg">
                <Search className="text-white" size={24} />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Найдено</p>
                <p className="text-2xl font-bold">{foundCount}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {usersLoading && <PageSpinner tone="text-purple-600" />}

      {/* Users Table — desktop */}
      {!usersLoading && (
      <div className="hidden md:block bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Пользователь (ФИО, логин)
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Должность
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Роли
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Статус
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50 transition-colors align-top"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={{
                          id: user.id,
                          fullName: user.fullName,
                          avatarUrl: user.avatarUrl || '',
                          username: user.username,
                          email: user.email,
                          isActive: user.isActive,
                          role: user.roles[0]?.name || '',
                        }}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold">{user.fullName}</p>
                        <p className="text-sm text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {user.position ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase size={14} className="text-slate-400 shrink-0" />
                        {user.position}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <UserRolesCell user={user} projectRoles={projectRoles[user.id]} />
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.isActive ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {canEdit && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Users Cards — mobile */}
      {!usersLoading && (
      <ul className="md:hidden space-y-3">
        {filteredUsers.map((user) => (
          <li
            key={user.id}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <UserAvatar
                user={{
                  id: user.id,
                  fullName: user.fullName,
                  avatarUrl: user.avatarUrl || '',
                  username: user.username,
                  email: user.email,
                  isActive: user.isActive,
                  role: user.roles[0]?.name || '',
                }}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user.fullName}</p>
                <p className="text-sm text-slate-500 truncate">@{user.username}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</p>
                {user.position && (
                  <p className="text-xs text-slate-700 mt-1 flex items-center gap-1 truncate">
                    <Briefcase size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{user.position}</span>
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(user)}
                    className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                    title="Редактировать"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(user)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                    title="Удалить"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <span
                className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${
                  user.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {user.isActive ? 'Активен' : 'Заблокирован'}
              </span>
              <UserRolesCell user={user} projectRoles={projectRoles[user.id]} compact />
            </div>
          </li>
        ))}
      </ul>
      )}

      {!usersLoading && filteredUsers.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={<Search size={48} />}
            title="Пользователи не найдены"
            description="Попробуйте изменить критерии поиска"
          />
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-6">
          {loadingMore && <Loader2 size={24} className="animate-spin text-purple-600" />}
        </div>
      )}

      {/* Create/Edit User Modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} size="2xl">
        <ModalHeader>
          <ModalTitle>{editingUser ? 'Редактировать пользователя' : 'Создать нового пользователя'}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <form autoComplete="off" className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input type="text" name="prevent_autofill" className="hidden" autoComplete="off" />
            <input type="password" name="prevent_autofill_pass" className="hidden" autoComplete="off" />
              {modalError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Имя пользователя <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="username"
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="user@company.ru"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  ФИО <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Фамилия Имя Отчество"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Должность <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Например: Ведущий разработчик"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Системная роль <span className="text-red-500">*</span>
                </label>
                <div className="border border-slate-200 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={form.roleIds.includes(role.id)}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            roleIds: prev.roleIds.includes(role.id)
                              ? prev.roleIds.filter((id) => id !== role.id)
                              : [...prev.roleIds, role.id],
                          }));
                        }}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium">{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Первоначальный пароль <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full px-4 py-2 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Введите пароль"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {policy && form.password.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-start gap-2 text-sm text-blue-800">
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium mb-1">Требования к паролю:</p>
                          <ul className="space-y-0.5 text-blue-700">
                            <li>- Минимум {policy.minLength} символов</li>
                            {policy.requireDigits && <li>- Минимум 1 цифра</li>}
                            {policy.requireLowercase && <li>- Минимум 1 строчная буква (a-z)</li>}
                            {policy.requireUppercase && <li>- Минимум 1 заглавная буква (A-Z)</li>}
                            {policy.requireSpecial && <li>- Минимум 1 спецсимвол (!@#$%^&*...)</li>}
                          </ul>
                          {policy.notes && <p className="mt-2 text-xs text-blue-600">{policy.notes}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {policy && form.password.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <ShieldCheck size={16} />
                        Требования к паролю
                      </div>
                      <ul className="space-y-1.5">
                        {passwordChecks.map((check, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            {check.passed ? (
                              <Check size={14} className="text-green-600 shrink-0" />
                            ) : (
                              <X size={14} className="text-red-400 shrink-0" />
                            )}
                            <span className={check.passed ? 'text-green-700' : 'text-slate-600'}>
                              {check.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <label htmlFor="active" className="text-sm font-medium">
                Активная учётная запись
              </label>
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? 'Сохранение...' : editingUser ? 'Сохранить' : 'Создать пользователя'}
          </button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}
        title="Удалить пользователя"
        description={deleteTarget ? `Вы уверены, что хотите удалить пользователя «${deleteTarget.fullName}»? Это действие нельзя отменить.` : ""}
        variant="danger"
        confirmLabel="Удалить"
        onConfirm={handleDelete}
      />
    </div>
  );
}
