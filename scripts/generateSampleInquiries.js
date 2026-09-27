// Generates sample inquiry data for demos/testing.
//
//   node scripts/generateSampleInquiries.js [count]
//
// Defaults to 1000 if no count is given. Roughly half Active (new/ongoing),
// half Completed. Requires at least one active sales/leader/manager user
// already in the database (run `npm run seed` first if you haven't).
//
// Deliberately varies each inquiry's "last updated" date across a spread —
// some very recent, some several days old — so the Tasks page's staleness
// auto-escalation ("FOLLOW UP NOW!") has real examples to show once you
// present. Customer names repeat on purpose (~40% unique pool) so the
// Contacts page has multi-inquiry customers to demonstrate aggregation.
//
// Safe to re-run — every run just adds more inquiries, nothing is deleted
// or deduplicated against previous runs (beyond the normal Contacts
// name-matching, which still applies).
const prisma = require('../src/config/db');
const { resolveOrCreateCustomer } = require('../src/utils/customers');

const TOTAL = Number(process.argv[2]) || 1000;
const ACTIVE_RATIO = 0.5; // fraction that end up Active rather than Completed

const FIRST_NAMES = [
  'Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Antonio', 'Carmen', 'Francisco', 'Elena',
  'Manuel', 'Teresa', 'Ramon', 'Lourdes', 'Ricardo', 'Cristina', 'Eduardo', 'Josephine', 'Roberto', 'Angelica',
  'Chester', 'Kenji', 'Lucas', 'Ana Marie', 'Miguel', 'Diana', 'Arnel', 'Grace', 'Noel', 'Rowena',
  'Jerome', 'Michelle', 'Dennis', 'Cathy', 'Marvin', 'Joy', 'Alvin', 'Karen', 'Bryan', 'Melody',
];
const LAST_NAMES = [
  'Dela Cruz', 'Reyes', 'Garcia', 'Santos', 'Ramos', 'Mendoza', 'Torres', 'Flores', 'Gonzales', 'Bautista',
  'Villanueva', 'Castro', 'Aquino', 'Pascual', 'Fernandez', 'Rivera', 'Salazar', 'Navarro', 'Domingo', 'Marquez',
  'Lim', 'Tan', 'Watanabe', 'Bibon', 'Muller', 'Uy', 'Gatchalian', 'De Guzman', 'Ocampo', 'Ilagan',
];

const UNITS = [
  'Vios 1.3 XE CVT', 'Wigo 1.0 G AT', 'Avanza 1.5 G CVT', 'Innova 2.0 G AT', 'Fortuner 2.4 V 4x2',
  'Hilux 2.4 G 4x2', 'RAV4 2.0 Active', 'Corolla Altis 1.6 V', 'Camry 2.5 V', 'Land Cruiser Prado VX',
  'Hiace Commuter Deluxe', 'Rush 1.5 G AT', 'Raize 1.2 G CVT',
];

const DETAIL_TEMPLATES = {
  new_vehicle: [
    'Interested in test driving the {unit} this weekend.',
    'Asking about financing options for the {unit}.',
    'Wants to know the on-the-road price of the {unit}.',
    'Requesting a color and variant comparison for the {unit}.',
    'Following up on trade-in value for their old unit against a {unit}.',
    'Asked about unit availability for the {unit} this month.',
  ],
  parts: [
    'Needs OEM brake pads for their {unit}.',
    'Asking about parts availability for {unit} suspension repair.',
    'Wants a quotation for {unit} air filter and oil filter replacement.',
    'Requesting genuine parts pricing for {unit} headlight assembly.',
  ],
  repair: [
    'Requesting PMS schedule for their {unit}.',
    'Reporting an engine warning light on their {unit}.',
    'Needs body repair estimate after a minor collision involving a {unit}.',
    'Asking about warranty coverage for {unit} aircon repair.',
  ],
};

const INQUIRY_TYPES = Object.keys(DETAIL_TEMPLATES);
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SOURCES = ['social', 'email', 'phone', 'physical'];
const TRANSACTIONS = ['financing', 'cash', 'trade_in', 'lease', 'other'];

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randInt(8, 17), randInt(0, 59), 0, 0);
  return d;
}
function randomCustomerName() {
  return `${randChoice(FIRST_NAMES)} ${randChoice(LAST_NAMES)}`;
}
function randomContact() {
  return Math.random() < 0.5
    ? `09${randInt(10, 49)}-${randInt(100, 999)}-${randInt(1000, 9999)}`
    : `${randChoice(FIRST_NAMES)}.${randChoice(LAST_NAMES)}${randInt(1, 99)}@email.com`.toLowerCase().replace(/\s+/g, '');
}

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['sales', 'leader', 'manager'] }, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (users.length === 0) {
    console.error('No active sales/leader/manager users found — run `npm run seed` first, then retry.');
    process.exitCode = 1;
    return;
  }

  // ~40% unique names — the rest are repeats, so Contacts has real
  // multi-inquiry customers to show off aggregation.
  const customerPool = Array.from({ length: Math.max(1, Math.round(TOTAL * 0.4)) }, randomCustomerName);

  console.log(`Generating ${TOTAL} sample inquiries (roughly ${Math.round(ACTIVE_RATIO * 100)}% Active)...`);
  let created = 0;

  for (let i = 0; i < TOTAL; i++) {
    const isActive = Math.random() < ACTIVE_RATIO;
    const inquiryType = randChoice(INQUIRY_TYPES);
    const unit = randChoice(UNITS);
    const details = randChoice(DETAIL_TEMPLATES[inquiryType]).replace('{unit}', unit);
    const assignee = randChoice(users);
    const customerName = randChoice(customerPool);

    const createdAt = daysAgo(randInt(1, 180)); // spread across the last ~6 months

    let status, updatedAt, completedAt;
    if (isActive) {
      status = Math.random() < 0.5 ? 'new' : 'ongoing';
      // Deliberate spread: ~30% fresh (0-1d), ~30% borderline (2-3d),
      // ~40% stale (4-10d) — gives Tasks real "FOLLOW UP NOW!" examples
      // with the default 2-day threshold.
      const bucket = Math.random();
      const daysSinceUpdate = bucket < 0.3 ? randInt(0, 1) : bucket < 0.6 ? randInt(2, 3) : randInt(4, 10);
      updatedAt = daysAgo(daysSinceUpdate);
      if (updatedAt < createdAt) updatedAt = new Date(createdAt);
      completedAt = null;
    } else {
      status = 'completed';
      const maxDaysToComplete = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000));
      completedAt = new Date(createdAt);
      completedAt.setDate(completedAt.getDate() + randInt(0, maxDaysToComplete));
      if (completedAt > new Date()) completedAt = new Date();
      updatedAt = completedAt;
    }

    const customer = await resolveOrCreateCustomer(prisma, customerName, assignee.id);

    await prisma.inquiry.create({
      data: {
        customerName,
        customerContact: randomContact(),
        details,
        status,
        assignedTo: assignee.id,
        createdBy: assignee.id,
        inquiryType,
        priority: randChoice(PRIORITIES),
        unit,
        source: randChoice(SOURCES),
        preferredTransaction: randChoice(TRANSACTIONS),
        lastContactAt: Math.random() < 0.7 ? updatedAt : null,
        customerId: customer.id,
        createdAt,
        updatedAt,
        assignedAt: createdAt,
        completedAt,
      },
    });

    created += 1;
    if (created % 100 === 0) console.log(`  ${created}/${TOTAL}...`);
  }

  console.log(`Done. Created ${created} inquiries.`);
}

main()
  .catch((err) => {
    console.error('Generation failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
