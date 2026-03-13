import { formatMeasurement } from './measurements';
import { formatLengthDisplay } from './units';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fmt(inchesValue, measurementSystem) {
  return formatLengthDisplay(formatMeasurement(Number(inchesValue) || 0), measurementSystem);
}

function rowHtml(item, measurementSystem) {
  const partId = item.part === 'Rail'
    ? 'A'
    : item.part === 'Stile'
      ? 'B'
      : item.part === 'Vertical Rail'
        ? 'D'
        : item.part === 'Slab'
          ? 'A'
          : 'C';

  return `<tr>
    <td>${escapeHtml(partId)}</td>
    <td>${escapeHtml(item.part)}</td>
    <td>${escapeHtml(item.qty)}</td>
    <td>${escapeHtml(fmt(item.thickness, measurementSystem))}</td>
    <td>${escapeHtml(fmt(item.width, measurementSystem))}</td>
    <td>${escapeHtml(fmt(item.length, measurementSystem))}</td>
  </tr>`;
}

function doorCountNote(report) {
  const qty = Number(report?.qty) || 0;
  if (report?.overlayType === 'drawer-front') {
    return `Creates ${qty} drawer front${qty === 1 ? '' : 's'}`;
  }
  if (report?.doorType === 'butt') {
    return `Creates ${qty} set${qty === 1 ? '' : 's'} of double doors`;
  }
  return `Creates ${qty} door${qty === 1 ? '' : 's'}`;
}

function formatSlabGrain(value) {
  if (value === 'vertical') {
    return 'Vertical';
  }
  if (value === 'horizontal') {
    return 'Horizontal';
  }
  return 'MDF';
}

function diagramWidthLabel(report, measurementSystem) {
  if (report?.doorType === 'butt' && Number(report?.leafWidth) > 0) {
    return fmt(report.leafWidth, measurementSystem);
  }

  const finished = String(report?.finished || '');
  const [widthPart] = finished.split(' x ');
  return widthPart || '';
}

function diagramHeightLabel(report) {
  const finished = String(report?.finished || '');
  const [, heightPart] = finished.split(' x ');
  return heightPart || '';
}

function getFrameLengthLabel(items, measurementSystem) {
  if (!items.length) {
    return '';
  }

  const totalFeet = items.reduce((sum, item) => {
    const length = Number(item.length) || 0;
    const qty = Number(item.qty) || 0;
    return sum + (length * qty) / 12;
  }, 0);

  if (measurementSystem === 'metric') {
    return `Total Length: ${(totalFeet * 0.3048).toFixed(2)} m`;
  }
  return `Linear Feet: ${totalFeet.toFixed(2)}`;
}

function getAreaLabel(items, measurementSystem) {
  if (!items.length) {
    return '';
  }

  const totalSquareFeet = items.reduce((sum, item) => {
    const width = Number(item.width) || 0;
    const length = Number(item.length) || 0;
    const qty = Number(item.qty) || 0;
    return sum + ((width * length) / 144) * qty;
  }, 0);

  if (measurementSystem === 'metric') {
    return `Total Area: ${(totalSquareFeet * 0.092903).toFixed(2)} m^2`;
  }
  return `Square Feet: ${totalSquareFeet.toFixed(2)}`;
}

function drawerFrontPositionLabel(value) {
  if (value === 'middle') {
    return 'Middle';
  }
  if (value === 'bottom') {
    return 'Bottom';
  }
  return 'Top';
}

