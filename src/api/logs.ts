import { request } from './client';
import type { ActivityLogEntry, InquiryLogEntry, PaginatedResponse } from '../types';

export interface LogListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export function listActivityLog(params: LogListParams = {}): Promise<PaginatedResponse<ActivityLogEntry>> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  if (params.q) query.q = params.q;
  return request('/logs/activity', { params: query });
}

export interface InquiriesLogParams extends LogListParams {
  view?: 'active' | 'completed';
}

export function listInquiriesLog(
  params: InquiriesLogParams = {},
): Promise<PaginatedResponse<InquiryLogEntry>> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  if (params.view) query.view = params.view;
  if (params.q) query.q = params.q;
  return request('/logs/inquiries', { params: query });
}
