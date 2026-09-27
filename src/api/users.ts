import { request } from './client';
import type { Role, User } from '../types';

export function listUsers(role?: Role): Promise<{ users: User[] }> {
  return request('/users', { params: role ? { role } : {} });
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  managerId?: string | null;
  leaderId?: string | null;
}

export function createUser(input: CreateUserInput): Promise<{ user: User }> {
  return request('/users', { method: 'POST', body: input });
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  managerId?: string | null;
  leaderId?: string | null;
  isActive?: boolean;
}

export function updateUser(id: string, input: UpdateUserInput): Promise<{ user: User }> {
  return request(`/users/${id}`, { method: 'PATCH', body: input });
}

export function deactivateUser(id: string): Promise<{ user: User; message: string }> {
  return request(`/users/${id}`, { method: 'DELETE' });
}

// Distinct from deactivate — see backend/prisma/schema.prisma User.deletedAt
// comment for why this is one-way from the UI but never a hard DB delete.
export function deleteUserAccount(id: string): Promise<{ user: User; message: string }> {
  return request(`/users/${id}/delete-account`, { method: 'POST' });
}
