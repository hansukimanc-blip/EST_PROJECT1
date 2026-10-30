(function () {
  "use strict";

  const supabaseClient = window.auditSupabaseClient;
  const reportFilesBucket = "audit-reports";
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

  function logSupabaseError(label, error) {
    console.error(label, error);
    if (!error) return;
    console.error("message:", error.message);
    console.error("details:", error.details);
    console.error("hint:", error.hint);
    console.error("code:", error.code);
  }

  function registrationErrorMessage(error) {
    const message = String(error?.message || "").toLocaleLowerCase();
    const code = String(error?.code || "");
    const detail = String(error?.message || "알 수 없는 오류").slice(0, 160);
    if (error?.registrationStage === "storage") {
      return `파일 업로드 실패: ${detail}`;
    }
    if (error?.registrationStage === "database") {
      return `DB 등록 실패: ${detail}`;
    }
    if (message.includes("bucket") && (message.includes("not found") || code === "404")) {
      return "감사보고서 파일 저장소가 준비되지 않았습니다. 관리자에게 문의해 주세요.";
    }
    if (message.includes("row-level security") || message.includes("permission") || code === "42501") {
      return "감사보고서 등록 권한이 없습니다. 관리자 권한을 확인해 주세요.";
    }
    if (code === "ADMIN_ROLE_REQUIRED") {
      return "관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.";
    }
    return "감사보고서를 등록하지 못했습니다. 다시 시도해 주세요.";
  }

  function storagePathForFile(file, user) {
    const extension = fileExtension(file.name).toLocaleLowerCase();
    const randomId = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    const year = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Seoul",
      year: "numeric"
    }).format(new Date());
    return `${user.id}/${year}/${Date.now()}-${randomId}.${extension}`;
  }

  async function uploadReportFile(file, user) {
    if (!file) return "";
    const objectPath = storagePathForFile(file, user);
    const { data, error } = await supabaseClient.storage
      .from(reportFilesBucket)
      .upload(objectPath, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false
      });
    if (error) {
      logSupabaseError("감사보고서 Storage 업로드 실패:", error);
      throw error;
    }
    console.log("3. Storage 업로드 완료:", data);
    return data.path;
  }

  async function removeUploadedFile(objectPath) {
    if (!objectPath) return;
    const { error } = await supabaseClient.storage
      .from(reportFilesBucket)
      .remove([objectPath]);
    if (error) logSupabaseError("DB 저장 실패 후 Storage 파일 정리 실패:", error);
  }

  function reportTitleFromFileName(fileName) {
    return String(fileName)
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim();
  }

  function reportTitle(file, auditDate, department, auditType) {
    if (file) return reportTitleFromFileName(file.name);
    return `${auditDate.slice(0, 4)}년 ${department} ${auditType} 보고서`;
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
    window.showToast("감사보고서 파일이 선택되었습니다.");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const file = fileInput.files[0];
    if (file && !isAllowedFile(file)) {
      window.showToast("HWP, HWPX, DOC, DOCX, PDF 파일만 등록할 수 있습니다.");
      return;
    }

    const currentUser = window.auditCurrentUser;
    const currentRole = window.auditCurrentRole;
    if (!currentUser || currentRole !== "admin") {
      console.error("감사보고서 등록 실패: 관리자 로그인 정보를 확인할 수 없습니다.");
      window.showToast("관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.");
      return;
    }

    console.log("1. 입력값 확인 완료");
    console.log("2. 선택한 파일:", file || "첨부 파일 없음");

    registerButton.disabled = true;
    uploadFileButton.disabled = true;
    registerButton.textContent = "등록 중…";
    const formData = new FormData(form);

    const auditDate = String(formData.get("date"));
    const department = String(formData.get("department")).trim();
    const auditType = String(formData.get("auditType")).trim();
    let uploadedFilePath = "";

    try {
      if (!supabaseClient) throw new Error("Supabase client is unavailable.");
      try {
        uploadedFilePath = await uploadReportFile(file, currentUser);
      } catch (error) {
        error.registrationStage = "storage";
        throw error;
      }
      console.log("4. Storage path 확보:", uploadedFilePath || "첨부 파일 없음");

      const reportData = {
        title: reportTitle(file, auditDate, department, auditType),
        file_name: file?.name || "",
        file_path: uploadedFilePath,
        year: Number(auditDate.slice(0, 4)),
        department,
        drafter: String(formData.get("drafter")).trim(),
        audit_type: auditType,
        audit_date: auditDate,
        discipline: String(formData.get("discipline")).trim(),
        content: String(formData.get("content")).trim(),
        status: "등록 완료"
      };

      console.log("5. DB 저장 시작:", reportData);
      const { data, error } = await supabaseClient
        .from("audit_reports")
        .insert(reportData)
        .select("id, title, file_name, file_path, year, department, drafter, audit_type, audit_date, discipline, content, status")
        .single();
      if (error) {
        error.registrationStage = "database";
        logSupabaseError("감사보고서 DB INSERT 실패:", error);
        throw error;
      }

      console.log("6. DB 저장 완료:", data);
      reports.unshift(mapReport(data));
      renderRegistered();
      form.reset();
      window.showToast("감사보고서가 등록되었습니다.");
    } catch (error) {
      console.error("감사보고서 등록 실패:", error);
      await removeUploadedFile(uploadedFilePath);
      window.showToast(registrationErrorMessage(error));
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
      if (error) {
        logSupabaseError("감사보고서 DB DELETE 실패:", error);
        throw error;
      }

      const deletedIds = new Set(idsToDelete);
      reports = reports.filter((report) => !deletedIds.has(Number(report.id)));
      selectedReportIds.clear();
      renderRegistered();
      window.showToast("선택한 감사보고서가 삭제되었습니다.");
    } catch (error) {
      console.error("감사보고서 삭제 실패:", error);
      deleteReportButton.disabled = false;
      window.showToast("감사보고서를 삭제하지 못했습니다. 다시 시도해 주세요.");
    }
  });

  setToday();
  renderRegistered();
  if (window.auditCurrentUser) initializeReports();
  else window.addEventListener("audit-auth-ready", initializeReports, { once: true });
})();
