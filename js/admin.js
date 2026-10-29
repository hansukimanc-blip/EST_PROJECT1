(function () {
  "use strict";

  const reports = window.mockReports || [];
  const form = document.getElementById("report-form");
  const dateInput = document.getElementById("report-date");
  const fileInput = document.getElementById("report-file");
  const registerButton = document.getElementById("register-button");
  const registeredBody = document.getElementById("registered-body");
  const registeredCount = document.getElementById("registered-count");
  const extraRows = [];

  function normalizeReport(report) {
    return {
      date: report.auditDate || (report.year ? report.year + "-01-01" : "-"),
      department: report.department || "-",
      drafter: report.drafter || "-",
      auditType: report.auditType || "-",
      discipline: report.discipline || "-",
      content: report.content || "-",
      fileName: report.fileName || "-",
      status: report.status || "등록 완료"
    };
  }

  function renderRegistered() {
    const allRows = [...extraRows, ...reports.map(normalizeReport)];
    registeredCount.textContent = allRows.length + "건";
    registeredBody.innerHTML = allRows.map((report) => `
      <tr>
        <td>${window.escapeHtml(report.date)}</td>
        <td>${window.escapeHtml(report.department)}</td>
        <td>${window.escapeHtml(report.drafter)}</td>
        <td>${window.escapeHtml(report.auditType)}</td>
        <td>${window.escapeHtml(report.discipline)}</td>
        <td><span class="table-content" title="${window.escapeHtml(report.content)}">${window.escapeHtml(report.content)}</span></td>
        <td><span class="table-file"><span>${window.escapeHtml(fileExtension(report.fileName))}</span><strong>${window.escapeHtml(report.fileName)}</strong></span></td>
        <td><span class="status-badge success">${window.escapeHtml(report.status)}</span></td>
      </tr>`).join("");
  }

  function setToday() {
    dateInput.value = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  }

  function fileExtension(fileName) {
    const match = String(fileName).match(/\.([^.]+)$/);
    return match ? match[1].toUpperCase() : "FILE";
  }

  function isAllowedFile(file) {
    return /\.(hwp|hwpx|doc|docx|pdf)$/i.test(file.name);
  }

  registerButton.addEventListener("click", () => {
    if (!form.reportValidity()) return;
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!isAllowedFile(file)) {
      fileInput.value = "";
      window.showToast("HWP, HWPX, DOC, DOCX, PDF 파일만 등록할 수 있습니다.");
      return;
    }
    form.requestSubmit();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const file = fileInput.files[0];
    if (!file || !isAllowedFile(file)) {
      window.showToast("등록할 감사보고서 파일을 선택해 주세요.");
      return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "업로드 중…";
    const formData = new FormData(form);

    window.setTimeout(() => {
      extraRows.unshift({
        date: formData.get("date"),
        department: formData.get("department").trim(),
        drafter: formData.get("drafter").trim(),
        auditType: formData.get("auditType").trim(),
        discipline: formData.get("discipline").trim(),
        content: formData.get("content").trim(),
        fileName: file.name,
        status: "등록 완료"
      });
      renderRegistered();
      form.reset();
      setToday();
      registerButton.disabled = false;
      registerButton.textContent = "감사보고서 등록";
      window.showToast("감사보고서 파일이 업로드되었습니다.");
    }, 450);
  });

  form.addEventListener("reset", () => window.setTimeout(setToday, 0));

  setToday();
  renderRegistered();
})();
