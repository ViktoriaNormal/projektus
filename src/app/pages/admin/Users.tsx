import { useState, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, UserCheck, UserX, Shield, X, Loader2,
  AlertCircle, CheckCircle2, Save, Eye, EyeOff, Info, ShieldCheck, Check,
} from 'lucide-react';
import {
  getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
  getSystemRoles,
  type AdminUser, type SystemRole,
} from '../../api/admin';
import { getPasswordPolicy, type PasswordPolicy } from '../../api/auth';
import { ApiError } from '../../api/client';
import { UserAvatar } from '../../components/UserAvatar';

interface UserForm {
  username: string;
  email: string;
  full_name: string;
  position: string;
  password: string;
  is_active: boolean;
  role_ids: string[];
}

const emptyForm: UserForm = {
  username: '',
  email: '',
  full_name: '',
  position: '',
  password: '',
  is_active: true,
  role_ids: [],
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

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
    loadData();
  }, []);

  async function loadData() {
    const errors: string[] = [];
    try {
      const [usersResult, rolesResult, policyResult] = await Promise.allSettled([
        getAdminUsers(),
        getSystemRoles(),
        getPasswordPolicy(),
      ]);

      if (policyResult.status === 'fulfilled' && policyResult.value) {
        setPolicy(policyResult.value);
      }

      if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
        setUsers(usersResult.value);
      } else {
        setUsers([]);
        const reason = usersResult.status === 'rejected'
          ? (usersResult.reason instanceof ApiError ? usersResult.reason.message : String(usersResult.reason))
          : 'Неверный формат ответа';
        errors.push(`Пользователи: ${reason}`);
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
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const data = await getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setMsg({ type: 'error', text: 'Не удалось загрузить пользователей' });
    }
  }

  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      user.full_name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q);
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);
    const matchesRole =
      filterRole === 'all' ||
      user.roles.some((r) => r.id === filterRole);
    return matchesSearch && matchesStatus && matchesRole;
  });

  const totalCount = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

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
      full_name: user.full_name,
      position: user.position || '',
      password: '',
      is_active: user.is_active,
      role_ids: user.roles.map((r) => r.id),
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
    if (!form.full_name.trim()) {
      setModalError('Введите полное имя');
      return;
    }
    if (!editingUser && !form.password) {
      setModalError('Введите пароль');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await updateAdminUser(editingUser.id, {
          username: form.username.trim(),
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          position: form.position.trim(),
          is_active: form.is_active,
          role_ids: form.role_ids,
        });
        setMsg({ type: 'success', text: `Пользователь "${form.full_name.trim()}" обновлён` });
      } else {
        await createAdminUser({
          username: form.username.trim(),
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          position: form.position.trim(),
          password: form.password,
          is_active: form.is_active,
          role_ids: form.role_ids,
        });
        setMsg({ type: 'success', text: `Пользователь "${form.full_name.trim()}" создан` });
      }
      setModalOpen(false);
      await loadUsers();
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
      setMsg({ type: 'success', text: `Пользователь "${deleteTarget.full_name}" удалён` });
      setDeleteTarget(null);
      await loadUsers();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
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
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Создать пользователя
        </button>
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
          <span>{msg.text}</span>
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

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">Все пользователи</option>
            <option value="active">Активные</option>
            <option value="inactive">Заблокированные</option>
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">Все роли</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Пользователь
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Роль
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
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={{
                          id: user.id,
                          fullName: user.full_name,
                          avatarUrl: user.avatar_url || '',
                          username: user.username,
                          email: user.email,
                          isActive: user.is_active,
                          role: user.roles[0]?.name || '',
                        }}
                        size="md"
                      />
                      <div>
                        <p className="font-semibold">{user.full_name}</p>
                        <p className="text-sm text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role.id}
                          className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full inline-flex items-center gap-1"
                        >
                          <Shield size={14} />
                          {role.name}
                        </span>
                      ))}
                      {user.roles.length === 0 && (
                        <span className="text-sm text-slate-400 italic">Нет роли</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        user.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.is_active ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">Пользователи не найдены</p>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {editingUser ? 'Редактировать пользователя' : 'Создать нового пользователя'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

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
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Фамилия Имя Отчество"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Должность</label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Например: Ведущий разработчик"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Роль</label>
                <div className="border border-slate-200 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={form.role_ids.includes(role.id)}
                        onChange={() => {
                          setForm((prev) => ({
                            ...prev,
                            role_ids: prev.role_ids.includes(role.id)
                              ? prev.role_ids.filter((id) => id !== role.id)
                              : [...prev.role_ids, role.id],
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
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="active" className="text-sm font-medium">
                  Активная учётная запись
                </label>
              </div>

              <div className="flex gap-3 pt-4">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">Удалить пользователя</h2>
            <p className="text-slate-600 mb-6">
              Вы уверены, что хотите удалить пользователя <strong>"{deleteTarget.full_name}"</strong>?
              Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
