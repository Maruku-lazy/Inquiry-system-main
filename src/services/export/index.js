const { generateExcel } = require('./excelGenerator');
const { generatePdf } = require('./pdfGenerator');
const { generateDocx } = require('./docxGenerator');
const { buildExportRows, buildFilename } = require('./shared');

// Single entry point every export format goes through. Swapping the PDF
// engine (see the comment at the top of pdfGenerator.js) only ever touches
// that one file — this dispatcher and its caller (the controller) never
// need to change.
async function generateExport({ format, tab, items, scope }) {
  const rows = buildExportRows(items);
  const filename = buildFilename(tab, format, scope);

  if (format === 'xlsx') {
    return {
      buffer: await generateExcel(tab, rows),
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
  if (format === 'pdf') {
    return {
      buffer: await generatePdf(tab, rows, scope),
      filename,
      contentType: 'application/pdf',
    };
  }
  if (format === 'docx') {
    return {
      buffer: await generateDocx(tab, rows, scope),
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  throw new Error(`Unsupported export format: ${format}`);
}

module.exports = { generateExport };
