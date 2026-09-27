// Run once after migrating in the Contacts feature:
//   node scripts/backfillCustomers.js
//
// Every inquiry created going forward gets its customerId set
// automatically (see resolveOrCreateCustomer in src/utils/customers.js).
// This script only exists to retroactively link inquiries that were
// created before that logic existed, so they show up in Contacts too.
// Safe to re-run — it only touches inquiries where customerId is still
// null, so running it twice is a no-op the second time.
const prisma = require('../src/config/db');
const { resolveOrCreateCustomer, normalize } = require('../src/utils/customers');

async function main() {
  const orphaned = await prisma.inquiry.findMany({
    where: { customerId: null },
    orderBy: { createdAt: 'asc' }, // earliest first, so "first logged by" is accurate
    select: { id: true, customerName: true, createdBy: true },
  });

  if (orphaned.length === 0) {
    console.log('No inquiries need backfilling — nothing to do.');
    return;
  }

  console.log(`Backfilling ${orphaned.length} inquiries into Contacts...`);

  const customerCache = new Map(); // normalizedName -> Customer, avoids refetching mid-run
  let created = 0;
  let linked = 0;

  for (const inquiry of orphaned) {
    const key = normalize(inquiry.customerName);
    let customer = customerCache.get(key);
    if (!customer) {
      const before = await prisma.customer.count({ where: { normalizedName: key } });
      customer = await resolveOrCreateCustomer(prisma, inquiry.customerName, inquiry.createdBy);
      if (before === 0) created += 1;
      customerCache.set(key, customer);
    }

    await prisma.inquiry.update({ where: { id: inquiry.id }, data: { customerId: customer.id } });
    linked += 1;
  }

  console.log(`Done. Created ${created} new contacts, linked ${linked} inquiries.`);
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
