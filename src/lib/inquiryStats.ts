import type { InquiryStats, UserInquiryStats } from '../types';

const EMPTY_STATS: InquiryStats = { total: 0, new: 0, ongoing: 0, completed: 0 };

export function findUserStats(stats: UserInquiryStats[], userId: string): InquiryStats {
  const found = stats.find((s) => s.userId === userId);
  return found ?? EMPTY_STATS;
}