export async function printQuickDoorSheet({ report, measurementSystem = 'imperial' }) {
  const items = report?.items || [];
  if (!items.length) {
    return false;
  }

  const frameItems = items.filter((item) => item.part === 'Stile' || item.part === 'Rail' || item.part === 'Vertical Rail');
  const panelItems = items.filter((item) => item.part === 'Panel');
  const slabItems = items.filter((item) => item.part === 'Slab');
  const slabGrainLabel = slabItems.length > 0 ? formatSlabGrain(slabItems[0].slabGrain) : '';

  const frameRows = frameItems.map((item) => rowHtml(item, measurementSystem)).join('');
  const panelRows = panelItems.map((item) => rowHtml(item, measurementSystem)).join('');
  const slabRows = slabItems.map((item) => rowHtml(item, measurementSystem)).join('');
  const frameLengthLabel = getFrameLengthLabel(frameItems, measurementSystem);
  const panelAreaLabel = getAreaLabel(panelItems, measurementSystem);
  const slabAreaLabel = getAreaLabel(slabItems, measurementSystem);
  const widthLabel = diagramWidthLabel(report, measurementSystem);
  const heightLabel = diagramHeightLabel(report);

  const isDrawerFront = report?.overlayType === 'drawer-front';

  const diagram = isDrawerFront
    ? report?.isSlab
      ? `<svg viewBox="0 0 240 320" width="100%" height="300" role="img" aria-label="Drawer front diagram">
          <rect x="10" y="90" width="180" height="100" fill="#f8fafc" stroke="#111" stroke-width="1.5" />
          <text x="100" y="146" text-anchor="middle" font-size="16" font-family="Segoe UI">A</text>
          <text x="100" y="212" text-anchor="middle" font-size="12" font-family="Segoe UI">${escapeHtml(widthLabel)}</text>
          <text x="206" y="140" text-anchor="middle" font-size="12" font-family="Segoe UI" transform="rotate(90 206 140)">${escapeHtml(heightLabel)}</text>
        </svg>`
      : `<svg viewBox="0 0 240 320" width="100%" height="300" role="img" aria-label="Drawer front diagram">
          <g fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="10" y="90" width="180" height="100" />
            <rect x="50" y="115" width="100" height="50" />
            <line x1="50" y1="90" x2="50" y2="115" />
            <line x1="150" y1="90" x2="150" y2="115" />
            <line x1="50" y1="165" x2="50" y2="190" />
            <line x1="150" y1="165" x2="150" y2="190" />
          </g>
          <text x="100" y="107" text-anchor="middle" font-size="14" font-family="Segoe UI">A</text>
          <text x="100" y="182" text-anchor="middle" font-size="14" font-family="Segoe UI">A</text>
          <text x="39" y="144" text-anchor="middle" font-size="14" font-family="Segoe UI">B</text>
          <text x="161" y="144" text-anchor="middle" font-size="14" font-family="Segoe UI">B</text>
          <text x="100" y="146" text-anchor="middle" font-size="16" font-family="Segoe UI">C</text>
          <text x="100" y="212" text-anchor="middle" font-size="12" font-family="Segoe UI">${escapeHtml(widthLabel)}</text>
          <text x="206" y="140" text-anchor="middle" font-size="12" font-family="Segoe UI" transform="rotate(90 206 140)">${escapeHtml(heightLabel)}</text>
        </svg>`
    : report?.isSlab
    ? `<svg viewBox="0 0 220 320" width="100%" height="300" role="img" aria-label="Door diagram">
        <rect x="30" y="20" width="160" height="260" fill="#f8fafc" stroke="#111" stroke-width="1.5" />
        <text x="110" y="155" text-anchor="middle" font-size="16" font-family="Segoe UI">A</text>
        <text x="110" y="308" text-anchor="middle" font-size="12" font-family="Segoe UI">${escapeHtml(widthLabel)}</text>
        <text x="208" y="150" text-anchor="middle" font-size="12" font-family="Segoe UI" transform="rotate(90 208 150)">${escapeHtml(heightLabel)}</text>
      </svg>`
    : report?.panelLayout === 'two-panel-vertical'
      ? `<svg viewBox="0 0 220 320" width="100%" height="300" role="img" aria-label="Door diagram">
          <g fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="30" y="20" width="160" height="260" />
            <rect x="66" y="57" width="88" height="72" />
            <rect x="66" y="171" width="88" height="72" />
            <line x1="66" y1="20" x2="66" y2="57" />
            <line x1="154" y1="20" x2="154" y2="57" />
            <line x1="66" y1="129" x2="66" y2="171" />
            <line x1="154" y1="129" x2="154" y2="171" />
            <line x1="66" y1="243" x2="66" y2="280" />
            <line x1="154" y1="243" x2="154" y2="280" />
          </g>
          <text x="110" y="42" text-anchor="middle" font-size="14" font-family="Segoe UI">A</text>
          <text x="110" y="155" text-anchor="middle" font-size="14" font-family="Segoe UI">A</text>
          <text x="110" y="268" text-anchor="middle" font-size="14" font-family="Segoe UI">A</text>
          <text x="48" y="156" text-anchor="middle" font-size="14" font-family="Segoe UI">B</text>
          <text x="172" y="156" text-anchor="middle" font-size="14" font-family="Segoe UI">B</text>
          <text x="110" y="94" text-anchor="middle" font-size="16" font-family="Segoe UI">C</text>
          <text x="110" y="207" text-anchor="middle" font-size="16" font-family="Segoe UI">C</text>
          <text x="110" y="308" text-anchor="middle" font-size="12" font-family="Segoe UI">${escapeHtml(widthLabel)}</text>
          <text x="208" y="150" text-anchor="middle" font-size="12" font-family="Segoe UI" transform="rotate(90 208 150)">${escapeHtml(heightLabel)}</text>
        </svg>`
    : `<svg viewBox="0 0 220 320" width="100%" height="300" role="img" aria-label="Door diagram">
        <g fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="30" y="20" width="160" height="260" />
          <rect x="66" y="57" width="88" height="185" />
          <line x1="66" y1="20" x2="66" y2="57" />
          <line x1="154" y1="20" x2="154" y2="57" />
          <line x1="66" y1="242" x2="66" y2="280" />
          <line x1="154" y1="242" x2="154" y2="280" />
        </g>
        <text x="110" y="42" text-anchor="middle" font-size="14" font-family="Segoe UI">A</text>
        <text x="110" y="268" text-anchor="middle" font-size="14" font-family="Segoe UI">A</text>
        <text x="48" y="156" text-anchor="middle" font-size="14" font-family="Segoe UI">B</text>
        <text x="172" y="156" text-anchor="middle" font-size="14" font-family="Segoe UI">B</text>
        <text x="110" y="160" text-anchor="middle" font-size="16" font-family="Segoe UI">C</text>
        <text x="110" y="308" text-anchor="middle" font-size="12" font-family="Segoe UI">${escapeHtml(widthLabel)}</text>
        <text x="208" y="150" text-anchor="middle" font-size="12" font-family="Segoe UI" transform="rotate(90 208 150)">${escapeHtml(heightLabel)}</text>
      </svg>`;

  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Quick Door Sheet</title>
  <style>
    body{font-family:Segoe UI,Arial,sans-serif;color:#111;padding:20px}
    h1{font-size:24px;margin:0 0 10px}
    .meta{margin-bottom:16px;font-size:13px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;font-size:12px}
    th{background:#f3f4f6}
    .section{margin-top:18px}
    .sheet{display:grid;grid-template-columns:260px 1fr;gap:18px;align-items:start}
    .specs{font-size:12px;margin-top:8px;line-height:1.45}
    .specs-tight{margin-top:-2px}
    .count-note{font-size:15px;font-weight:700;margin:0 0 8px}
    .section-footer{margin-top:8px;text-align:right;font-size:12px;font-weight:600;color:#3f3f46}
  </style></head><body>
  <h1>${escapeHtml(report.name || 'Quick Door')}</h1>
  <div class="sheet">
    <div>
      ${diagram}
      <div class="specs ${isDrawerFront && report?.isSlab ? 'specs-tight' : ''}">
        <p class="count-note">${escapeHtml(doorCountNote(report))}</p>
        <div><strong>Style:</strong> ${escapeHtml(report.styleName || 'N/A')}</div>
        <div><strong>Item Type:</strong> ${escapeHtml(isDrawerFront ? 'Drawer Front' : 'Door')}</div>
        ${isDrawerFront ? `<div><strong>Position:</strong> ${escapeHtml(drawerFrontPositionLabel(report.drawerFrontPosition))}</div>` : `<div><strong>Door Type:</strong> ${escapeHtml(report.doorType || 'single')}</div>`}
        <div><strong>Opening:</strong> ${escapeHtml(report.opening)}</div>
        <div><strong>Finished:</strong> ${escapeHtml(report.finished)}</div>
        <div><strong>Overlay:</strong> ${escapeHtml(report.overlaySummary)}</div>
        ${slabGrainLabel ? `<div><strong>Grain:</strong> ${escapeHtml(slabGrainLabel)}</div>` : ''}
        <div><strong>Qty:</strong> ${escapeHtml(report.qty)}</div>
      </div>
    </div>
    <div>
      ${frameRows ? `<div class="section"><h3>Stiles & Rails</h3><table><thead><tr><th>Id</th><th>Part</th><th>Qty</th><th>Thickness</th><th>Width</th><th>Length</th></tr></thead><tbody>${frameRows}</tbody></table>${frameLengthLabel ? `<div class="section-footer">${escapeHtml(frameLengthLabel)}</div>` : ''}</div>` : ''}
      ${panelRows ? `<div class="section"><h3>Panels</h3><table><thead><tr><th>Id</th><th>Part</th><th>Qty</th><th>Thickness</th><th>Width</th><th>Length</th></tr></thead><tbody>${panelRows}</tbody></table>${panelAreaLabel ? `<div class="section-footer">${escapeHtml(panelAreaLabel)}</div>` : ''}</div>` : ''}
      ${slabRows ? `<div class="section"><h3>Slabs</h3><table><thead><tr><th>Id</th><th>Part</th><th>Qty</th><th>Thickness</th><th>Width</th><th>Length</th></tr></thead><tbody>${slabRows}</tbody></table>${slabAreaLabel ? `<div class="section-footer">${escapeHtml(slabAreaLabel)}</div>` : ''}</div>` : ''}
    </div>
  </div>
  </body></html>`;

  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  try {
    const doc = frame.contentWindow?.document;
    if (!doc) {
      return false;
    }
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((resolve) => setTimeout(resolve, 150));
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    return true;
  } finally {
    setTimeout(() => frame.remove(), 1000);
  }
}
