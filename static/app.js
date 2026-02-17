/* ── Insights Generator – Frontend ── */

const $ = (sel) => document.querySelector(sel);
const auditInput = $("#auditFiles");
const transcriptInput = $("#transcriptFiles");
const generateBtn = $("#generateBtn");
const resetBtn = $("#resetBtn");
const loading = $("#loading");
const dashboard = $("#dashboard");

let auditFiles = [];
let transcriptFiles = [];

// ── File Selection ──────────────────────────────────────────────

auditInput.addEventListener("change", () => {
  auditFiles = Array.from(auditInput.files);
  renderFileList("auditFileList", auditFiles);
  updateGenerateBtn();
});

transcriptInput.addEventListener("change", () => {
  transcriptFiles = Array.from(transcriptInput.files);
  renderFileList("transcriptFileList", transcriptFiles);
  updateGenerateBtn();
});

function renderFileList(containerId, files) {
  const el = document.getElementById(containerId);
  el.innerHTML = files
    .map((f) => `<div class="file-item">${f.name} (${formatSize(f.size)})</div>`)
    .join("");
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function updateGenerateBtn() {
  generateBtn.disabled = auditFiles.length === 0 && transcriptFiles.length === 0;
}

// ── Generate ────────────────────────────────────────────────────

generateBtn.addEventListener("click", async () => {
  // 1. Upload files
  const formData = new FormData();
  auditFiles.forEach((f) => formData.append("audit_files", f));
  transcriptFiles.forEach((f) => formData.append("transcript_files", f));

  loading.classList.remove("hidden");
  dashboard.classList.add("hidden");
  generateBtn.disabled = true;

  try {
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

    // 2. Generate insights
    const genRes = await fetch("/api/generate", { method: "POST" });
    const data = await genRes.json();
    if (!genRes.ok) throw new Error(data.error || "Generation failed");

    renderDashboard(data);
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    loading.classList.add("hidden");
    generateBtn.disabled = false;
  }
});

// ── Reset ───────────────────────────────────────────────────────

resetBtn.addEventListener("click", async () => {
  await fetch("/api/reset", { method: "POST" });
  auditFiles = [];
  transcriptFiles = [];
  auditInput.value = "";
  transcriptInput.value = "";
  $("#auditFileList").innerHTML = "";
  $("#transcriptFileList").innerHTML = "";
  dashboard.classList.add("hidden");
  updateGenerateBtn();
});

// ── Dashboard Rendering ─────────────────────────────────────────

function renderDashboard(data) {
  dashboard.classList.remove("hidden");

  renderRiskScore(data.risk_score);
  renderSummary(data.summary);
  renderSeverityChart(data.severity_distribution);
  renderCategoryChart(data.categories);
  renderTrend(data.trend_data);
  renderFindings(data.key_findings);
  renderGaps(data.compliance_gaps);
  renderThemes(data.themes);
  renderActions(data.action_items);
}

// ── Risk Score ──────────────────────────────────────────────────

function renderRiskScore(risk) {
  const circle = $("#scoreCircle");
  const value = $("#scoreValue");
  const level = $("#riskLevel");
  const indicators = $("#riskIndicators");

  value.textContent = risk.score;
  level.textContent = risk.level;

  circle.className = "score-circle";
  level.className = "risk-level";
  const cls = "risk-" + risk.level.toLowerCase();
  circle.classList.add(cls);
  level.classList.add(cls);

  indicators.innerHTML =
    `<span>${risk.risk_indicators} risk indicators</span> &middot; ` +
    `<span>${risk.positive_indicators} positive indicators</span>`;
}

// ── Summary ─────────────────────────────────────────────────────

function renderSummary(summary) {
  const el = $("#summaryContent");
  const items = [
    ["Audit Records", summary.total_audit_records],
    ["Transcripts", summary.total_transcripts],
    ["Text Analyzed", formatSize(summary.total_text_length)],
    ["Fields Detected", summary.audit_fields.length],
  ];
  el.innerHTML = items
    .map(
      ([label, val]) =>
        `<div class="summary-item"><span class="label">${label}</span><span class="value">${val}</span></div>`
    )
    .join("");
}

// ── Charts (Canvas-based, no dependencies) ──────────────────────

function renderSeverityChart(dist) {
  const canvas = $("#severityChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const colors = {
    Critical: "#dc2626",
    High: "#ea580c",
    Medium: "#ca8a04",
    Low: "#16a34a",
    Info: "#ec4899",
  };

  const entries = Object.entries(dist).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No severity data", w / 2, h / 2);
    return;
  }

  // Draw horizontal bar chart
  const barH = 24;
  const gap = 10;
  const startY = 10;
  const labelW = 70;
  const barMaxW = w - labelW - 60;

  entries.forEach(([label, val], i) => {
    const y = startY + i * (barH + gap);
    const barW = (val / total) * barMaxW;

    ctx.fillStyle = "#6b7280";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(label, labelW - 8, y + barH / 2 + 4);

    ctx.fillStyle = colors[label] || "#ec4899";
    ctx.beginPath();
    roundRect(ctx, labelW, y, Math.max(barW, 4), barH, 4);
    ctx.fill();

    ctx.fillStyle = "#1f2937";
    ctx.textAlign = "left";
    ctx.font = "11px sans-serif";
    ctx.fillText(val, labelW + barW + 8, y + barH / 2 + 4);
  });
}

