import { useState, useEffect, useRef } from 'react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import {
  Plus, Trash2, Shield, Loader2, AlertCircle, CheckCircle2,
  Users, ChevronUp, ChevronDown, Eye, EyeOff,
} from 'lucide-react';
import {
  getSystemRoles, createSystemRole, updateSystemRole, deleteSystemRole,
  getPermissionsCatalog,
  type SystemRole, type PermissionDescriptor, type RolePermission,
} from '../../api/admin';
import { ApiError } from '../../api/client';

// ── Access Levels ────────────────────────────────────────────
const ACCESS_LEVELS: { key: RolePermission["access"]; name: string }[] = [
  { key: "full", name: "Полный" },
  { key: "view", name: "Просмотр" },
  { key: "none", name: "Нет доступа" },
];

// ── DebouncedInput (local) ──────────────────────────────────
function DebouncedInput({ value, onSave, className, placeholder, required, requiredMessage, disabled, title }: {
  value: string; onSave: (val: string) => void; className?: string; placeholder?: string; required?: boolean; requiredMessage?: string; disabled?: boolean; title?: string;
}) {
  const [local, setLocal] = useState(value);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const localRef = useRef(local);
  const onSaveRef = useRef(onSave);
  localRef.current = local;
  onSaveRef.current = onSave;

  useEffect(() => { if (!dirtyRef.current) setLocal(value); }, [value]);

  function trySave(v: string) {
    if (required && !v.trim()) {
      setError(requiredMessage || "Поле не может быть пустым");
      return;
    }
    setError("");
    onSave(v);
  }

  function handleChange(v: string) {
    setLocal(v);
    if (required && v.trim()) setError("");
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { dirtyRef.current = false; trySave(v); }, 1500);
  }

  useEffect(() => () => {
    if (timerRef.current) { clearTimeout(timerRef.current); dirtyRef.current = false; if (!required || localRef.current.trim()) onSaveRef.current(localRef.current); }
  }, []);

  return (
    <div>
      <input type="text" value={local} onChange={e => handleChange(e.target.value)} disabled={disabled} title={title} className={`${className} ${error ? "border-red-400 ring-2 ring-red-200" : ""} ${disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`} placeholder={placeholder} />
      {error && (
        <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function AdminRoles() {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [permCatalog, setPermCatalog] = useState<PermissionDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SystemRole | null>(null);
  const [deleting, setDeleting] = useState(false);
  useBodyScrollLock(deleteTarget !== null);

  const systemPerms = permCatalog.filter((p) => p.scope === 'system');

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

  async function handleAddRole() {
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    try {
      const defaultPerms: RolePermission[] = systemPerms.map(p => ({ code: p.code, access: "none" as const }));
      const newRole = await createSystemRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || undefined,
        permissions: defaultPerms,
      });
      setNewRoleName("");
      setNewRoleDescription("");
      setShowAddForm(false);
      setMsg({ type: 'success', text: `Роль "${newRole.name}" создана` });
      await loadRoles();
      setExpandedRoleId(newRole.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setMsg({ type: 'error', text: err.message });
      } else {
        setMsg({ type: 'error', text: 'Не удалось создать роль' });
      }
    } finally {
      setAddingRole(false);
    }
  }

  async function handleUpdateRole(roleId: string, patch: Partial<{ name: string; description: string }>) {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    try {
      await updateSystemRole(roleId, {
        name: patch.name ?? role.name,
        description: patch.description ?? role.description,
        permissions: role.permissions,
      });
      await loadRoles();
    } catch (err) {
      if (err instanceof ApiError) {
        setMsg({ type: 'error', text: err.message });
      } else {
        setMsg({ type: 'error', text: 'Не удалось обновить роль' });
      }
    }
  }

  async function handleUpdatePermission(roleId: string, code: string, access: RolePermission["access"]) {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    const updatedPermissions = role.permissions.some(p => p.code === code)
      ? role.permissions.map(p => p.code === code ? { ...p, access } : p)
      : [...role.permissions, { code, access }];
    try {
      await updateSystemRole(roleId, {
        name: role.name,
        description: role.description,
        permissions: updatedPermissions,
      });
      await loadRoles();
    } catch (err) {
      if (err instanceof ApiError) {
        setMsg({ type: 'error', text: err.message });
      } else {
        setMsg({ type: 'error', text: 'Не удалось обновить права' });
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSystemRole(deleteTarget.id);
      setMsg({ type: 'success', text: `Роль "${deleteTarget.name}" удалена` });
      setDeleteTarget(null);
      if (expandedRoleId === deleteTarget.id) setExpandedRoleId(null);
      await loadRoles();
    } catch (err) {
      if (err instanceof ApiError) {
        const text = err.code === 'ROLE_HAS_MEMBERS'
          ? `Невозможно удалить роль "${deleteTarget.name}" — к ней привязаны пользователи. Сначала переназначьте их на другую роль.`
          : err.message;
        setMsg({ type: 'error', text });
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
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Plus size={20} />
            Создать роль
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
          <span>{msg.text}</span>
        </div>
      )}

      {/* Add Role Form */}
      {showAddForm && (
        <div className="p-4 border-2 border-purple-300 rounded-xl bg-purple-50">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Название роли <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Например: Менеджер"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <input
                  type="text"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Краткое описание роли..."
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">Права доступа можно настроить после создания роли.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddForm(false); setNewRoleName(""); setNewRoleDescription(""); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleAddRole}
                disabled={!newRoleName.trim() || addingRole}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingRole ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {addingRole ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roles List */}
      {roles.length === 0 && !showAddForm ? (
        <div className="bg-white rounded-xl p-12 shadow-md border border-slate-100 text-center">
          <Shield size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">Нет системных ролей</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Создайте первую роль для управления доступом</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Добавить первую роль
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const isExpanded = expandedRoleId === role.id;
            return (
              <div key={role.id} className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
                {/* Role header */}
                <div
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${isExpanded ? "bg-purple-50 border-b border-slate-200" : "hover:bg-slate-50"}`}
                  onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                >
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2.5 rounded-lg shrink-0">
                    <Users className="text-white" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{role.name}</span>
                    </div>
                    {role.description && <p className="text-sm text-slate-500 mt-0.5">{role.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!role.isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(role); }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить роль"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded: editable fields + permissions */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Название роли <span className="text-red-500">*</span></label>
                        <DebouncedInput
                          value={role.name}
                          onSave={(val) => handleUpdateRole(role.id, { name: val })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Название роли..."
                          required
                          requiredMessage="Название роли не может быть пустым"
                          disabled={role.isAdmin}
                          title={role.isAdmin ? "Название администратора нельзя изменить" : undefined}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Описание роли</label>
                        <DebouncedInput
                          value={role.description || ""}
                          onSave={(val) => handleUpdateRole(role.id, { description: val })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Краткое описание роли..."
                          disabled={role.isAdmin}
                          title={role.isAdmin ? "Описание администратора нельзя изменить" : undefined}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Права доступа</p>
                      {role.isAdmin && (
                        <p className="text-sm text-slate-500 italic mb-2">
                          Администратор системы имеет полный доступ. Изменение прав недоступно.
                        </p>
                      )}
                      <div className="space-y-1.5">
                        {systemPerms.map((permDef) => {
                          const perm = role.permissions.find(p => p.code === permDef.code);
                          const currentAccess = perm?.access || (role.isAdmin ? "full" : "none");
                          return (
                            <div key={permDef.code} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg gap-3">
                              <div className="min-w-0">
                                <span className="text-sm font-medium">{permDef.name}</span>
                                {permDef.description && <p className="text-xs text-slate-500 mt-0.5">{permDef.description}</p>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {ACCESS_LEVELS.map((level) => (
                                  <button
                                    key={level.key}
                                    onClick={() => !role.isAdmin && handleUpdatePermission(role.id, permDef.code, level.key)}
                                    disabled={role.isAdmin}
                                    className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                                      currentAccess === level.key
                                        ? level.key === "full"
                                          ? "bg-green-600 text-white border-green-600"
                                          : level.key === "view"
                                            ? "bg-amber-500 text-white border-amber-500"
                                            : "bg-slate-500 text-white border-slate-500"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                                    } ${role.isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                                    title={role.isAdmin ? "Права администратора нельзя изменить" : level.name}
                                  >
                                    {level.key === "none" ? <EyeOff size={12} className="inline mr-1" /> : <Eye size={12} className="inline mr-1" />}
                                    {level.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {systemPerms.length === 0 && (
                          <p className="text-sm text-slate-400 italic p-2">Каталог прав пуст</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
