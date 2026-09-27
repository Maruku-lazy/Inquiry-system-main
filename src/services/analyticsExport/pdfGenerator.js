const puppeteer = require('puppeteer');
const { scopeLabel } = require('./shared');

function escapeHtml(str) {
  return String(str ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}

function buildHtml(analytics) {
  const s = analytics.summary;

  const statCards = [
    ['Total', s.total],
    ['New', s.new],
    ['In Progress', s.ongoing],
    ['Resolved', s.completed],
    ['Critical Open', analytics.criticalCount ?? 0],
    ['Completion Rate', `${s.completionRate}%`],
  ]
    .map(([label, value]) => `<div class="stat"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(value)}</div></div>`)
    .join('');

  const monthlyData = analytics.month
    ? analytics.monthly.filter((m) => m.month === analytics.month)
    : analytics.monthly;

  const monthlyRows = monthlyData
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.label)}</td><td>${m.new}</td><td>${m.ongoing}</td><td>${m.completed}</td><td>${m.total}</td></tr>`,
    )
    .join('');

  const weeklyRows = (analytics.weekly || [])
    .map((w) => {
      const rate = w.total > 0 ? `${Math.round((w.resolved / w.total) * 100)}%` : '0%';
      return `<tr><td>${escapeHtml(w.week)}</td><td>${w.total}</td><td>${w.resolved}</td><td>${rate}</td></tr>`;
    })
    .join('');

  const sourceRows = analytics.sources.length
    ? analytics.sources
        .map((s2) => `<tr><td>${escapeHtml(s2.label)}</td><td>${s2.total}</td></tr>`)
        .join('')
    : `<tr><td colspan="2" style="text-align:center;color:#94a3b8;">No source data in this range.</td></tr>`;

  let leadersHtml = '';
  if (analytics.leaders && analytics.leaders.length > 0) {
    const leaderRows = analytics.leaders
      .map(
        (l) =>
          `<tr><td>${escapeHtml(l.detail.name)}</td><td>${escapeHtml(l.detail.teamName)}</td><td>${l.detail.specialistsCount}</td><td>${l.total}</td><td>${l.new}</td><td>${l.active}</td><td>${l.pending}</td><td>${l.done}</td><td>${escapeHtml(l.resRate)}</td></tr>`,
      )
      .join('');

    leadersHtml = `
      <h2>Team Leaders Statistics</h2>
      <table>
        <thead><tr><th>Leader</th><th>Team</th><th>Specialists</th><th>Total</th><th>New</th><th>Active</th><th>Pending</th><th>Done</th><th>Res. Rate</th></tr></thead>
        <tbody>${leaderRows}</tbody>
      </table>
    `;
  }

  let specialistsHtml = '';
  if (analytics.role !== 'sales' && analytics.specialists && analytics.specialists.length > 0) {
    const specRows = analytics.specialists
      .map(
        (sp) =>
          `<tr><td>${escapeHtml(sp.name)}</td><td>${escapeHtml(sp.team)}</td><td>${escapeHtml(sp.leader)}</td><td>${sp.total}</td><td>${sp.new}</td><td>${sp.inProgress}</td><td>${sp.pending}</td><td>${sp.resolved}</td><td>${sp.rate}%</td></tr>`,
      )
      .join('');

    specialistsHtml = `
      <h2>Specialists Breakdown</h2>
      <table>
        <thead><tr><th>Specialist</th><th>Team</th><th>Leader</th><th>Total</th><th>New</th><th>In Progress</th><th>Pending</th><th>Resolved</th><th>Rate</th></tr></thead>
        <tbody>${specRows}</tbody>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica', Arial, sans-serif; color: #0f172a; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 22px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  .subtitle { font-size: 11px; color: #64748b; margin: 0 0 18px; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; }
  .stat { flex: 1 1 110px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  .stat-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  th { background: #eef2ff; font-weight: 600; }
  tr:nth-child(even) td { background: #f8fafc; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
</style>
</head>
<body>
  <h1>Analytics</h1>
  <p class="subtitle">${escapeHtml(scopeLabel(analytics))} &middot; generated ${escapeHtml(new Date().toLocaleString('en-PH'))}</p>

  <div class="stats">${statCards}</div>

  <h2>Monthly Activity</h2>
  <table>
    <thead><tr><th>Month</th><th>New</th><th>In Progress</th><th>Resolved</th><th>Total</th></tr></thead>
    <tbody>${monthlyRows}</tbody>
  </table>

  ${weeklyRows ? `
  <h2>Weekly Volume</h2>
  <table>
    <thead><tr><th>Week</th><th>Total Inquiries</th><th>Resolved</th><th>Resolution Rate</th></tr></thead>
    <tbody>${weeklyRows}</tbody>
  </table>
  ` : ''}

  <h2>Inquiries by Source</h2>
  <table>
    <thead><tr><th>Source</th><th>Total</th></tr></thead>
    <tbody>${sourceRows}</tbody>
  </table>

  ${leadersHtml}
  ${specialistsHtml}
</body>
</html>`;
}

async function generateAnalyticsPdf(analytics) {
  const html = buildHtml(analytics);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBytes = await page.pdf({
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
      timeout: 30000,
    });

    const buffer = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);
    if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error(`Puppeteer produced ${buffer.length} bytes that do not look like a valid PDF.`);
    }
    return buffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generateAnalyticsPdf };
