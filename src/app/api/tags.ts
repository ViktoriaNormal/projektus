import { apiRequest } from './client';

export interface TagResponse {
  id: string;
  boardId: string;
  name: string;
}

export function getTaskTags(taskId: string) {
  return apiRequest<TagResponse[]>(`/tasks/${taskId}/tags`);
}

export function addTagToTask(boardId: string, taskId: string, data: { name: string }) {
  return apiRequest<TagResponse>(`/boards/${boardId}/tasks/${taskId}/tags`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function removeTagFromTask(taskId: string, tagId: string) {
  return apiRequest<null>(`/tasks/${taskId}/tags/${tagId}`, {
    method: 'DELETE',
  });
}

export function getBoardTags(boardId: string) {
  return apiRequest<TagResponse[]>(`/boards/${boardId}/tags`);
}
