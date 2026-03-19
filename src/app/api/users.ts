import { apiRequest } from './client';
import type { UserResponse } from './auth';

export interface SystemRoleResponse {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface ProjectRoleResponse {
  projectId: string;
  projectName: string;
  roles: string[];
  permissions: string[];
}

export interface UserProfileResponse extends UserResponse {
  position: string | null;
}

export function getUser(userId: string) {
  return apiRequest<UserProfileResponse>(`/users/${userId}`);
}

export function updateUser(
  userId: string,
  data: { full_name?: string; email?: string },
) {
  return apiRequest<UserProfileResponse>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function uploadAvatar(userId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`/api/v1/users/${userId}/avatar`, {
    method: 'PUT',
    headers,
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message || 'Не удалось загрузить аватар');
    }
    const body = await res.json();
    return body.data as UserProfileResponse;
  });
}

export function getUserSystemRoles(userId: string) {
  return apiRequest<SystemRoleResponse[]>(`/users/${userId}/roles`);
}

export function getUserProjectRoles(userId: string) {
  return apiRequest<ProjectRoleResponse[]>(`/users/${userId}/project-roles`);
}
