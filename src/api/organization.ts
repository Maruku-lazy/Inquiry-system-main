import { request } from './client';
import type { OrgChart } from '../types';

export function getOrgChart(): Promise<OrgChart> {
  return request('/organization/chart');
}

export interface MyTeamUser {
  id: string;
  name: string;
  role: string;
  leaderId?: string | null;
}

export function getMyTeam(): Promise<{ leaders: MyTeamUser[]; salesReps: MyTeamUser[] }> {
  return request('/organization/my-team');
}

export function assignSalesToLeader(
  salesId: string,
  leaderId: string | null,
): Promise<{ user: { id: string; name: string; leaderId: string | null } }> {
  return request('/organization/assign-sales', { method: 'PATCH', body: { salesId, leaderId } });
}
