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
let currentData = null; // store last generated data for filtering/export

// ── Toast Notifications ─────────────────────────────────────────

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Dark / Light Mode Toggle ────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.body.classList.add("dark");
  updateToggleIcon();
}

function updateToggleIcon() {
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = document.body.classList.contains("dark") ? "\u2600" : "\u263E";
}

initTheme();

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  updateToggleIcon();
  // Re-render charts with correct colors if dashboard is visible
  if (currentData) {
    renderSeverityChart(currentData.severity_distribution);
    renderCategoryChart(currentData.categories);
    renderTrend(currentData.trend_data);
  }
});

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

    const genRes = await fetch("/api/generate", { method: "POST" });
    const data = await genRes.json();
    if (!genRes.ok) throw new Error(data.error || "Generation failed");

    currentData = data;
    renderDashboard(data);
    showToast("Insights generated successfully!", "success");
  } catch (err) {
    showToast("Error: " + err.message, "error");
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
  currentData = null;
  updateGenerateBtn();
  showToast("All files cleared", "info");
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

// ── Theme-aware chart colors ────────────────────────────────────

function chartColors() {
  const dark = document.body.classList.contains("dark");
  return {
    text: dark ? "#e4e6f0" : "#1f2937",
    textDim: dark ? "#8b8fa8" : "#6b7280",
    accent: "#ec4899",
    accentLight: "#f472b6",
    gradientTop: "#f472b6",
    gradientBottom: "#be185d",
  };
}

// ── Charts (Canvas-based, no dependencies) ──────────────────────

function renderSeverityChart(dist) {
  const canvas = $("#severityChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cc = chartColors();

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
    ctx.fillStyle = cc.textDim;
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No severity data", w / 2, h / 2);
    return;
  }

  // Draw donut chart
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(cx, cy) - 20;
  const innerR = outerR * 0.55;
  let startAngle = -Math.PI / 2;

  entries.forEach(([label, val]) => {
    const sliceAngle = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[label] || cc.accent;
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Center text
  ctx.fillStyle = cc.text;
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(total, cx, cy - 8);
  ctx.font = "11px sans-serif";
  ctx.fillStyle = cc.textDim;
  ctx.fillText("total", cx, cy + 12);

  // Legend
  const legendY = h - 14;
  let legendX = 10;
  ctx.font = "10px sans-serif";
  ctx.textBaseline = "alphabetic";
  entries.forEach(([label, val]) => {
    ctx.fillStyle = colors[label] || cc.accent;
    ctx.fillRect(legendX, legendY - 8, 8, 8);
    ctx.fillStyle = cc.textDim;
    ctx.textAlign = "left";
    ctx.fillText(label + " " + val, legendX + 11, legendY);
    legendX += ctx.measureText(label + " " + val).width + 20;
  });
}

function renderCategoryChart(categories) {
  const canvas = $("#categoryChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cc = chartColors();

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
    gradient.addColorStop(0, cc.gradientTop);
    gradient.addColorStop(1, cc.gradientBottom);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    roundRect(ctx, x, y, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = cc.text;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(val, x + barW / 2, y - 6);

    ctx.fillStyle = cc.textDim;
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
  const cc = chartColors();

  const periods = trend.periods;
  if (periods.length < 2) {
    ctx.fillStyle = cc.textDim;
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

  // Draw area fill
  ctx.beginPath();
  periods.forEach((p, i) => {
    const x = padX + (i / (periods.length - 1)) * chartW;
    const y = padY + chartH - (p.count / max) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(padX + chartW, padY + chartH);
  ctx.lineTo(padX, padY + chartH);
  ctx.closePath();
  const areaGrad = ctx.createLinearGradient(0, padY, 0, padY + chartH);
  areaGrad.addColorStop(0, "rgba(236, 72, 153, 0.2)");
  areaGrad.addColorStop(1, "rgba(236, 72, 153, 0.02)");
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Draw line
  ctx.strokeStyle = cc.accent;
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

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cc.accent;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = cc.text;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.count, x, y - 10);

    if (i % Math.ceil(periods.length / 8) === 0 || i === periods.length - 1) {
      ctx.fillStyle = cc.textDim;
      ctx.fillText(p.period, x, padY + chartH + 16);
    }
  });
}

// ── Tables with Search & Filter ──────────────────────────────────

function renderFindings(findings) {
  const el = $("#findingsTable");
  if (!findings.length) {
    el.innerHTML = '<div class="empty-state">No key findings detected</div>';
    return;
  }

  const search = ($("#findingsSearch") || {}).value || "";
  const sourceFilter = ($("#findingsSourceFilter") || {}).value || "all";

  const filtered = findings.filter((f) => {
    const matchesSource = sourceFilter === "all" || f.source === sourceFilter;
    const matchesSearch = !search || f.value.toLowerCase().includes(search.toLowerCase()) || f.field.toLowerCase().includes(search.toLowerCase());
    return matchesSource && matchesSearch;
  });

  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state">No findings match your filter</div>';
    return;
  }

  el.innerHTML = `
    <table>
      <thead><tr><th>Source</th><th>Field</th><th>Finding</th></tr></thead>
      <tbody>${filtered
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

// Wire up search & filter
document.getElementById("findingsSearch").addEventListener("input", () => {
  if (currentData) renderFindings(currentData.key_findings);
});
document.getElementById("findingsSourceFilter").addEventListener("change", () => {
  if (currentData) renderFindings(currentData.key_findings);
});

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

// ── CSV Export ───────────────────────────────────────────────────

function downloadCSV(filename, headers, rows) {
  const csvContent = [headers.join(",")]
    .concat(rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")))
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Exported " + filename, "success");
}

document.getElementById("exportFindingsBtn").addEventListener("click", () => {
  if (!currentData || !currentData.key_findings.length) return showToast("No findings to export", "info");
  downloadCSV("findings.csv", ["Source", "Field", "Finding"],
    currentData.key_findings.map((f) => [f.source, f.field, f.value]));
});

document.getElementById("exportGapsBtn").addEventListener("click", () => {
  if (!currentData || !currentData.compliance_gaps.length) return showToast("No gaps to export", "info");
  downloadCSV("compliance_gaps.csv", ["Type", "Detail"],
    currentData.compliance_gaps.map((g) => [g.type, g.detail]));
});

document.getElementById("exportActionsBtn").addEventListener("click", () => {
  if (!currentData || !currentData.action_items.length) return showToast("No actions to export", "info");
  downloadCSV("action_items.csv", ["Action Item"],
    currentData.action_items.map((a) => [a]));
});

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
