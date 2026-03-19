import { apiRequest } from './client';
import type { PasswordPolicy } from './auth';

export interface AdminPasswordPolicy extends PasswordPolicy {
  updatedAt?: string;
  updatedBy?: string;
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
