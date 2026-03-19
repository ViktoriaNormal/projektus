import { apiRequest } from './client';

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
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
  full_name: string;
}) {
  return apiRequest<{ user: UserResponse }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function refreshToken(refresh_token: string) {
  return apiRequest<{ access_token: string; refresh_token: string }>(
    '/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    },
  );
}

export function logout(refresh_token: string) {
  return apiRequest<null>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  });
}

export function getPasswordPolicy() {
  return apiRequest<PasswordPolicy>('/auth/password-policy');
}