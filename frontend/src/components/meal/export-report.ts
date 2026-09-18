'use client';

// One shared report template so every "Export Report" button across all 5
// modules produces a visually identical, fully-branded document — instead
// of 5 separately hand-rolled HTML strings that could drift out of sync.

let cachedLogoDataUri: string | null = null;

/** Fetches /logo.png and converts it to a data URI, caching the result.
 * A data URI is used instead of a plain <img src="/logo.png"> because a
 * window opened via window.open('', '_blank') + document.write has
 * inconsistent relative-URL resolution across browsers — a data URI
 * always renders regardless of that window's resolved base URL. The
 * sidebar already loads /logo.png on every page, so this fetch resolves
 * from the browser's cache almost instantly in practice. */
async function getLogoDataUri(): Promise<string> {
  if (cachedLogoDataUri !== null) return cachedLogoDataUri;
  try {
    const res = await fetch('/logo.png');
    const blob = await res.blob();
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    cachedLogoDataUri = dataUri;
    return dataUri;
  } catch {
    cachedLogoDataUri = ''; // render without the logo rather than fail the whole export
    return '';
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface ReportKpi { label: string; value: string | number; }
export interface ReportMetaItem { label: string; value: string | number | null | undefined; }
export interface ReportTable { title: string; columns: string[]; rows: (string | number)[][]; }

export interface ReportOptions {
  moduleLabel: string;         // e.g. "Project", "Donor", "Country"
  title: string;               // the record's name
  subtitle?: string;           // description
  note?: string;                // small italic disclaimer, e.g. "manually entered" notes
  metaItems?: ReportMetaItem[];
  kpis?: ReportKpi[];
  tables?: ReportTable[];
}

/** Opens a new window, writes a fully-branded report into it, and triggers
 * the browser's print dialog (the user can "Save as PDF" from there). */
export async function openBrandedReport(options: ReportOptions) {
  const w = window.open('', '_blank');
  if (!w) return;

  const logo = await getLogoDataUri();

  const metaLine = (options.metaItems ?? [])
    .filter(m => m.value !== null && m.value !== undefined && m.value !== '')
    .map(m => `<b>${escapeHtml(m.label)}:</b> ${escapeHtml(String(m.value))}`)
    .join('&nbsp;&nbsp;·&nbsp;&nbsp;');

  const kpiHtml = (options.kpis && options.kpis.length > 0) ? `
    <div class="kpis">
      ${options.kpis.map(k => `<div class="kpi"><b>${escapeHtml(String(k.value))}</b>${escapeHtml(k.label)}</div>`).join('')}
    </div>` : '';

  const tablesHtml = (options.tables ?? []).map(t => `
    <h2>${escapeHtml(t.title)}</h2>
    <table>
      <thead><tr>${t.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
      <tbody>
        ${t.rows.length === 0
          ? `<tr><td colspan="${t.columns.length}" class="empty-row">No data yet.</td></tr>`
          : t.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `).join('');

  const generatedOn = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  w.document.open();
  w.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(options.title)} — SND Africa MEAL Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Source Sans 3', Arial, sans-serif;
    color: #3D1A08;
  }
  .report-header {
    display: flex; align-items: center; gap: 16px;
    background: #1E1004; padding: 20px 32px;
    border-bottom: 4px solid #C8793A;
  }
  .report-header img { height: 44px; width: auto; display: block; }
  .report-header .org-name { font-family: 'Lora', Georgia, serif; font-weight: 700; font-size: 18px; color: #F5E6C8; margin: 0; }
  .report-header .org-sub { font-size: 12px; color: #E8C97A; margin: 2px 0 0; }
  .report-body { padding: 28px 32px; }
  .module-label {
    display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    color: #C8793A; background: #C8793A22; padding: 3px 10px; border-radius: 999px; margin-bottom: 10px;
  }
  h1 { font-family: 'Lora', Georgia, serif; margin: 0 0 6px; color: #3D1A08; font-size: 24px; }
  .subtitle { color: #5A3010; opacity: 0.85; margin: 0 0 8px; max-width: 680px; line-height: 1.4; }
  .meta { font-size: 13px; color: #8B6A4A; margin: 0 0 22px; }
  .note { font-size: 12px; font-style: italic; color: #8B6A4A; margin: 0 0 10px; }
  h2 { font-family: 'Lora', Georgia, serif; margin-top: 30px; border-bottom: 2px solid #C8793A; padding-bottom: 6px; font-size: 16px; color: #3D1A08; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #E8C97A66; padding: 8px 10px; font-size: 13px; text-align: left; }
  th { background: #FBF7F2; color: #5A3010; font-weight: 600; }
  tr:nth-child(even) td { background: #FBF7F2; }
  .empty-row { text-align: center; color: #8B6A4A; padding: 16px !important; }
  .kpis { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 4px; }
  .kpi { border: 1px solid #E8C97A66; border-radius: 10px; padding: 12px 18px; min-width: 110px; background: #fff; }
  .kpi b { font-size: 22px; display: block; color: #C8793A; font-family: 'Lora', Georgia, serif; }
  .report-footer {
    margin-top: 40px; padding: 16px 32px; border-top: 1px solid #E8C97A66;
    font-size: 11px; color: #8B6A4A; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;
  }
  @media print {
    @page { margin: 0.4in; }
    .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="report-header">
    ${logo ? `<img src="${logo}" alt="SND Africa" />` : ''}
    <div>
      <p class="org-name">SND Africa</p>
      <p class="org-sub">Monitoring, Evaluation, Accountability and Learning</p>
    </div>
  </div>
  <div class="report-body">
    <span class="module-label">${escapeHtml(options.moduleLabel)}</span>
    <h1>${escapeHtml(options.title)}</h1>
    ${options.subtitle ? `<p class="subtitle">${escapeHtml(options.subtitle)}</p>` : ''}
    ${options.note ? `<p class="note">${escapeHtml(options.note)}</p>` : ''}
    ${metaLine ? `<p class="meta">${metaLine}</p>` : ''}
    ${kpiHtml}
    ${tablesHtml}
  </div>
  <div class="report-footer">
    <span>Confronting crisis&nbsp;·&nbsp;Building Resilience&nbsp;·&nbsp;Transforming lives</span>
    <span>Generated ${generatedOn} &middot; SND Africa MEAL Portal</span>
  </div>
</body>
</html>`);
  w.document.close();
  w.focus();
  // Small delay so the logo/fonts have a moment to render before the print dialog opens.
  setTimeout(() => { try { w.print(); } catch { /* window may have been closed by the user already */ } }, 350);
}
