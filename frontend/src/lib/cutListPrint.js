function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getThicknessLabel(items) {
  if (!items.length) {
    return "";
  }

  const values = Array.from(new Set(items.map((item) => item.thicknessFormatted || "").filter(Boolean)));
  if (values.length === 0) {
    return "";
  }

  return values.join(", ");
}

function getFrameLinearFeetLabel(items) {
  if (!items.length) {
    return "";
  }

  const totalFeet = items.reduce((sum, item) => {
    const length = Number(item.length) || 0;
    const qty = Number(item.qty) || 0;
    return sum + (length * qty) / 12;
  }, 0);

  return totalFeet.toFixed(2);
}

function buildSections(items) {
  const frameItems = items.filter((item) => item.part === "Stile" || item.part === "Rail");
  const slabItems = items.filter((item) => item.part === "Slab");
  const panelItems = items.filter((item) => item.part === "Panel");

  return [
    {
      id: "frame",
      title: "Stiles & Rails",
      items: frameItems,
      thicknessLabel: getThicknessLabel(frameItems),
      footerLabel: getFrameLinearFeetLabel(frameItems) ? `Linear Feet: ${getFrameLinearFeetLabel(frameItems)}` : "",
    },
    {
      id: "slab",
      title: "Slabs",
      items: slabItems,
      thicknessLabel: getThicknessLabel(slabItems),
      footerLabel: "",
    },
    {
      id: "panel",
      title: "Panels",
      items: panelItems,
      thicknessLabel: getThicknessLabel(panelItems),
      footerLabel: "",
    },
  ].filter((section) => section.items.length > 0);
}

function buildDocumentHtml({ customerName, jobName, sections }) {
  const sectionHtml = sections
    .map((section) => {
      const rows = section.items
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.part)}</td>
              <td>${escapeHtml(item.qty)}</td>
              <td>${escapeHtml(item.widthFormatted || "-")}</td>
              <td>${escapeHtml(item.lengthFormatted || "-")}</td>
            </tr>`,
        )
        .join("");

      const thickness = section.thicknessLabel
        ? `<span class="meta-item">Thickness: ${escapeHtml(section.thicknessLabel)}</span>`
        : "";
      const footer = section.footerLabel ? `<div class="section-footer">${escapeHtml(section.footerLabel)}</div>` : "";

      return `
        <section class="cutlist-section">
          <div class="section-head">
            <h3>${escapeHtml(section.title)}</h3>
            <div class="section-meta">${thickness}</div>
          </div>
          <table>
            <colgroup>
              <col style="width:20%" />
              <col style="width:16%" />
              <col style="width:26%" />
              <col style="width:38%" />
            </colgroup>
            <thead>
              <tr>
                <th>Part</th>
                <th>Qty</th>
                <th>Width</th>
                <th>Length</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${footer}
        </section>`;
    })
    .join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Cut List</title>
      <style>
        @page { margin: 10mm; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #111111;
          background: #ffffff;
        }
        .root { width: 100%; }
        .header {
          margin-bottom: 10px;
          border-bottom: 1px solid #e4e4e7;
          padding-bottom: 8px;
        }
        .title {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #3f3f46;
        }
        .subtitle {
          margin-top: 4px;
          font-size: 12px;
          color: #52525b;
        }
        .cutlist-section {
          break-inside: avoid;
          page-break-inside: avoid;
          break-after: page;
          page-break-after: always;
        }
        .cutlist-section:last-child {
          break-after: auto;
          page-break-after: auto;
        }
        .section-head {
          margin: 0 0 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .section-head h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #3f3f46;
        }
        .meta-item {
          font-size: 12px;
          color: #52525b;
          font-weight: 500;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #d4d4d8;
          padding: 4px 8px;
          line-height: 1.1;
          font-size: 12px;
          text-align: left;
        }
        th {
          background: #f4f4f5;
          color: #52525b;
          font-weight: 500;
        }
        .section-footer {
          margin-top: 8px;
          text-align: right;
          font-size: 12px;
          font-weight: 600;
          color: #3f3f46;
        }
      </style>
    </head>
    <body>
      <main class="root">
        <header class="header">
          <h2 class="title">Cut List</h2>
          <p class="subtitle">${escapeHtml(customerName || "")}${customerName || jobName ? " - " : ""}${escapeHtml(jobName || "")}</p>
        </header>
        ${sectionHtml}
      </main>
    </body>
  </html>`;
}

export async function printCutList({ customerName, jobName, items }) {
  const sourceItems = Array.isArray(items) ? items : [];
  const sections = buildSections(sourceItems);
  if (sections.length === 0) {
    return false;
  }

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  frame.style.border = "0";
  frame.style.right = "0";
  frame.style.bottom = "0";

  document.body.appendChild(frame);

  const cleanup = () => {
    if (frame.parentNode) {
      frame.parentNode.removeChild(frame);
    }
  };

  try {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      cleanup();
      return false;
    }

    doc.open();
    doc.write(buildDocumentHtml({ customerName, jobName, sections }));
    doc.close();

    await new Promise((resolve) => {
      win.requestAnimationFrame(resolve);
    });

    await new Promise((resolve) => {
      const handleAfterPrint = () => {
        win.removeEventListener("afterprint", handleAfterPrint);
        resolve();
      };

      win.addEventListener("afterprint", handleAfterPrint);
      win.focus();
      win.print();

      window.setTimeout(() => {
        win.removeEventListener("afterprint", handleAfterPrint);
        resolve();
      }, 1500);
    });

    cleanup();
    return true;
  } catch (error) {
    cleanup();
    return false;
  }
}
