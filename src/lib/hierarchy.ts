import type { User } from '../types';

// Direct reports for a given user, per the hierarchy:
//   manager -> leaders where leader.managerId === manager.id
//   leader  -> sales reps where sales.leaderId === leader.id
//   sales / admin -> no direct reports
export function getDirectReports(allUsers: User[], user: User): User[] {
  if (user.role === 'manager') {
    return allUsers.filter((u) => u.role === 'leader' && u.managerId === user.id);
  }
  if (user.role === 'leader') {
    return allUsers.filter((u) => u.role === 'sales' && u.leaderId === user.id);
  }
  return [];
}

// Every sales rep beneath a manager, across all of that manager's leaders —
// used for a manager's aggregate "team size" figure.
export function getAllDescendantSales(allUsers: User[], user: User): User[] {
  if (user.role === 'leader') {
    return getDirectReports(allUsers, user);
  }
  if (user.role === 'manager') {
    const leaders = getDirectReports(allUsers, user);
    return leaders.flatMap((leader) => getDirectReports(allUsers, leader));
  }
  return [];
}

// Sales reps with no leader assigned yet — the "unassigned" pool shown
// first in the Assign Marketing picker.
export function getUnassignedSales(allUsers: User[]): User[] {
  return allUsers.filter((u) => u.role === 'sales' && !u.leaderId);
}

// Leaders with no manager assigned yet — same idea, for manager rows.
export function getUnassignedLeaders(allUsers: User[]): User[] {
  return allUsers.filter((u) => u.role === 'leader' && !u.managerId);
}
