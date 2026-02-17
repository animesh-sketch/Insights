/* ── PDF Merger – Frontend ── */

const dropZone = document.getElementById("dropZone");
const pdfInput = document.getElementById("pdfInput");
const fileListSection = document.getElementById("fileListSection");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");
const mergeActions = document.getElementById("mergeActions");
const mergeBtn = document.getElementById("mergeBtn");
const clearBtn = document.getElementById("clearBtn");
const progress = document.getElementById("progress");
const progressFill = document.getElementById("progressFill");
const successMsg = document.getElementById("successMsg");

let pdfFiles = [];
let dragSrcIndex = null;

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
  if (btn) btn.innerHTML = document.body.classList.contains("dark") ? "&#9788;" : "&#9790;";
}
initTheme();
document.getElementById("themeToggle")?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  updateToggleIcon();
});

// ── Drop Zone ────────────────────────────────────────────────────

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const files = Array.from(e.dataTransfer.files).filter((f) =>
    f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
  );
  addFiles(files);
});

pdfInput.addEventListener("change", () => {
  const files = Array.from(pdfInput.files);
  addFiles(files);
  pdfInput.value = "";
});

function addFiles(files) {
  if (files.length === 0) return;
  pdfFiles = pdfFiles.concat(files);
  renderFileList();
  successMsg.classList.add("hidden");
}

// ── Render File List ─────────────────────────────────────────────

function renderFileList() {
  if (pdfFiles.length === 0) {
    fileListSection.classList.add("hidden");
    mergeActions.style.display = "none";
    return;
  }

  fileListSection.classList.remove("hidden");
  mergeActions.style.display = "";
  fileCount.textContent = pdfFiles.length + " file" + (pdfFiles.length !== 1 ? "s" : "");
  mergeBtn.disabled = pdfFiles.length < 2;

  fileList.innerHTML = "";
  pdfFiles.forEach((file, index) => {
    const li = document.createElement("li");
    li.className = "pdf-file-item";
    li.draggable = true;
    li.dataset.index = index;

    li.innerHTML = `
      <span class="drag-handle" title="Drag to reorder">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
        </svg>
      </span>
      <span class="file-index">${index + 1}</span>
      <span class="file-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </span>
      <span class="file-name">${esc(file.name)}</span>
      <span class="file-size">${formatSize(file.size)}</span>
      <button class="remove-btn" title="Remove file" data-index="${index}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    // Drag events for reordering
    li.addEventListener("dragstart", handleDragStart);
    li.addEventListener("dragover", handleDragOver);
    li.addEventListener("dragenter", handleDragEnter);
    li.addEventListener("dragleave", handleDragLeave);
    li.addEventListener("drop", handleDrop);
    li.addEventListener("dragend", handleDragEnd);

    // Remove button
    li.querySelector(".remove-btn").addEventListener("click", () => {
      pdfFiles.splice(index, 1);
      renderFileList();
    });

    fileList.appendChild(li);
  });
}

// ── Drag-to-Reorder ─────────────────────────────────────────────

function handleDragStart(e) {
  dragSrcIndex = parseInt(this.dataset.index);
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", dragSrcIndex);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function handleDragEnter(e) {
  e.preventDefault();
  this.classList.add("drag-target");
}

function handleDragLeave() {
  this.classList.remove("drag-target");
}

function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  this.classList.remove("drag-target");

  const targetIndex = parseInt(this.dataset.index);
  if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

  const moved = pdfFiles.splice(dragSrcIndex, 1)[0];
  pdfFiles.splice(targetIndex, 0, moved);
  renderFileList();
}

function handleDragEnd() {
  this.classList.remove("dragging");
  document.querySelectorAll(".drag-target").forEach((el) => el.classList.remove("drag-target"));
}

// ── Merge ────────────────────────────────────────────────────────

mergeBtn.addEventListener("click", async () => {
  if (pdfFiles.length < 2) return;

  mergeBtn.disabled = true;
  clearBtn.disabled = true;
  progress.classList.remove("hidden");
  successMsg.classList.add("hidden");

  // Animate progress bar
  progressFill.style.width = "0%";
  let pct = 0;
  const interval = setInterval(() => {
    pct = Math.min(pct + Math.random() * 15, 90);
    progressFill.style.width = pct + "%";
  }, 200);

  const formData = new FormData();
  pdfFiles.forEach((f) => formData.append("pdf_files", f));

  try {
    const res = await fetch("/api/merge-pdfs", { method: "POST", body: formData });

    clearInterval(interval);
    progressFill.style.width = "100%";

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Merge failed");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merged.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      progress.classList.add("hidden");
      successMsg.classList.remove("hidden");
      showToast("PDFs merged successfully!", "success");
    }, 400);
  } catch (err) {
    clearInterval(interval);
    progress.classList.add("hidden");
    showToast("Error: " + err.message, "error");
  } finally {
    mergeBtn.disabled = pdfFiles.length < 2;
    clearBtn.disabled = false;
  }
});

// ── Clear ────────────────────────────────────────────────────────

clearBtn.addEventListener("click", () => {
  pdfFiles = [];
  renderFileList();
  successMsg.classList.add("hidden");
});

// ── Helpers ──────────────────────────────────────────────────────

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function esc(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
