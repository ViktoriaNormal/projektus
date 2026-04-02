import { apiRequest } from './client';

export interface TaskWatcher {
  taskId: string;
  memberId: string;
}

export function getTaskWatchers(taskId: string) {
  return apiRequest<TaskWatcher[]>(`/tasks/${taskId}/watchers`);
}

export function addWatcher(taskId: string, memberId: string) {
  return apiRequest<TaskWatcher>(`/tasks/${taskId}/watchers`, {
    method: 'POST',
    body: JSON.stringify({ memberId }),
  });
}

export function removeWatcher(taskId: string, memberId: string) {
  return apiRequest<null>(`/tasks/${taskId}/watchers/${memberId}`, {
    method: 'DELETE',
  });
}
