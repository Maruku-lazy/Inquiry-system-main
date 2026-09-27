import { request } from './client';
import type { LoginResponse, User } from '../types';

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } });
}

export function logout(): Promise<{ message: string }> {
  return request('/auth/logout', { method: 'POST' });
}

export function fetchMe(): Promise<{ user: User }> {
  return request('/auth/me');
}
