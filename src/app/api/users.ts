import { apiRequest, camelizeResponse } from './client';
import type { UserResponse } from './auth';
import { normalizeSearchQuery } from '../lib/search';

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

export interface ProjectRoleRef {
  id: string;
  name: string;
}

export interface ProjectRoleResponse {
  projectId: string;
  projectName: string;
  roles: ProjectRoleRef[];
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

export interface UsersPage {
  users: UserProfileResponse[];
  total: number;
}

/** Постраничный поиск с total. limit=0 — вернёт только total без массива users. */
export function searchUsersPage(query: string, limit = 20, offset = 0): Promise<UsersPage> {
  const params = new URLSearchParams();
  const q = normalizeSearchQuery(query);
  if (q) params.set('q', q);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return apiRequest<UsersPage>(`/users?${params.toString()}`).then((res) => ({
    users: Array.isArray(res?.users) ? res.users : [],
    total: typeof res?.total === 'number' ? res.total : 0,
  }));
}

/** Совместимый shim: возвращает только массив users для старых вызовов (autocomplete и т. п.). */
export function searchUsers(query: string, limit = 20, offset = 0): Promise<UserProfileResponse[]> {
  return searchUsersPage(query, limit, offset).then((p) => p.users);
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
      const rawErr = await res.json().catch(() => null);
      const err = camelizeResponse<{ error?: { message?: string } }>(rawErr);
      throw new Error(err?.error?.message || 'Не удалось загрузить аватар');
    }
    const raw = await res.json();
    const body = camelizeResponse<{ data: UserProfileResponse }>(raw);
    return body.data;
  });
}

export function getUserSystemRoles(userId: string) {
  return apiRequest<SystemRoleResponse[]>(`/users/${userId}/roles`);
}

export function getUserProjectRoles(userId: string) {
  return apiRequest<ProjectRoleResponse[]>(`/users/${userId}/project-roles`);
}