function renderCategoryChart(categories) {
  const canvas = $("#categoryChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  const barW = Math.min(60, (w - 40) / entries.length - 10);
  const chartH = h - 50;
  const startX = 30;

  entries.forEach(([label, val], i) => {
    const x = startX + i * (barW + 16);
    const barH = (val / max) * (chartH - 20);
    const y = chartH - barH;

    const gradient = ctx.createLinearGradient(x, y, x, chartH);
    gradient.addColorStop(0, "#f472b6");
    gradient.addColorStop(1, "#be185d");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    roundRect(ctx, x, y, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = "#1f2937";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(val, x + barW / 2, y - 6);

    ctx.fillStyle = "#6b7280";
    ctx.font = "10px sans-serif";
    ctx.save();
    ctx.translate(x + barW / 2, chartH + 10);
    ctx.rotate(-0.4);
    ctx.textAlign = "right";
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });
}

function renderTrend(trend) {
  const row = $("#trendRow");
  if (!trend.available) {
    row.classList.add("hidden");
    return;
  }
  row.classList.remove("hidden");

  const canvas = $("#trendChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const periods = trend.periods;
  if (periods.length < 2) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Not enough data points for trend", w / 2, h / 2);
    return;
  }

  const max = Math.max(...periods.map((p) => p.count), 1);
  const padX = 60;
  const padY = 30;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  // Draw line
  ctx.strokeStyle = "#ec4899";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  periods.forEach((p, i) => {
    const x = padX + (i / (periods.length - 1)) * chartW;
    const y = padY + chartH - (p.count / max) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw dots and labels
  periods.forEach((p, i) => {
    const x = padX + (i / (periods.length - 1)) * chartW;
    const y = padY + chartH - (p.count / max) * chartH;

    ctx.fillStyle = "#ec4899";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1f2937";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.count, x, y - 10);

    if (i % Math.ceil(periods.length / 8) === 0 || i === periods.length - 1) {
      ctx.fillStyle = "#6b7280";
      ctx.fillText(p.period, x, padY + chartH + 16);
    }
  });
}

// ── Tables ──────────────────────────────────────────────────────

function renderFindings(findings) {
  const el = $("#findingsTable");
  if (!findings.length) {
    el.innerHTML = '<div class="empty-state">No key findings detected</div>';
    return;
  }
  el.innerHTML = `
    <table>
      <thead><tr><th>Source</th><th>Field</th><th>Finding</th></tr></thead>
      <tbody>${findings
        .map(
          (f) => `<tr>
            <td><span class="badge ${f.source === "audit" ? "badge-audit" : "badge-transcript"}">${esc(f.source)}</span></td>
            <td>${esc(f.field)}</td>
            <td>${esc(f.value)}</td>
          </tr>`
        )
        .join("")}</tbody>
    </table>`;
}

function renderGaps(gaps) {
  const el = $("#gapsTable");
  if (!gaps.length) {
    el.innerHTML = '<div class="empty-state">No compliance gaps detected</div>';
    return;
  }
  el.innerHTML = `
    <table>
      <thead><tr><th>Type</th><th>Detail</th></tr></thead>
      <tbody>${gaps
        .map(
          (g) => `<tr><td><strong>${esc(g.type)}</strong></td><td>${esc(g.detail)}</td></tr>`
        )
        .join("")}</tbody>
    </table>`;
}

// ── Lists ───────────────────────────────────────────────────────

function renderThemes(themes) {
  const el = $("#themesList");
  if (!themes.length) {
    el.innerHTML = '<div class="empty-state">No recurring themes found</div>';
    return;
  }
  el.innerHTML = themes
    .map(
      (t) =>
        `<div class="theme-item">${esc(t.theme)}<span class="freq">${t.frequency}x</span></div>`
    )
    .join("");
}

function renderActions(actions) {
  const el = $("#actionsList");
  if (!actions.length) {
    el.innerHTML = '<div class="empty-state">No action items extracted</div>';
    return;
  }
  el.innerHTML = actions
    .map((a) => `<div class="action-item">${esc(a)}</div>`)
    .join("");
}

// ── Helpers ─────────────────────────────────────────────────────

function esc(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}
