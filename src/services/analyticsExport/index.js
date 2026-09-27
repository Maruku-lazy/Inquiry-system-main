const { generateAnalyticsExcel } = require('./excelGenerator');
const { generateAnalyticsPdf } = require('./pdfGenerator');
const { generateAnalyticsDocx } = require('./docxGenerator');
const { buildFilename } = require('./shared');

async function generateAnalyticsExport(format, analytics) {
  const filename = buildFilename(analytics, format);

  if (format === 'xlsx') {
    return {
      buffer: await generateAnalyticsExcel(analytics),
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
  if (format === 'pdf') {
    return { buffer: await generateAnalyticsPdf(analytics), filename, contentType: 'application/pdf' };
  }
  if (format === 'docx') {
    return {
      buffer: await generateAnalyticsDocx(analytics),
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  throw new Error(`Unsupported export format: ${format}`);
}

module.exports = { generateAnalyticsExport };
