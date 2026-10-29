(function () {
  "use strict";

  const reports = window.mockReports || [];
  const fileInput = document.getElementById("file-input");
  const chooseButton = document.getElementById("choose-file-button");
  const dropZone = document.getElementById("drop-zone");
  const selectedArea = document.getElementById("selected-area");
  const selectedCount = document.getElementById("selected-count");
  const selectedFiles = document.getElementById("selected-files");
  const clearButton = document.getElementById("clear-files-button");
  const uploadButton = document.getElementById("upload-button");
  const registeredBody = document.getElementById("registered-body");
  const registeredCount = document.getElementById("registered-count");
  let files = [];
  let extraRows = [];

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function isHwp(file) {
    return /\.hwpx?$/i.test(file.name);
  }

  function renderSelected() {
    selectedArea.hidden = files.length === 0;
    selectedCount.textContent = files.length;
    selectedFiles.innerHTML = files.map((file, index) => `
      <li>
        <span class="mini-file-icon">HWP</span>
        <span class="selected-file-info"><strong>${window.escapeHtml(file.name)}</strong><small>${formatSize(file.size)}</small></span>
        <span class="file-status pending">업로드 대기</span>
        <button class="remove-file" type="button" data-index="${index}" aria-label="${window.escapeHtml(file.name)} 삭제">×</button>
      </li>`).join("");
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList);
    const valid = incoming.filter(isHwp);
    const invalidCount = incoming.length - valid.length;
    valid.forEach((file) => {
      if (!files.some((item) => item.name === file.name && item.size === file.size)) files.push(file);
    });
    renderSelected();
    if (invalidCount) window.showToast("HWP 또는 HWPX 파일만 선택할 수 있습니다.");
  }

  function renderRegistered() {
    const allRows = [...extraRows, ...reports];
    registeredCount.textContent = allRows.length + "건";
    registeredBody.innerHTML = allRows.map((report) => `
      <tr>
        <td><span class="table-file"><span>HWP</span><strong>${window.escapeHtml(report.fileName)}</strong></span></td>
        <td>${report.year ? report.year + "년" : "-"}</td>
        <td><span class="status-badge ${report.status === "등록 실패" ? "failed" : "success"}">${report.status}</span></td>
        <td>${report.registeredAt}</td>
      </tr>`).join("");
  }

  chooseButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  }));
  ["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  }));
  dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));

  selectedFiles.addEventListener("click", (event) => {
    const button = event.target.closest(".remove-file");
    if (!button) return;
    files.splice(Number(button.dataset.index), 1);
    renderSelected();
  });

  clearButton.addEventListener("click", () => {
    files = [];
    renderSelected();
  });

  uploadButton.addEventListener("click", () => {
    if (!files.length) return;
    uploadButton.disabled = true;
    uploadButton.textContent = "업로드 중…";
    const statusItems = selectedFiles.querySelectorAll(".file-status");
    window.setTimeout(() => {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
      files.forEach((file, index) => {
        const failed = /fail|실패/i.test(file.name);
        statusItems[index].textContent = failed ? "등록 실패" : "등록 완료";
        statusItems[index].className = "file-status " + (failed ? "failed" : "success");
        extraRows.unshift({
          fileName: file.name,
          year: null,
          status: failed ? "등록 실패" : "등록 완료",
          registeredAt: today
        });
      });
      renderRegistered();
      uploadButton.disabled = false;
      uploadButton.textContent = "선택 파일 업로드";
      window.showToast("파일별 Mock 등록 처리가 완료되었습니다.");
    }, 650);
  });

  renderRegistered();
})();
