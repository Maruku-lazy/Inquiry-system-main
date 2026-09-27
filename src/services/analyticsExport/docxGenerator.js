const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } = require('docx');
const { scopeLabel } = require('./shared');

function headerCell(text) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
    shading: { fill: 'EEF2FF' },
  });
}

function bodyCell(text) {
  return new TableCell({ children: [new Paragraph(String(text ?? ''))] });
}

async function generateAnalyticsDocx(analytics) {
  const s = analytics.summary;

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('Metric'), headerCell('Value')] }),
      new TableRow({ children: [bodyCell('Total'), bodyCell(s.total)] }),
      new TableRow({ children: [bodyCell('New'), bodyCell(s.new)] }),
      new TableRow({ children: [bodyCell('In Progress'), bodyCell(s.ongoing)] }),
      new TableRow({ children: [bodyCell('Resolved'), bodyCell(s.completed)] }),
      new TableRow({ children: [bodyCell('Critical Open'), bodyCell(analytics.criticalCount ?? 0)] }),
      new TableRow({ children: [bodyCell('Completion Rate'), bodyCell(`${s.completionRate}%`)] }),
    ],
  });

  const monthlyData = analytics.month
    ? analytics.monthly.filter((m) => m.month === analytics.month)
    : analytics.monthly;

  const monthlyTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [headerCell('Month'), headerCell('New'), headerCell('In Progress'), headerCell('Resolved'), headerCell('Total')],
      }),
      ...monthlyData.map(
        (m) =>
          new TableRow({
            children: [bodyCell(m.label), bodyCell(m.new), bodyCell(m.ongoing), bodyCell(m.completed), bodyCell(m.total)],
          }),
      ),
    ],
  });

  const weeklyRows = (analytics.weekly || []).map((w) => {
    const rate = w.total > 0 ? `${Math.round((w.resolved / w.total) * 100)}%` : '0%';
    return new TableRow({
      children: [bodyCell(w.week), bodyCell(w.total), bodyCell(w.resolved), bodyCell(rate)],
    });
  });

  const weeklyTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [headerCell('Week'), headerCell('Total Inquiries'), headerCell('Resolved'), headerCell('Resolution Rate')],
      }),
      ...weeklyRows,
    ],
  });

  const sourceRows = analytics.sources.length
    ? analytics.sources.map((s2) => new TableRow({ children: [bodyCell(s2.label), bodyCell(s2.total)] }))
    : [new TableRow({ children: [bodyCell('No source data in this range.'), bodyCell('')] })];

  const sourcesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [headerCell('Source'), headerCell('Total')] }), ...sourceRows],
  });

  const children = [
    new Paragraph({ text: 'Analytics', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `${scopeLabel(analytics)} · generated ${new Date().toLocaleString('en-PH')}` }),
    new Paragraph({ text: '' }),
    new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2 }),
    summaryTable,
    new Paragraph({ text: '' }),
    new Paragraph({ text: 'Monthly Activity', heading: HeadingLevel.HEADING_2 }),
    monthlyTable,
    new Paragraph({ text: '' }),
    new Paragraph({ text: 'Weekly Volume', heading: HeadingLevel.HEADING_2 }),
    weeklyTable,
    new Paragraph({ text: '' }),
    new Paragraph({ text: 'Inquiries by Source', heading: HeadingLevel.HEADING_2 }),
    sourcesTable,
  ];

  if (analytics.leaders && analytics.leaders.length > 0) {
    const leaderRows = analytics.leaders.map(
      (l) =>
        new TableRow({
          children: [
            bodyCell(l.detail.name),
            bodyCell(l.detail.teamName),
            bodyCell(l.detail.specialistsCount),
            bodyCell(l.total),
            bodyCell(l.new),
            bodyCell(l.active),
            bodyCell(l.pending),
            bodyCell(l.done),
            bodyCell(l.resRate),
          ],
        }),
    );

    const leadersTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell('Leader'),
            headerCell('Team'),
            headerCell('Specialists'),
            headerCell('Total'),
            headerCell('New'),
            headerCell('Active'),
            headerCell('Pending'),
            headerCell('Done'),
            headerCell('Res. Rate'),
          ],
        }),
        ...leaderRows,
      ],
    });

    children.push(
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'Team Leaders Statistics', heading: HeadingLevel.HEADING_2 }),
      leadersTable,
    );
  }

  if (analytics.role !== 'sales' && analytics.specialists && analytics.specialists.length > 0) {
    const specRows = analytics.specialists.map(
      (sp) =>
        new TableRow({
          children: [
            bodyCell(sp.name),
            bodyCell(sp.team),
            bodyCell(sp.leader),
            bodyCell(sp.total),
            bodyCell(sp.new),
            bodyCell(sp.inProgress),
            bodyCell(sp.pending),
            bodyCell(sp.resolved),
            bodyCell(`${sp.rate}%`),
          ],
        }),
    );

    const specialistsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell('Specialist'),
            headerCell('Team'),
            headerCell('Leader'),
            headerCell('Total'),
            headerCell('New'),
            headerCell('In Progress'),
            headerCell('Pending'),
            headerCell('Resolved'),
            headerCell('Rate'),
          ],
        }),
        ...specRows,
      ],
    });

    children.push(
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'Specialists Breakdown', heading: HeadingLevel.HEADING_2 }),
      specialistsTable,
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateAnalyticsDocx };
