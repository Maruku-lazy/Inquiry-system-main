// Shared between every export format (Excel/PDF/Word) so adding a new
// format never needs its own copy of the field-mapping or labeling logic —
// only its own document-rendering code.

function shortId(id) {
  return `INQ-${id.slice(0, 4).toUpperCase()}`;
}

const INQUIRY_TYPE_LABELS = { new_vehicle: 'New Vehicle', parts: 'Parts', repair: 'Repair' };
const SOURCE_LABELS = { social: 'Social', email: 'Email', phone: 'Phone', physical: 'Physical' };
const PREFERRED_TRANSACTION_LABELS = {
  financing: 'Financing',
  cash: 'Cash',
  trade_in: 'Trade-in',
  lease: 'Lease',
  other: 'Other',
};
const STATUS_LABELS = { new: 'New', ongoing: 'Ongoing', completed: 'Completed' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

const BASE_COLUMNS = [
  { key: 'id', label: 'ID', weight: 1 },
  { key: 'customerName', label: 'Customer', weight: 1.6 },
  { key: 'customerContact', label: 'Contact', weight: 1.4 },
  { key: 'details', label: 'Details', weight: 4 },
  { key: 'inquiryType', label: 'Type', weight: 1.2 },
  { key: 'priority', label: 'Priority', weight: 1 },
  { key: 'status', label: 'Status', weight: 1.1 },
  { key: 'unit', label: 'Unit', weight: 1.2 },
  { key: 'source', label: 'Source', weight: 1 },
  { key: 'preferredTransaction', label: 'Preferred Transaction', weight: 1.4 },
  { key: 'assignedTo', label: 'Assigned To', weight: 1.4 },
  { key: 'createdBy', label: 'Logged By', weight: 1.4 },
  { key: 'createdAt', label: 'Date Posted', weight: 1.2 },
  { key: 'lastContactAt', label: 'Last Contact', weight: 1.2 },
  { key: 'reminderAt', label: 'Reminder', weight: 1.2 },
  { key: 'updatedAt', label: 'Last Updated', weight: 1.3 },
];

// Tab-specific columns slot in right after Status, so completion/deletion
// info reads naturally next to the lifecycle field instead of being
// tacked on at the far end of a wide table.
const TAB_EXTRA_COLUMNS = {
  active: [],
  completed: [{ key: 'completedAt', label: 'Completed On', weight: 1.2 }],
  deleted: [
    { key: 'deletedAt', label: 'Deleted On', weight: 1.3 },
    { key: 'deletedBy', label: 'Deleted By', weight: 1.3 },
  ],
};

function columnsForTab(tab) {
  const statusIndex = BASE_COLUMNS.findIndex((c) => c.key === 'status');
  const cols = [...BASE_COLUMNS];
  cols.splice(statusIndex + 1, 0, ...TAB_EXTRA_COLUMNS[tab]);
  return cols;
}

// Converts each column's relative `weight` into an exact percentage width
// that always sums to 100 regardless of how many extra columns a given
// tab adds — used by the PDF generator to build a fixed table-layout, so
// wide "Details" text can never squeeze the other columns into slivers
// (the root cause of misaligned/clipped-looking PDF exports).
function columnWidthPercentages(columns) {
  const totalWeight = columns.reduce((sum, c) => sum + (c.weight ?? 1), 0);
  return columns.map((c) => ((c.weight ?? 1) / totalWeight) * 100);
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Flattens a Prisma inquiry row (already joined via INCLUDE_PARTICIPANTS)
// into plain, display-ready strings — the single shape every generator
// consumes. The full record, not just the table-view columns: every field
// visible in the Inquiry Detail modal is included here.
function buildExportRows(items) {
  return items.map((inq) => ({
    id: shortId(inq.id),
    customerName: inq.customerName,
    customerContact: inq.customerContact,
    details: inq.details,
    inquiryType: inq.inquiryType ? INQUIRY_TYPE_LABELS[inq.inquiryType] : '',
    priority: inq.priority ? PRIORITY_LABELS[inq.priority] : '',
    status: STATUS_LABELS[inq.status],
    unit: inq.unit ?? '',
    source: inq.source ? SOURCE_LABELS[inq.source] : '',
    preferredTransaction: inq.preferredTransaction
      ? PREFERRED_TRANSACTION_LABELS[inq.preferredTransaction]
      : '',
    assignedTo: inq.assignedUser?.name ?? '',
    createdBy: inq.creator?.name ?? '',
    createdAt: fmtDate(inq.createdAt),
    lastContactAt: fmtDate(inq.lastContactAt),
    reminderAt: fmtDate(inq.reminderAt),
    updatedAt: fmtDateTime(inq.updatedAt),
    completedAt: fmtDate(inq.completedAt),
    deletedAt: fmtDateTime(inq.deletedAt),
    deletedBy: inq.deletedByUser?.name ?? '',
  }));
}

const TAB_LABELS = { active: 'Active', completed: 'Completed', deleted: 'Deleted' };
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Human-readable description of the export scope — reused as the filename
// and as the heading printed inside the PDF/Word documents.
function scopeLabel(scope) {
  const { year, month, weekFrom, weekTo } = scope || {};
  if (!year) return 'All Records';
  if (!month) return `${year}`;
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  if (!weekFrom && !weekTo) return monthLabel;
  const from = weekFrom ?? 1;
  const to = weekTo ?? from;
  return from === to ? `${monthLabel}, Week ${from}` : `${monthLabel}, Weeks ${from}-${to}`;
}

function buildFilename(tab, format, scope) {
  const slug = scopeLabel(scope)
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  return `${TAB_LABELS[tab]}_Inquiries_${slug}.${format}`;
}

module.exports = {
  columnsForTab,
  columnWidthPercentages,
  buildExportRows,
  buildFilename,
  scopeLabel,
  TAB_LABELS,
};
