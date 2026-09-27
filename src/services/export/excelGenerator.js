const ExcelJS = require('exceljs');
const { columnsForTab, TAB_LABELS } = require('./shared');

async function generateExcel(tab, rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Toyota Albay Inquiry Tracker';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`${TAB_LABELS[tab]} Inquiries`);
  const columns = columnsForTab(tab);

  sheet.columns = columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: c.key === 'details' ? 42 : 18,
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow(row).alignment = { vertical: 'top', wrapText: false };
  }

  return workbook.xlsx.writeBuffer();
}

module.exports = { generateExcel };
