const ExcelJS = require('exceljs');
const { scopeLabel } = require('./shared');

function styleHeaderRow(row) {
  row.font = { bold: true };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
}

async function generateAnalyticsExcel(analytics) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Toyota Albay Inquiry Tracker';
  workbook.created = new Date();

  // 1. Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 24 },
    { header: 'Value', key: 'value', width: 18 },
  ];
  styleHeaderRow(summarySheet.getRow(1));
  summarySheet.addRows([
    { metric: 'Scope', value: scopeLabel(analytics) },
    { metric: 'Total Inquiries', value: analytics.summary.total },
    { metric: 'New', value: analytics.summary.new },
    { metric: 'In Progress', value: analytics.summary.ongoing },
    { metric: 'Resolved', value: analytics.summary.completed },
    { metric: 'Critical Open', value: analytics.criticalCount ?? 0 },
    { metric: 'Completion Rate', value: `${analytics.summary.completionRate}%` },
  ]);

  // 2. Monthly Activity Sheet (filtered to selected month if month is set)
  const monthlyData = analytics.month
    ? analytics.monthly.filter((m) => m.month === analytics.month)
    : analytics.monthly;

  const monthlySheet = workbook.addWorksheet('Monthly Activity');
  monthlySheet.columns = [
    { header: 'Month', key: 'label', width: 14 },
    { header: 'New', key: 'new', width: 12 },
    { header: 'In Progress', key: 'ongoing', width: 14 },
    { header: 'Resolved', key: 'completed', width: 12 },
    { header: 'Total', key: 'total', width: 12 },
  ];
  styleHeaderRow(monthlySheet.getRow(1));
  monthlySheet.addRows(monthlyData);

  // 3. Weekly Volume Sheet
  if (analytics.weekly && analytics.weekly.length > 0) {
    const weeklySheet = workbook.addWorksheet('Weekly Volume');
    weeklySheet.columns = [
      { header: 'Week', key: 'week', width: 14 },
      { header: 'Total Inquiries', key: 'total', width: 16 },
      { header: 'Resolved', key: 'resolved', width: 14 },
      { header: 'Resolution Rate', key: 'rate', width: 16 },
    ];
    styleHeaderRow(weeklySheet.getRow(1));
    weeklySheet.addRows(
      analytics.weekly.map((w) => ({
        week: w.week,
        total: w.total,
        resolved: w.resolved,
        rate: w.total > 0 ? `${Math.round((w.resolved / w.total) * 100)}%` : '0%',
      }))
    );
  }

  // 4. Sources Sheet
  const sourcesSheet = workbook.addWorksheet('Sources');
  sourcesSheet.columns = [
    { header: 'Source', key: 'label', width: 20 },
    { header: 'Total', key: 'total', width: 12 },
  ];
  styleHeaderRow(sourcesSheet.getRow(1));
  sourcesSheet.addRows(analytics.sources);

  // 5. Team Leaders Statistics (for Managers / Admins / Leaders)
  if (analytics.leaders && analytics.leaders.length > 0) {
    const leadersSheet = workbook.addWorksheet('Team Leaders');
    leadersSheet.columns = [
      { header: 'Leader Name', key: 'name', width: 22 },
      { header: 'Team', key: 'teamName', width: 24 },
      { header: 'Specialists', key: 'specialistsCount', width: 14 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'New', key: 'new', width: 10 },
      { header: 'Active', key: 'active', width: 12 },
      { header: 'Pending', key: 'pending', width: 10 },
      { header: 'Done', key: 'done', width: 10 },
      { header: 'Resolution Rate', key: 'resRate', width: 16 },
    ];
    styleHeaderRow(leadersSheet.getRow(1));
    leadersSheet.addRows(
      analytics.leaders.map((l) => ({
        name: l.detail.name,
        teamName: l.detail.teamName,
        specialistsCount: l.detail.specialistsCount,
        total: l.total,
        new: l.new,
        active: l.active,
        pending: l.pending,
        done: l.done,
        resRate: l.resRate,
      }))
    );
  }

  // 6. Specialists Breakdown (for non-sales viewers)
  if (analytics.role !== 'sales' && analytics.specialists && analytics.specialists.length > 0) {
    const specSheet = workbook.addWorksheet('Specialists Breakdown');
    specSheet.columns = [
      { header: 'Specialist Name', key: 'name', width: 22 },
      { header: 'Team', key: 'team', width: 24 },
      { header: 'Leader', key: 'leader', width: 20 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'New', key: 'new', width: 10 },
      { header: 'In Progress', key: 'inProgress', width: 14 },
      { header: 'Pending', key: 'pending', width: 10 },
      { header: 'Resolved', key: 'resolved', width: 12 },
      { header: 'Resolution Rate', key: 'rate', width: 16 },
    ];
    styleHeaderRow(specSheet.getRow(1));
    specSheet.addRows(
      analytics.specialists.map((s) => ({
        name: s.name,
        team: s.team,
        leader: s.leader,
        total: s.total,
        new: s.new,
        inProgress: s.inProgress,
        pending: s.pending,
        resolved: s.resolved,
        rate: `${s.rate}%`,
      }))
    );
  }

  return workbook.xlsx.writeBuffer();
}

module.exports = { generateAnalyticsExcel };
