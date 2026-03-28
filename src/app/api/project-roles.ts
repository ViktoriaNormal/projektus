import { apiRequest } from './client';

// ── Types ───────────────────────────────────────────────────

export interface ProjectRolePermission {
  area: string;
  access: 'full' | 'view' | 'none';
}

export interface ProjectRole {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isProjectAdmin?: boolean;
  order: number;
  permissions: ProjectRolePermission[];
}

// ── API ─────────────────────────────────────────────────────

export function getProjectRoles(projectId: string) {
  return apiRequest<ProjectRole[]>(`/projects/${projectId}/roles`);
}

export function createProjectRole(projectId: string, data: {
  name: string;
  description?: string;
  permissions: ProjectRolePermission[];
}) {
  return apiRequest<ProjectRole>(`/projects/${projectId}/roles`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProjectRole(projectId: string, roleId: string, data: Partial<{
  name: string;
  description: string;
  permissions: ProjectRolePermission[];
}>) {
  return apiRequest<ProjectRole>(`/projects/${projectId}/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteProjectRole(projectId: string, roleId: string) {
  return apiRequest<null>(`/projects/${projectId}/roles/${roleId}`, {
    method: 'DELETE',
  });
}

export function reorderProjectRoles(projectId: string, orders: { roleId: string; order: number }[]) {
  return apiRequest<null>(`/projects/${projectId}/roles/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orders }),
  });
}
