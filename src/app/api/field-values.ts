import { apiRequest } from './client';

export interface TaskFieldValue {
  fieldId: string;
  valueText: string | null;
  valueNumber: number | null;
  valueDatetime: string | null;
}

export function getTaskFieldValues(taskId: string) {
  return apiRequest<TaskFieldValue[]>(`/tasks/${taskId}/field-values`);
}

export function setTaskFieldValue(taskId: string, fieldId: string, data: {
  valueText?: string | null;
  valueNumber?: number | null;
  valueDatetime?: string | null;
}) {
  return apiRequest<TaskFieldValue>(`/tasks/${taskId}/field-values/${fieldId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
