import { apiRequest } from './client';

// ── Response Types ──────────────────────────────────────────

export interface TaskResponse {
  id: string;
  key: string;
  projectId: string;
  ownerId: string;
  executorId: string | null;
  name: string;
  description: string | null;
  deadline: string | null;
  columnId: string;
  swimlaneId: string | null;
  progress: number | null;
}

// ── Tasks ───────────────────────────────────────────────────

export function searchTasks(params: {
  projectId?: string;
  ownerId?: string;
  executorId?: string;
  columnId?: string;
}) {
  const qs = new URLSearchParams();
  if (params.projectId) qs.set('projectId', params.projectId);
  if (params.ownerId) qs.set('ownerId', params.ownerId);
  if (params.executorId) qs.set('executorId', params.executorId);
  if (params.columnId) qs.set('columnId', params.columnId);
  return apiRequest<TaskResponse[]>(`/tasks?${qs.toString()}`);
}

export function getTask(taskId: string) {
  return apiRequest<TaskResponse>(`/tasks/${taskId}`);
}

export function createTask(data: {
  projectId: string;
  name: string;
  description?: string;
  executorId?: string;
  columnId: string;
  swimlaneId?: string;
  deadline?: string;
}) {
  return apiRequest<TaskResponse>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTask(taskId: string, data: Partial<{
  name: string;
  description: string;
  executorId: string | null;
  columnId: string;
  swimlaneId: string | null;
  deadline: string | null;
}>) {
  return apiRequest<TaskResponse>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTask(taskId: string, reason: string) {
  return apiRequest<null>(`/tasks/${taskId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}
