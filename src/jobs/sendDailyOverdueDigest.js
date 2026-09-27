const cron = require('node-cron');
const prisma = require('../config/db');
const { sendMail } = require('../utils/mailer');
const { isOverdue, computeOverdueCutoffForQuery } = require('../utils/overdue');

function shortId(id) {
  return `INQ-${id.slice(0, 4).toUpperCase()}`;
}

function daysSince(date, now) {
  return Math.floor((now.getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}

function escapeHtml(str) {
  return String(str ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}

function buildDigestHtml(agent, items, now) {
  const rows = items
    .map(
      (i) =>
        `<tr>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #eee;">${shortId(i.id)}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(i.customerName)}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #eee;">${daysSince(i.updatedAt, now)} days</td>` +
        `</tr>`,
    )
    .join('');

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <h2 style="margin:0 0 4px;">Hi ${escapeHtml(agent.name)},</h2>
    <p style="margin:0 0 16px;color:#475569;">
      You have <strong>${items.length}</strong> inquir${items.length === 1 ? 'y' : 'ies'} with no update
      in 3+ days. A quick follow-up would help close ${items.length === 1 ? 'it' : 'these'} out.
    </p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #e2e8f0;">ID</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #e2e8f0;">Customer</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #e2e8f0;">Overdue by</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;">Sent automatically by InquireOS — Toyota Albay.</p>
  </div>`;
}

function buildDigestText(agent, items, now) {
  const lines = items.map(
    (i) => `- ${shortId(i.id)}  ${i.customerName}  (${daysSince(i.updatedAt, now)} days overdue)`,
  );
  return `Hi ${agent.name},\n\nYou have ${items.length} inquiry(ies) with no update in 3+ days:\n\n${lines.join('\n')}\n\n— InquireOS`;
}

// Every day at 5:00 AM local server time: emails every Marketing/Sales
// agent a digest of THEIR OWN overdue (3+ days, still active) inquiries.
// Scoped to the 'sales' role only, per Phase 3 spec — overdue notifications
// are marketing-only (unlike the critical/follow-up desktop alerts, which
// fire for whoever's actually assigned regardless of role — see
// controllers/inquiries.controller.js's getLoginAlerts).
async function sendOverdueDigests() {
  const now = new Date();
  const cutoff = computeOverdueCutoffForQuery(now);

  const salesAgents = await prisma.user.findMany({
    where: { role: 'sales', isActive: true, deletedAt: null },
    select: { id: true, name: true, email: true },
  });

  for (const agent of salesAgents) {
    const candidates = await prisma.inquiry.findMany({
      where: {
        assignedTo: agent.id,
        status: { in: ['new', 'ongoing'] },
        deletedAt: null,
        updatedAt: { lt: cutoff },
      },
      orderBy: { updatedAt: 'asc' },
      select: { id: true, customerName: true, updatedAt: true, status: true },
    });

    // The cutoff query can over-select by up to a day at the boundary (see
    // the comment on computeOverdueCutoffForQuery) — re-confirm each row
    // with the precise per-row check before including it.
    const confirmed = candidates.filter((inq) => isOverdue(inq, now));
    if (confirmed.length === 0) continue;

    try {
      await sendMail({
        to: agent.email,
        subject: `${confirmed.length} overdue inquir${confirmed.length === 1 ? 'y' : 'ies'} need your attention`,
        html: buildDigestHtml(agent, confirmed, now),
        text: buildDigestText(agent, confirmed, now),
      });
      console.log(`[overdue-digest] sent ${confirmed.length} item(s) to ${agent.email}`);
    } catch (err) {
      // One agent's send failing (e.g. bad address, provider hiccup)
      // shouldn't stop everyone else's digest from going out.
      console.error(`[overdue-digest] failed to email ${agent.email}:`, err.message);
    }
  }
}

// Runs every day at 5:00 AM local server time. Unlike the activity-log
// purge job, this deliberately does NOT also run once at startup — an
// unplanned server restart shouldn't blast out an extra digest at a
// random time of day.
function startOverdueDigestJob() {
  cron.schedule('0 5 * * *', () => {
    sendOverdueDigests().catch((err) => console.error('[overdue-digest] scheduled run failed:', err));
  });
}

module.exports = { startOverdueDigestJob, sendOverdueDigests };
