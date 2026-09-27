import type { InquiryStatus } from '../../types';
import { STATUS_STYLES } from '../../lib/format';
import { STATUS_LABELS } from '../../types';

export function StatusBadge({ status }: { status: InquiryStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
