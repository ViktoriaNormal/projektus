import { apiRequest } from './client';

// ── Types ───────────────────────────────────────────────────

export interface ProjectParam {
  id: string;
  name: string;
  description: string | null;
  fieldType: string;
  isSystem: boolean;
  isRequired: boolean;
  order: number;
  options: string[] | null;
  value: string | null;
}

// ── API ─────────────────────────────────────────────────────

export function getProjectParams(projectId: string) {
  return apiRequest<ProjectParam[]>(`/projects/${projectId}/params`);
}

export function createProjectParam(projectId: string, data: {
  name: string;
  fieldType: string;
  isRequired?: boolean;
  order?: number;
  options?: string[] | null;
  value?: string | null;
}) {
  return apiRequest<ProjectParam>(`/projects/${projectId}/params`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProjectParam(projectId: string, paramId: string, data: Partial<{
  name: string;
  isRequired: boolean;
  options: string[] | null;
  value: string | null;
}>) {
  return apiRequest<ProjectParam>(`/projects/${projectId}/params/${paramId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteProjectParam(projectId: string, paramId: string) {
  return apiRequest<null>(`/projects/${projectId}/params/${paramId}`, {
    method: 'DELETE',
  });
}

export function reorderProjectParams(projectId: string, orders: { paramId: string; order: number }[]) {
  return apiRequest<null>(`/projects/${projectId}/params/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orders }),
  });
}
