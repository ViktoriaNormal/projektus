import { apiRequest } from './client';

export interface ChecklistItem {
  id: string;
  checklistId: string;
  content: string;
  isChecked: boolean;
  order: number;
}

export interface ChecklistResponse {
  id: string;
  taskId: string;
  name: string;
  items: ChecklistItem[];
}

export function getTaskChecklists(taskId: string) {
  return apiRequest<ChecklistResponse[]>(`/tasks/${taskId}/checklists`);
}

export function createChecklist(taskId: string, data: { name: string }) {
  return apiRequest<ChecklistResponse>(`/tasks/${taskId}/checklists`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function addChecklistItem(checklistId: string, data: { content: string; order?: number }) {
  return apiRequest<ChecklistItem>(`/tasks/checklists/${checklistId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function setChecklistItemStatus(itemId: string, isChecked: boolean) {
  return apiRequest<null>(`/tasks/checklist-items/${itemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isChecked }),
  });
}

export function updateChecklist(checklistId: string, data: { name: string }) {
  return apiRequest<ChecklistResponse>(`/tasks/checklists/${checklistId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteChecklist(checklistId: string) {
  return apiRequest<null>(`/tasks/checklists/${checklistId}`, {
    method: 'DELETE',
  });
}

export function updateChecklistItem(itemId: string, data: { content: string }) {
  return apiRequest<ChecklistItem>(`/tasks/checklist-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteChecklistItem(itemId: string) {
  return apiRequest<null>(`/tasks/checklist-items/${itemId}`, {
    method: 'DELETE',
  });
}
