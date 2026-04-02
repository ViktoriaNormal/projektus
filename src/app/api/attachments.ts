import { apiRequest } from './client';

export interface AttachmentResponse {
  id: string;
  taskId: string | null;
  commentId: string | null;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export function getTaskAttachments(taskId: string) {
  return apiRequest<AttachmentResponse[]>(`/tasks/${taskId}/attachments`);
}

export async function uploadAttachment(taskId: string, file: File): Promise<AttachmentResponse> {
  const token = localStorage.getItem('access_token');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/v1/tasks/${taskId}/attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const raw = await response.json();
  // snake_case → camelCase conversion
  function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
  }
  function convertKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(convertKeys);
    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        result[snakeToCamel(key)] = convertKeys(value);
      }
      return result;
    }
    return obj;
  }
  const body = convertKeys(raw) as { success: boolean; data: AttachmentResponse };
  if (!body.success) throw new Error('Upload failed');
  return body.data;
}

export function deleteAttachment(attachmentId: string) {
  return apiRequest<null>(`/tasks/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}
