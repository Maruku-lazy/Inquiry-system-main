const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  WidthType,
  PageOrientation,
} = require('docx');
const { columnsForTab, scopeLabel, TAB_LABELS } = require('./shared');

function headerCell(text) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
    shading: { fill: 'EEF2FF' },
  });
}

function bodyCell(text) {
  return new TableCell({ children: [new Paragraph(String(text ?? ''))] });
}

async function generateDocx(tab, rows, scope) {
  const columns = columnsForTab(tab);

  const headerRow = new TableRow({ children: columns.map((c) => headerCell(c.label)) });
  const bodyRows = rows.length
    ? rows.map((r) => new TableRow({ children: columns.map((c) => bodyCell(r[c.key])) }))
    : [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph('No records in this range.')],
              columnSpan: columns.length,
            }),
          ],
        }),
      ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        children: [
          new Paragraph({ text: `${TAB_LABELS[tab]} Inquiries`, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text: `${scopeLabel(scope)} \u00b7 ${rows.length} record${rows.length === 1 ? '' : 's'} \u00b7 generated ${new Date().toLocaleString('en-PH')}`,
          }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...bodyRows],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateDocx };
