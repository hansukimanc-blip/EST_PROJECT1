(function () {
  "use strict";

  const supabaseClient = window.auditSupabaseClient;
  let reports = [];
  let reportLoadFailed = false;
  const form = document.getElementById("report-form");
  const dateInput = document.getElementById("report-date");
  const fileInput = document.getElementById("report-file");
  const uploadFileButton = document.getElementById("upload-file-button");
  const registerButton = document.getElementById("register-button");
  const uploadedFile = document.getElementById("uploaded-file");
  const uploadedFileName = document.getElementById("uploaded-file-name");
  const registeredBody = document.getElementById("registered-body");
  const registeredCount = document.getElementById("registered-count");
  const deleteReportButton = document.getElementById("delete-report-button");
  const selectedReportIds = new Set();

  function mapReport(report) {
    return {
      id: report.id,
      fileName: report.file_name,
      year: report.year,
      department: report.department,
      drafter: report.drafter,
      auditType: report.audit_type,
      auditDate: report.audit_date,
      discipline: report.discipline,
      content: report.content,
      status: report.status
    };
  }

  async function loadReports() {
    if (!supabaseClient) throw new Error("Supabase client is unavailable.");
    const { data, error } = await supabaseClient
      .from("audit_reports")
      .select("id, file_name, year, department, drafter, audit_type, audit_date, discipline, content, status")
      .order("audit_date", { ascending: false });
    if (error) throw error;
    reports = (data || []).map(mapReport);
  }

  function normalizeReport(report, rowId) {
    return {
      rowId,
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
    const allRows = reports.map((report) => normalizeReport(report, String(report.id)));
    registeredCount.textContent = allRows.length + "건";
    deleteReportButton.disabled = selectedReportIds.size === 0;
    registeredBody.innerHTML = allRows.map((report) => `
      <tr>
        <td class="selection-column"><input class="report-select" type="checkbox" value="${window.escapeHtml(report.rowId)}" aria-label="${window.escapeHtml(report.fileName)} 선택"${selectedReportIds.has(report.rowId) ? " checked" : ""}></td>
        <td>${window.escapeHtml(report.date)}</td>
        <td>${window.escapeHtml(report.department)}</td>
        <td>${window.escapeHtml(report.drafter)}</td>
        <td>${window.escapeHtml(report.auditType)}</td>
        <td>${window.escapeHtml(report.discipline)}</td>
        <td><span class="table-content" title="${window.escapeHtml(report.content)}">${window.escapeHtml(report.content)}</span></td>
        <td><span class="table-file"><span>${window.escapeHtml(fileExtension(report.fileName))}</span><strong>${window.escapeHtml(report.fileName)}</strong></span></td>
        <td><span class="status-badge success">${window.escapeHtml(report.status)}</span></td>
      </tr>`).join("") || `<tr><td class="empty-table-cell" colspan="9">${reportLoadFailed ? "감사보고서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : "등록된 감사보고서가 없습니다."}</td></tr>`;
  }

  async function initializeReports() {
    try {
      await loadReports();
      renderRegistered();
    } catch (_error) {
      reportLoadFailed = true;
      renderRegistered();
      window.showToast("감사보고서 목록을 불러오지 못했습니다.");
    }
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

  function reportTitleFromFileName(fileName) {
    return String(fileName)
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim();
  }

  function resetFileSelection() {
    uploadedFile.hidden = true;
    uploadedFileName.textContent = "";
    uploadFileButton.textContent = "감사보고서 파일 업로드";
  }

  uploadFileButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!isAllowedFile(file)) {
      fileInput.value = "";
      resetFileSelection();
      window.showToast("HWP, HWPX, DOC, DOCX, PDF 파일만 등록할 수 있습니다.");
      return;
    }
    uploadedFileName.textContent = file.name;
    uploadedFile.hidden = false;
    uploadFileButton.textContent = "파일 다시 선택";
    window.showToast("감사보고서 파일 업로드가 완료되었습니다.");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const file = fileInput.files[0];
    if (!file || !isAllowedFile(file)) {
      window.showToast("등록할 감사보고서 파일을 선택해 주세요.");
      return;
    }

    registerButton.disabled = true;
    uploadFileButton.disabled = true;
    registerButton.textContent = "등록 중…";
    const formData = new FormData(form);

    const auditDate = String(formData.get("date"));
    const reportData = {
      title: reportTitleFromFileName(file.name),
      file_name: file.name,
      file_path: file.name,
      year: Number(auditDate.slice(0, 4)),
      department: String(formData.get("department")).trim(),
      drafter: String(formData.get("drafter")).trim(),
      audit_type: String(formData.get("auditType")).trim(),
      audit_date: auditDate,
      discipline: String(formData.get("discipline")).trim(),
      content: String(formData.get("content")).trim(),
      status: "등록 완료"
    };

    try {
      if (!supabaseClient) throw new Error("Supabase client is unavailable.");
      const { data, error } = await supabaseClient
        .from("audit_reports")
        .insert(reportData)
        .select("id, file_name, year, department, drafter, audit_type, audit_date, discipline, content, status")
        .single();
      if (error) throw error;

      reports.unshift(mapReport(data));
      renderRegistered();
      form.reset();
      window.showToast("감사보고서가 등록되었습니다.");
    } catch (_error) {
      window.showToast("감사보고서를 등록하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      uploadFileButton.disabled = false;
      registerButton.disabled = false;
      registerButton.textContent = "감사보고서 등록";
    }
  });

  form.addEventListener("reset", () => window.setTimeout(() => {
    setToday();
    resetFileSelection();
  }, 0));

  registeredBody.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".report-select");
    if (!checkbox) return;
    if (checkbox.checked) selectedReportIds.add(checkbox.value);
    else selectedReportIds.delete(checkbox.value);
    deleteReportButton.disabled = selectedReportIds.size === 0;
  });

  deleteReportButton.addEventListener("click", async () => {
    if (!selectedReportIds.size) return;
    if (!window.confirm("삭제하시겠습니까?")) return;

    deleteReportButton.disabled = true;
    const idsToDelete = [...selectedReportIds].map(Number);
    try {
      if (!supabaseClient) throw new Error("Supabase client is unavailable.");
      const { error } = await supabaseClient
        .from("audit_reports")
        .delete()
        .in("id", idsToDelete);
      if (error) throw error;

      const deletedIds = new Set(idsToDelete);
      reports = reports.filter((report) => !deletedIds.has(Number(report.id)));
      selectedReportIds.clear();
      renderRegistered();
      window.showToast("선택한 감사보고서가 삭제되었습니다.");
    } catch (_error) {
      deleteReportButton.disabled = false;
      window.showToast("감사보고서를 삭제하지 못했습니다. 다시 시도해 주세요.");
    }
  });

  setToday();
  renderRegistered();
  if (window.auditCurrentUser) initializeReports();
  else window.addEventListener("audit-auth-ready", initializeReports, { once: true });
})();
