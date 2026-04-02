import { apiRequest } from './client';

export interface CommentResponse {
  id: string;
  taskId: string;
  authorId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function getTaskComments(taskId: string) {
  return apiRequest<CommentResponse[]>(`/tasks/${taskId}/comments`);
}

export function createComment(taskId: string, data: { content: string; parentCommentId?: string }) {
  return apiRequest<CommentResponse>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteComment(commentId: string) {
  return apiRequest<null>(`/tasks/comments/${commentId}`, {
    method: 'DELETE',
  });
}
