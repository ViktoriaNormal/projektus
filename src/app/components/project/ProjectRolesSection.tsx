import { useState, useRef, useEffect, useCallback } from "react";
import { Shield, Users, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  createProjectRole,
  updateProjectRole,
  deleteProjectRole,
  type ProjectRole,
  type ProjectRolePermission,
} from "../../api/project-roles";
import type { ProjectReferences } from "../../api/boards";

// ── Debounced textarea (same pattern as template editor) ────

function NoteTextarea({ value, onSave }: { value: string; onSave: (val: string) => void }) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalValue(value); }, [value]);

  const debouncedSave = useCallback(
    (val: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSave(val), 600);
    },
    [onSave]
  );

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        debouncedSave(e.target.value);
      }}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
    />
  );
}

// ── Constants ───────────────────────────────────────────────

function isAdminRole(role: ProjectRole): boolean {
  return !!role.isProjectAdmin;
}

// ── Component ───────────────────────────────────────────────

interface ProjectRolesSectionProps {
  projectId: string;
  projectType: string;
  refs: ProjectReferences;
  roles: ProjectRole[];
  onReload: () => Promise<void>;
}

export default function ProjectRolesSection({
  projectId,
  projectType,
  refs,
  roles,
  onReload,
}: ProjectRolesSectionProps) {
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [showAddRoleForm, setShowAddRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const allAreas = Array.isArray(refs.permissionAreas) ? refs.permissionAreas : [];
  const permissionAreas = allAreas.filter((a) => a.availableFor?.includes(projectType));
  const accessLevels = Array.isArray(refs.accessLevels) ? refs.accessLevels : [];
  const areaMap = Object.fromEntries(allAreas.map((a) => [a.area, a]));

  async function handleAddRole() {
    if (!newRoleName.trim()) return;
    try {
      const defaultPerms: ProjectRolePermission[] = permissionAreas.map((a) => ({
        area: a.area,
        access: "none",
      }));
      const newRole = await createProjectRole(projectId, {
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
        permissions: defaultPerms,
      });
      setNewRoleName("");
      setNewRoleDescription("");
      setShowAddRoleForm(false);
      await onReload();
      setExpandedRoleId(newRole.id);
    } catch (e: any) {
      toast.error(e.message || "Не удалось добавить роль");
    }
  }

  async function handleUpdateRole(roleId: string, patch: Partial<{ name: string; description: string }>) {
    try {
      await updateProjectRole(projectId, roleId, patch);
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось обновить роль");
    }
  }

  async function handleUpdatePermission(roleId: string, area: string, access: ProjectRolePermission["access"]) {
    try {
      await updateProjectRole(projectId, roleId, {
        permissions: [{ area, access }],
      });
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось обновить права");
    }
  }

  async function handleRemoveRole(roleId: string) {
    const role = roles.find((r) => r.id === roleId);
    if (role && isAdminRole(role)) {
      toast.error("Роль «Администратор проекта» нельзя удалить");
      return;
    }
    try {
      await deleteProjectRole(projectId, roleId);
      await onReload();
    } catch (e: any) {
      toast.error(e.message || "Не удалось удалить роль");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-purple-600" />
            <h2 className="text-lg font-bold">Роли участников проекта</h2>
          </div>
          {!showAddRoleForm && (
            <button
              onClick={() => setShowAddRoleForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              Добавить роль
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Роли определяют права доступа участников к функциям проекта. Роль «Администратор проекта» обязательна и не может быть удалена или изменена.
        </p>

        {showAddRoleForm && (
          <div className="p-4 border-2 border-purple-300 rounded-lg bg-purple-50 mb-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Название роли *</label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Например: Тестировщик"
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
                  onClick={() => { setShowAddRoleForm(false); setNewRoleName(""); setNewRoleDescription(""); }}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddRole}
                  disabled={!newRoleName.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {roles.map((role) => {
            const isExpanded = expandedRoleId === role.id;
            const isAdmin = isAdminRole(role);

            return (
              <div key={role.id} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Role header */}
                <div
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                    isExpanded ? "bg-purple-50 border-b border-slate-200" : "bg-slate-50 hover:bg-slate-100"
                  }`}
                  onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                >
                  {isAdmin ? (
                    <Lock size={18} className="text-amber-500 shrink-0" />
                  ) : (
                    <Users size={18} className="text-slate-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{role.name || "Без названия"}</span>
                      {isAdmin && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">обязательная</span>
                      )}
                      {role.isDefault && !isAdmin && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">по умолчанию</span>
                      )}
                    </div>
                    {role.description && <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveRole(role.id); }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Удалить роль"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded: permissions */}
                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {isAdmin ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-800">
                          Роль «Администратор проекта» имеет полный доступ ко всем функциям проекта. Её нельзя редактировать или удалять.
                          В проекте должен быть минимум один участник с этой ролью.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Название роли</label>
                            <NoteTextarea
                              value={role.name}
                              onSave={(val) => handleUpdateRole(role.id, { name: val || "" })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Описание роли</label>
                            <NoteTextarea
                              value={role.description}
                              onSave={(val) => handleUpdateRole(role.id, { description: val || "" })}
                            />
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Права доступа</p>
                          <div className="space-y-1.5">
                            {role.permissions.map((perm) => {
                              const areaDef = areaMap[perm.area];
                              return (
                                <div key={perm.area} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg gap-3">
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium">{areaDef?.name || perm.area}</span>
                                    {areaDef?.description && <p className="text-xs text-slate-500 mt-0.5">{areaDef.description}</p>}
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    {accessLevels.map((level) => (
                                      <button
                                        key={level.key}
                                        onClick={() => handleUpdatePermission(role.id, perm.area, level.key as ProjectRolePermission["access"])}
                                        className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                                          perm.access === level.key
                                            ? level.key === "full"
                                              ? "bg-green-600 text-white border-green-600"
                                              : level.key === "view"
                                                ? "bg-amber-500 text-white border-amber-500"
                                                : "bg-slate-500 text-white border-slate-500"
                                            : "border-slate-200 text-slate-600 hover:bg-slate-100"
                                        }`}
                                        title={level.description || ""}
                                      >
                                        {level.key === "none" ? <EyeOff size={12} className="inline mr-1" /> : <Eye size={12} className="inline mr-1" />}
                                        {level.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {roles.length === 0 && !showAddRoleForm && (
            <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
              <p className="text-slate-600 mb-3">Нет ролей</p>
              <button
                onClick={() => setShowAddRoleForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Добавить первую роль
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
