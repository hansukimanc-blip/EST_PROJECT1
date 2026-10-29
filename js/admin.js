(function () {
  "use strict";

  const reports = window.mockReports || [];
  const form = document.getElementById("report-form");
  const dateInput = document.getElementById("report-date");
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
        <td><span class="status-badge success">${window.escapeHtml(report.status)}</span></td>
      </tr>`).join("");
  }

  function setToday() {
    dateInput.value = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    registerButton.disabled = true;
    registerButton.textContent = "등록 중…";
    const formData = new FormData(form);

    window.setTimeout(() => {
      extraRows.unshift({
        date: formData.get("date"),
        department: formData.get("department").trim(),
        drafter: formData.get("drafter").trim(),
        auditType: formData.get("auditType").trim(),
        discipline: formData.get("discipline").trim(),
        content: formData.get("content").trim(),
        status: "등록 완료"
      });
      renderRegistered();
      form.reset();
      setToday();
      registerButton.disabled = false;
      registerButton.textContent = "감사보고서 등록";
      window.showToast("감사보고서가 등록되었습니다.");
    }, 450);
  });

  form.addEventListener("reset", () => window.setTimeout(setToday, 0));

  setToday();
  renderRegistered();
})();
