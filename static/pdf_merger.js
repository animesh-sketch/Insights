/* ── PDF Merger Frontend ── */
(function () {
  "use strict";

  // State
  let sessionId = null;
  let files = []; // { name, stored, size }
  let dragSrcIndex = null;

  // DOM refs
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const fileListSection = document.getElementById("fileListSection");
  const fileList = document.getElementById("fileList");
  const fileCount = document.getElementById("fileCount");
  const mergeBtn = document.getElementById("mergeBtn");
  const clearBtn = document.getElementById("clearBtn");
  const outputName = document.getElementById("outputName");
  const progressSection = document.getElementById("progressSection");
  const resultSection = document.getElementById("resultSection");
  const resultInfo = document.getElementById("resultInfo");
  const downloadLink = document.getElementById("downloadLink");
  const startOverBtn = document.getElementById("startOverBtn");

  // ── Helpers ──

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  // ── Render file list ──

  function renderFiles() {
    fileList.innerHTML = "";
    files.forEach(function (f, i) {
      const li = document.createElement("li");
      li.className = "file-item";
      li.draggable = true;
      li.dataset.index = i;

      li.innerHTML =
        '<span class="drag-handle">&#9776;</span>' +
        '<span class="file-name">' + esc(f.name) + '</span>' +
        '<span class="file-size">' + formatSize(f.size) + '</span>' +
        '<button class="remove-btn" data-index="' + i + '" title="Remove">&times;</button>';

      // Drag events
      li.addEventListener("dragstart", onDragStart);
      li.addEventListener("dragover", onDragOver);
      li.addEventListener("drop", onDrop);
      li.addEventListener("dragend", onDragEnd);

      fileList.appendChild(li);
    });

    fileCount.textContent = files.length + " file" + (files.length !== 1 ? "s" : "");
    mergeBtn.disabled = files.length < 2;

    if (files.length > 0) {
      show(fileListSection);
    } else {
      hide(fileListSection);
    }
  }

  // ── Drag and drop reordering ──

  function onDragStart(e) {
    dragSrcIndex = parseInt(e.currentTarget.dataset.index);
    e.currentTarget.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    var li = e.currentTarget;
    li.classList.add("drag-over");
  }

  function onDrop(e) {
    e.preventDefault();
    var targetIndex = parseInt(e.currentTarget.dataset.index);
    e.currentTarget.classList.remove("drag-over");

    if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
      var moved = files.splice(dragSrcIndex, 1)[0];
      files.splice(targetIndex, 0, moved);
      renderFiles();
    }
  }

  function onDragEnd(e) {
    e.currentTarget.classList.remove("dragging");
    var items = fileList.querySelectorAll(".file-item");
    items.forEach(function (item) { item.classList.remove("drag-over"); });
  }

  // ── File upload via drag-drop zone ──

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    dropZone.classList.add("drag-active");
  });

  dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("drag-active");
  });

  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.classList.remove("drag-active");
    var droppedFiles = Array.from(e.dataTransfer.files).filter(function (f) {
      return f.name.toLowerCase().endsWith(".pdf");
    });
    if (droppedFiles.length > 0) uploadFiles(droppedFiles);
  });

  fileInput.addEventListener("change", function () {
    var selected = Array.from(fileInput.files);
    if (selected.length > 0) uploadFiles(selected);
    fileInput.value = "";
  });

  // ── Upload to server ──

  function uploadFiles(fileArray) {
    var formData = new FormData();
    fileArray.forEach(function (f) { formData.append("files", f); });
    if (sessionId) formData.append("session_id", sessionId);

    fetch("/api/pdf/upload", { method: "POST", body: formData })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          alert(data.error);
          return;
        }
        sessionId = data.session_id;
        data.files.forEach(function (f) {
          files.push({ name: f.name, stored: f.stored, size: 0 });
        });
        // Refresh list with sizes from server
        return refreshFileList();
      })
      .catch(function (err) { alert("Upload failed: " + err.message); });
  }

  function refreshFileList() {
    if (!sessionId) return Promise.resolve();
    return fetch("/api/pdf/list?session_id=" + encodeURIComponent(sessionId))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        files = data.files || [];
        renderFiles();
      });
  }

  // ── Remove file ──

  fileList.addEventListener("click", function (e) {
    if (!e.target.classList.contains("remove-btn")) return;
    var idx = parseInt(e.target.dataset.index);
    var file = files[idx];
    if (!file) return;

    fetch("/api/pdf/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, stored: file.stored })
    })
      .then(function () {
        files.splice(idx, 1);
        renderFiles();
      });
  });

  // ── Merge ──

  mergeBtn.addEventListener("click", function () {
    if (files.length < 2) return;

    hide(fileListSection);
    show(progressSection);
    hide(resultSection);

    var order = files.map(function (f) { return f.stored; });
    var outName = outputName.value.trim() || "merged.pdf";

    fetch("/api/pdf/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, order: order, output_name: outName })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        hide(progressSection);
        if (data.error) {
          alert(data.error);
          show(fileListSection);
          return;
        }
        resultInfo.textContent = files.length + " PDFs merged successfully.";
        downloadLink.href = data.download_url;
        downloadLink.download = outName.endsWith(".pdf") ? outName : outName + ".pdf";
        show(resultSection);
      })
      .catch(function (err) {
        hide(progressSection);
        alert("Merge failed: " + err.message);
        show(fileListSection);
      });
  });

  // ── Clear all ──

  clearBtn.addEventListener("click", function () {
    if (!sessionId) return;
    fetch("/api/pdf/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId })
    }).then(function () {
      sessionId = null;
      files = [];
      renderFiles();
      hide(resultSection);
    });
  });

  // ── Start over ──

  startOverBtn.addEventListener("click", function () {
    if (sessionId) {
      fetch("/api/pdf/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      });
    }
    sessionId = null;
    files = [];
    renderFiles();
    hide(resultSection);
    hide(progressSection);
  });

})();
