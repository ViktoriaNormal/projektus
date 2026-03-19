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

export function getAdminPasswordPolicy() {
  return apiRequest<AdminPasswordPolicy>('/admin/password-policy');
}

export function updateAdminPasswordPolicy(data: Partial<PasswordPolicy>) {
  return apiRequest<AdminPasswordPolicy>('/admin/password-policy', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
