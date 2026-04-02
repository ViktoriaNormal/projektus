import { apiRequest } from './client';

// ── Response Types ──────────────────────────────────────────

export interface TaskResponse {
  id: string;
  key: string;
  projectId: string;
  boardId: string;
  ownerMemberId: string;
  executorMemberId: string | null;
  ownerUserId: string;
  executorUserId: string | null;
  name: string;
  description: string | null;
  deadline: string | null;
  columnId: string | null;
  swimlaneId: string | null;
  progress: number | null;
  priority: string | null;
  estimation: string | null;
  // Extended fields (populated by backend when available)
  tags?: { id: string; boardId: string; name: string }[];
  createdAt?: string;
  columnName?: string | null;
  columnSystemType?: string | null;
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

export interface CreateTaskChecklist {
  name: string;
  items?: { content: string; isChecked?: boolean; order?: number }[];
}

export interface CreateTaskFieldValue {
  fieldId: string;
  valueText?: string | null;
  valueNumber?: number | string | null;
  valueDatetime?: string | null;
}

export interface CreateTaskDependency {
  dependsOnTaskId: string;
  type: 'blocks' | 'is_blocked_by' | 'parent' | 'subtask' | 'relates_to';
}

export function createTask(data: {
  projectId: string;
  ownerMemberId: string;
  name: string;
  boardId?: string;
  description?: string;
  executorMemberId?: string;
  columnId?: string;
  swimlaneId?: string;
  deadline?: string;
  priority?: string;
  estimation?: string;
  // Nested entities (created atomically with the task)
  checklists?: CreateTaskChecklist[];
  tags?: string[];
  watcherMemberIds?: string[];
  fieldValues?: CreateTaskFieldValue[];
  dependencies?: CreateTaskDependency[];
  addToBacklog?: boolean;
}) {
  return apiRequest<TaskResponse>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTask(taskId: string, data: Partial<{
  name: string;
  description: string;
  executorMemberId: string | null;
  columnId: string;
  swimlaneId: string | null;
  deadline: string | null;
  priority: string | null;
  estimation: string | null;
}>) {
  return apiRequest<TaskResponse>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTask(taskId: string) {
  return apiRequest<null>(`/tasks/${taskId}`, {
    method: 'DELETE',
  });
}
