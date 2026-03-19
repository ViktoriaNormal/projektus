import { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Shield, X, Loader2, AlertCircle, CheckCircle2, Save,
} from 'lucide-react';
import {
  getSystemRoles, createSystemRole, updateSystemRole, deleteSystemRole,
  getPermissionsCatalog,
  type SystemRole, type PermissionDescriptor,
} from '../../api/admin';
import { ApiError } from '../../api/client';

interface RoleForm {
  name: string;
  description: string;
  permissions: string[];
}

const emptyForm: RoleForm = { name: '', description: '', permissions: [] };

export default function AdminRoles() {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [permCatalog, setPermCatalog] = useState<PermissionDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SystemRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [rolesData, permsData] = await Promise.all([
        getSystemRoles(),
        getPermissionsCatalog(),
      ]);
      setRoles(rolesData);
      setPermCatalog(permsData);
    } catch {
      setMsg({ type: 'error', text: 'Не удалось загрузить данные' });
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    try {
      const data = await getSystemRoles();
      setRoles(data);
    } catch {
      setMsg({ type: 'error', text: 'Не удалось загрузить роли' });
    }
  }

  function permDescription(key: string): string {
    return permCatalog.find((p) => p.key === key)?.description || key;
  }

  function openCreate() {
    setEditingRole(null);
    setForm(emptyForm);
    setModalError('');
    setModalOpen(true);
  }

  function openEdit(role: SystemRole) {
    setEditingRole(role);
    setForm({ name: role.name, description: role.description || '', permissions: [...role.permissions] });
    setModalError('');
    setModalOpen(true);
  }

  function togglePermission(key: string) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  }

  async function handleSave() {
    setModalError('');
    if (!form.name.trim()) {
      setModalError('Введите название роли');
      return;
    }

    setSaving(true);
    try {
      if (editingRole) {
        await updateSystemRole(editingRole.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          permissions: form.permissions,
        });
        setMsg({ type: 'success', text: `Роль "${form.name.trim()}" обновлена` });
      } else {
        await createSystemRole({
          name: form.name.trim(),
          description: form.description.trim(),
          permissions: form.permissions,
        });
        setMsg({ type: 'success', text: `Роль "${form.name.trim()}" создана` });
      }
      setModalOpen(false);
      await loadRoles();
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message);
      } else {
        setModalError('Не удалось сохранить роль');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSystemRole(deleteTarget.id);
      setMsg({ type: 'success', text: `Роль "${deleteTarget.name}" удалена` });
      setDeleteTarget(null);
      await loadRoles();
    } catch (err) {
      if (err instanceof ApiError) {
        setMsg({ type: 'error', text: err.message });
      } else {
        setMsg({ type: 'error', text: 'Не удалось удалить роль' });
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
          <h1 className="text-3xl font-bold">Управление системными ролями</h1>
          <p className="text-slate-600 mt-1">
            Системные роли и права доступа
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Создать роль
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

      {/* Roles Grid */}
      {roles.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-md border border-slate-100 text-center">
          <Shield size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">Нет системных ролей</p>
          <p className="text-slate-400 text-sm mt-1">Создайте первую роль для управления доступом</p>
        </div>
      ) : (
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
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(role)}
                    className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(role)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {role.description && (
                <p className="text-slate-600 mb-4">{role.description}</p>
              )}

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Права доступа:</p>
                {role.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md"
                      >
                        {permDescription(perm)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Нет назначенных прав</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {editingRole ? 'Редактировать роль' : 'Создать новую роль'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {modalError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Название роли <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Например: Менеджер"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="Опишите назначение роли..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Права доступа</label>
                <div className="border border-slate-200 rounded-lg p-3 space-y-1">
                  {permCatalog.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(perm.key)}
                        onChange={() => togglePermission(perm.key)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <div>
                        <span className="text-sm font-medium">{perm.description}</span>
                        <span className="text-xs text-slate-400 ml-2">{perm.key}</span>
                      </div>
                    </label>
                  ))}
                </div>
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
                  {saving ? 'Сохранение...' : editingRole ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">Удалить роль</h2>
            <p className="text-slate-600 mb-6">
              Вы уверены, что хотите удалить роль <strong>"{deleteTarget.name}"</strong>?
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
