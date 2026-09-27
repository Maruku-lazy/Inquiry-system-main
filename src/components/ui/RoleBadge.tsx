import type { Role } from '../../types';
import { ROLE_COLORS, ROLE_LABELS } from '../../types';

export function RoleBadge({ role, compact = false }: { role: Role; compact?: boolean }) {
  const c = ROLE_COLORS[role];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${c.bg} ${c.text} ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {ROLE_LABELS[role]}
    </span>
  );
}
