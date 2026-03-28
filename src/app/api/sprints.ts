import { apiRequest } from './client';
import type { TaskResponse } from './tasks';

// ── Sprint Types ────────────────────────────────────────────

export interface SprintResponse {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// ── Sprints ─────────────────────────────────────────────────

export function getProjectSprints(projectId: string) {
  return apiRequest<SprintResponse[]>(`/projects/${projectId}/sprints`);
}

export function createSprint(projectId: string, data: {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}) {
  return apiRequest<SprintResponse>(`/projects/${projectId}/sprints`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getSprint(sprintId: string) {
  return apiRequest<SprintResponse>(`/sprints/${sprintId}`);
}

export function updateSprint(sprintId: string, data: Partial<{
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
}>) {
  return apiRequest<SprintResponse>(`/sprints/${sprintId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSprint(sprintId: string) {
  return apiRequest<null>(`/sprints/${sprintId}`, {
    method: 'DELETE',
  });
}

export function startSprint(sprintId: string) {
  return apiRequest<SprintResponse>(`/sprints/${sprintId}/start`, {
    method: 'POST',
  });
}

export function completeSprint(sprintId: string) {
  return apiRequest<SprintResponse>(`/sprints/${sprintId}/complete`, {
    method: 'POST',
  });
}

// ── Backlog ─────────────────────────────────────────────────

export function getProductBacklog(projectId: string) {
  return apiRequest<TaskResponse[]>(`/projects/${projectId}/backlog/product`);
}

export function addTaskToBacklog(projectId: string, taskId: string) {
  return apiRequest<null>(`/projects/${projectId}/backlog/product/tasks`, {
    method: 'POST',
    body: JSON.stringify({ taskId }),
  });
}

export function removeTaskFromBacklog(projectId: string, taskId: string) {
  return apiRequest<null>(`/projects/${projectId}/backlog/product/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export function reorderBacklog(projectId: string, taskIds: string[]) {
  return apiRequest<null>(`/projects/${projectId}/backlog/product/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ taskIds }),
  });
}

export function getSprintBacklog(projectId: string) {
  return apiRequest<TaskResponse[]>(`/projects/${projectId}/backlog/sprint`);
}

export function moveTasksToSprint(projectId: string, data: {
  sprintId: string;
  taskIds: string[];
}) {
  return apiRequest<null>(`/projects/${projectId}/backlog/move-to-sprint`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
