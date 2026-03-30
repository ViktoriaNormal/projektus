import { apiRequest } from './client';
import type { UserResponse } from './auth';

export interface SystemRolePermission {
  code: string;
  access: "full" | "view" | "none";
}

export interface SystemRoleResponse {
  id: string;
  name: string;
  description: string;
  isAdmin: boolean;
  permissions: SystemRolePermission[];
}

export interface ProjectRoleResponse {
  projectId: string;
  projectName: string;
  roles: string[];
  permissions: string[];
}

export interface UserProfileResponse extends UserResponse {
  position: string | null;
  onVacation: boolean;
  isSick: boolean;
  altContactChannel: string | null;
  altContactInfo: string | null;
}

export interface UpdateUserProfileData {
  fullName?: string;
  email?: string;
  position?: string | null;
  onVacation?: boolean;
  isSick?: boolean;
  altContactChannel?: string | null;
  altContactInfo?: string | null;
}

export function getUser(userId: string) {
  return apiRequest<UserProfileResponse>(`/users/${userId}`);
}

export function searchUsers(query: string, limit = 20, offset = 0) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return apiRequest<{ users: UserProfileResponse[] }>(`/users?${params.toString()}`)
    .then((res) => res.users);
}

export function updateUser(
  userId: string,
  data: UpdateUserProfileData,
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
