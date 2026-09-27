// PDF generation. Puppeteer is the default engine — it renders the same
// HTML/CSS the rest of the app already uses, so styling stays consistent
// with very little extra code (one template, no manual coordinate math).
//
// TO SWITCH ENGINES LATER (e.g. to pdfkit, if Puppeteer's Chromium
// dependency turns out too heavy for the deployment target): write a
// sibling file — e.g. pdfGeneratorPdfkit.js — exporting an async
// `generatePdf(tab, rows, scope)` with this exact same signature that
// resolves to a PDF Buffer, then change the single require() at the
// bottom of index.js from './pdfGenerator' to that file. Nothing else in
// the export pipeline (controller, shared.js, the other two generators)
// needs to change.
const puppeteer = require('puppeteer');
const { columnsForTab, columnWidthPercentages, scopeLabel, TAB_LABELS } = require('./shared');

function escapeHtml(str) {
  return String(str ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}

function buildHtml(tab, rows, scope) {
  const columns = columnsForTab(tab);
  const widths = columnWidthPercentages(columns);

  // A fixed table-layout with an explicit <colgroup> is the fix for
  // "mismatched/missing" PDF data: without it, the browser auto-sizes
  // columns by content, so a long "Details" cell can squeeze every other
  // column down to a sliver — values then look shifted, overlapping, or
  // cut off, even though every field was actually exported correctly
  // (the same underlying row data renders fine in Excel/Word, which don't
  // have to fit a fixed page width). Fixed widths guarantee the header
  // and every row's cells stay aligned to the same column boundaries no
  // matter how long any individual value is.
  const colgroup = widths.map((w) => `<col style="width:${w.toFixed(3)}%;" />`).join('');
  const headerRow = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const bodyRows = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${escapeHtml(r[c.key])}</td>`).join('')}</tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica', Arial, sans-serif; color: #0f172a; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .subtitle { font-size: 11px; color: #64748b; margin: 0 0 16px; }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 8px; }
  th, td {
    border: 1px solid #e2e8f0;
    padding: 4px 5px;
    text-align: left;
    vertical-align: top;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  th { background: #eef2ff; font-weight: 600; }
  tr:nth-child(even) td { background: #f8fafc; }
  /* THE CONFIRMED FIX for "mismatched/lacking" data on multi-page exports:
     without this, Chromium's print engine can slice a table row in half
     across a page boundary — a cell's text gets torn apart (e.g. "Hiace
     Commut" ends up on one page and "er Deluxe" on the next, with the
     repeated header sandwiched in between). Keeping each row atomic means
     a row that doesn't fully fit just moves to the next page whole. */
  tr { break-inside: avoid; page-break-inside: avoid; }
  /* thead is display:table-header-group by default (which is why the
     header already repeats on every page) — kept explicit for clarity. */
  thead { display: table-header-group; }
</style>
</head>
<body>
  <h1>${escapeHtml(TAB_LABELS[tab])} Inquiries</h1>
  <p class="subtitle">
    ${escapeHtml(scopeLabel(scope))} &middot; ${rows.length} record${rows.length === 1 ? '' : 's'}
    &middot; generated ${escapeHtml(new Date().toLocaleString('en-PH'))}
  </p>
  <table>
    <colgroup>${colgroup}</colgroup>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows || `<tr><td colspan="${columns.length}" style="text-align:center;color:#94a3b8;">No records in this range.</td></tr>`}</tbody>
  </table>
</body>
</html>`;
}

async function generatePdf(tab, rows, scope) {
  const html = buildHtml(tab, rows, scope);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // The single most common cause of a PDF export that "downloads but
        // won't open": Chromium's default shared-memory area is only 64MB
        // in most Docker/containerized environments. Rendering a wide
        // table can exceed that and crash the tab mid-render, which can
        // leave page.pdf() resolving with a truncated/corrupt buffer
        // instead of cleanly throwing. Forcing Chromium onto disk-backed
        // temp storage instead of /dev/shm avoids that crash entirely.
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  } catch (err) {
    // Chromium not installed / failed to download during `npm install`,
    // or missing OS-level shared libraries it needs to launch at all.
    // Surface this as a clear, actionable error rather than an opaque
    // "Failed to launch the browser process" stack trace — the fix is
    // almost always re-running `npm install` (Puppeteer downloads its own
    // Chromium build) or installing the OS packages Chromium needs.
    const wrapped = new Error(
      'PDF export failed to start a headless browser. This usually means ' +
        "Puppeteer's bundled Chromium didn't finish downloading during " +
        '`npm install`, or the OS is missing shared libraries Chromium ' +
        'needs (common on minimal Docker images — see ' +
        'https://pptr.dev/troubleshooting for the OS package list). ' +
        `Original error: ${err.message}`,
    );
    wrapped.status = 500;
    wrapped.expose = true;
    throw wrapped;
  }

  try {
    const page = await browser.newPage();
    // 'networkidle0' (vs 'load') waits for the page to fully settle before
    // printing — 'load' can fire while fonts/layout are still resolving,
    // which is another way to end up with a malformed render.
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfBytes = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '10mm', right: '10mm' },
      timeout: 30000,
    });

    // Newer Puppeteer versions resolve page.pdf() with a plain Uint8Array
    // rather than a Node Buffer, and on some Puppeteer/Chromium version
    // combinations it resolves with the raw base64 STRING that Chrome's
    // underlying printToPDF command returns internally, never decoded to
    // binary. (Telltale sign: a byte count ~4/3 the size of a real PDF,
    // and a payload that's all printable base64 characters.) Handle both.
    let buffer;
    if (typeof pdfBytes === 'string') {
      buffer = Buffer.from(pdfBytes, 'base64');
    } else if (Buffer.isBuffer(pdfBytes)) {
      buffer = pdfBytes;
    } else {
      buffer = Buffer.from(pdfBytes);
    }

    // Belt-and-suspenders: never let a corrupt/truncated buffer go out as
    // if it were a valid file. Every real PDF starts with this 5-byte
    // magic number — if it's missing, something crashed silently instead
    // of throwing, and the person would otherwise get a file their PDF
    // reader can't open with no indication of why.
    if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error(
        `Puppeteer produced ${buffer.length} bytes that do not look like a valid PDF (rendering likely crashed mid-page).`,
      );
    }

    return buffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generatePdf };
