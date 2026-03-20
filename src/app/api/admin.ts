import { apiRequest } from './client';
import type { PasswordPolicy } from './auth';

// ── Permission Catalog ──────────────────────────────────────

export interface PermissionDescriptor {
  key: string;
  description: string;
}

export function getPermissionsCatalog() {
  return apiRequest<PermissionDescriptor[]>('/permissions');
}

// ── Password Policy ──────────────────────────────────────────

export interface AdminPasswordPolicy extends PasswordPolicy {
  updatedAt?: string;
  updatedBy?: string;
}

// ── System Roles ─────────────────────────────────────────────

export interface SystemRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export function getSystemRoles() {
  return apiRequest<SystemRole[]>('/admin/roles');
}

export function getSystemRole(roleId: string) {
  return apiRequest<SystemRole>(`/admin/roles/${roleId}`);
}

export function createSystemRole(data: { name: string; description: string; permissions: string[] }) {
  return apiRequest<SystemRole>('/admin/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSystemRole(roleId: string, data: { name: string; description: string; permissions: string[] }) {
  return apiRequest<SystemRole>(`/admin/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteSystemRole(roleId: string) {
  return apiRequest<null>(`/admin/roles/${roleId}`, {
    method: 'DELETE',
  });
}

// ── Admin Users ─────────────────────────────────────────────

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  position: string | null;
  is_active: boolean;
  roles: { id: string; name: string }[];
  created_at: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  full_name: string;
  position: string;
  password: string;
  is_active: boolean;
  role_ids: string[];
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  full_name?: string;
  position?: string;
  is_active?: boolean;
  role_ids?: string[];
}

export interface AdminUsersResponse {
  total: number;
  users: AdminUser[];
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const data = await apiRequest<AdminUsersResponse>('/admin/users');
  return data.users;
}

export function getAdminUser(userId: string) {
  return apiRequest<AdminUser>(`/admin/users/${userId}`);
}

export function createAdminUser(data: CreateUserPayload) {
  return apiRequest<AdminUser>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAdminUser(userId: string, data: UpdateUserPayload) {
  return apiRequest<AdminUser>(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteAdminUser(userId: string) {
  return apiRequest<null>(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

// ── Password Policy ──────────────────────────────────────────

export function getAdminPasswordPolicy() {
  return apiRequest<AdminPasswordPolicy>('/admin/password-policy');
}

export function updateAdminPasswordPolicy(data: Partial<PasswordPolicy>) {
  return apiRequest<AdminPasswordPolicy>('/admin/password-policy', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
