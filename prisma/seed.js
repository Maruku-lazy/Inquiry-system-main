// Seeds a small but complete 4-tier hierarchy so you can log in and test
// each role's visibility immediately after migrating.
//
// Run with: npm run seed
//
// ALL SEEDED PASSWORDS ARE "Password123!" — for local/dev testing only.
// Change them (or delete these accounts) before anything resembling
// production use.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: { name: 'System Admin', email: 'admin@toyotaalbay.com', passwordHash, role: 'admin' },
  });

  const manager1 = await prisma.user.create({
    data: { name: 'James Wilson', email: 'j.wilson@toyotaalbay.com', passwordHash, role: 'manager' },
  });
  const manager2 = await prisma.user.create({
    data: { name: 'Maria Santos', email: 'm.santos@toyotaalbay.com', passwordHash, role: 'manager' },
  });

  const leader1 = await prisma.user.create({
    data: {
      name: 'Alice Chen',
      email: 'a.chen@toyotaalbay.com',
      passwordHash,
      role: 'leader',
      managerId: manager1.id,
    },
  });
  const leader2 = await prisma.user.create({
    data: {
      name: 'Eve Johnson',
      email: 'e.johnson@toyotaalbay.com',
      passwordHash,
      role: 'leader',
      managerId: manager2.id,
    },
  });

  const salesUsers = [
    { name: 'Bob Martinez', email: 'b.martinez@toyotaalbay.com', leaderId: leader1.id },
    { name: 'Carol White', email: 'c.white@toyotaalbay.com', leaderId: leader1.id },
    { name: 'David Kim', email: 'd.kim@toyotaalbay.com', leaderId: leader1.id },
    { name: 'Frank Lee', email: 'f.lee@toyotaalbay.com', leaderId: leader2.id },
    { name: 'Grace Park', email: 'g.park@toyotaalbay.com', leaderId: leader2.id },
  ];

  const createdSales = [];
  for (const s of salesUsers) {
    const u = await prisma.user.create({
      data: { name: s.name, email: s.email, passwordHash, role: 'sales', leaderId: s.leaderId },
    });
    createdSales.push(u);
  }

  // A few sample inquiries spread across statuses/employees, covering the
  // Phase 2 extended fields so the UI has real data to render immediately.
  const samples = [
    {
      customerName: 'Juan Dela Cruz',
      customerContact: 'juan.delacruz@email.com',
      details: 'Interested in Vios test drive this weekend.',
      status: 'new',
      inquiryType: 'new_vehicle',
      priority: 'medium',
      source: 'social',
      unit: 'Vios 1.3 XE CVT',
      preferredTransaction: 'financing',
    },
    {
      customerName: 'Maria Reyes',
      customerContact: '0917-555-0142',
      details: 'Asking about Fortuner financing options.',
      status: 'ongoing',
      inquiryType: 'new_vehicle',
      priority: 'high',
      source: 'phone',
      unit: 'Fortuner 2.4 V 4x2',
      preferredTransaction: 'financing',
      lastContactAt: new Date(),
    },
    {
      customerName: 'Pedro Garcia',
      customerContact: 'p.garcia@email.com',
      details: 'Follow-up on Hilux trade-in appraisal.',
      status: 'completed',
      inquiryType: 'new_vehicle',
      priority: 'low',
      source: 'email',
      unit: 'Hilux 2.4 G 4x2',
      preferredTransaction: 'trade_in',
      completedAt: new Date(),
    },
    {
      customerName: 'Ana Lim',
      customerContact: '0918-555-0198',
      details: 'Asked about Avanza unit availability.',
      status: 'new',
      inquiryType: 'new_vehicle',
      priority: 'critical',
      source: 'physical',
      unit: 'Avanza 1.5 G CVT',
      preferredTransaction: 'cash',
    },
  ];

  for (let i = 0; i < samples.length; i++) {
    const assignee = createdSales[i % createdSales.length];
    await prisma.inquiry.create({
      data: {
        ...samples[i],
        assignedTo: assignee.id,
        createdBy: assignee.id,
      },
    });
  }

  console.log('Seed complete. All accounts use password: Password123!');
  console.log({
    admin: admin.email,
    managers: [manager1.email, manager2.email],
    leaders: [leader1.email, leader2.email],
    sales: createdSales.map((u) => u.email),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
