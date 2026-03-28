import { apiRequest } from './client';

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
}


export interface AuthRoleResponse {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
  roles: AuthRoleResponse[];
}

export interface PasswordPolicy {
  minLength: number;
  requireDigits: boolean;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireSpecial: boolean;
  notes: string | null;
}

export function login(username: string, password: string) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function register(data: {
  username: string;
  email: string;
  password: string;
  fullName: string;
}) {
  return apiRequest<{ user: UserResponse }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function refreshToken(rt: string) {
  return apiRequest<{ accessToken: string; refreshToken: string }>(
    '/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt }),
    },
  );
}


export function logout(rt: string) {
  return apiRequest<null>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: rt }),
  });
}

export function getPasswordPolicy() {
  return apiRequest<PasswordPolicy>('/auth/password-policy');
}

export function changePassword(oldPassword: string, newPassword: string) {
  return apiRequest<null>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}