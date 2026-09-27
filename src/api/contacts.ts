import { request } from './client';
import type { Contact, Inquiry, PaginatedResponse } from '../types';

export interface ListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export function listContacts(params: ListParams = {}): Promise<PaginatedResponse<Contact>> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  if (params.q) query.q = params.q;
  return request('/contacts', { params: query });
}

export function getContact(id: string): Promise<{ contact: Contact }> {
  return request(`/contacts/${id}`);
}

export function listContactInquiries(
  id: string,
  params: ListParams = {},
): Promise<PaginatedResponse<Inquiry>> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  return request(`/contacts/${id}/inquiries`, { params: query });
}

export function updateContact(id: string, name: string): Promise<{ contact: Contact }> {
  return request(`/contacts/${id}`, { method: 'PATCH', body: { name } });
}

export function deleteContact(id: string): Promise<{ message: string }> {
  return request(`/contacts/${id}`, { method: 'DELETE' });
}
