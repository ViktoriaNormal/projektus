import { apiRequest } from './client';

export type DependencyType = 'blocks' | 'is_blocked_by' | 'parent' | 'subtask' | 'relates_to';

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: DependencyType;
}

export function getTaskDependencies(taskId: string) {
  return apiRequest<TaskDependency[]>(`/tasks/${taskId}/dependencies`);
}

export function addDependency(taskId: string, data: { dependsOnTaskId: string; type: DependencyType }) {
  return apiRequest<TaskDependency>(`/tasks/${taskId}/dependencies`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteDependency(taskId: string, dependencyId: string) {
  return apiRequest<null>(`/tasks/${taskId}/dependencies/${dependencyId}`, {
    method: 'DELETE',
  });
}
