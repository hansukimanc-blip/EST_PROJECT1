(function () {
  "use strict";

  const email = document.getElementById("profile-email");
  const lastSignIn = document.getElementById("last-sign-in");
  const recentSearchCount = document.getElementById("recent-search-count");
  const savedReportCount = document.getElementById("saved-report-count");
  const recentSearchBody = document.getElementById("recent-search-body");
  const savedReportBody = document.getElementById("saved-report-body");
  let currentUser = null;
  let recentSearches = [];
  let savedReports = [];

  function storageKey(type) {
    return `audit-${type}:${currentUser.id}`;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function filterText(filters) {
    const parts = [];
    if (filters.yearFrom || filters.yearTo) parts.push(`감사연도 ${filters.yearFrom || "전체"} ~ ${filters.yearTo || "전체"}`);
    if (filters.department) parts.push(`대상부서 ${filters.department}`);
    if (filters.drafter) parts.push(`기안자 ${filters.drafter}`);
    if (filters.auditType) parts.push(`감사유형 ${filters.auditType}`);
    return parts.length ? parts.join(" / ") : "없음";
  }

  function renderRecentSearches() {
    recentSearchCount.textContent = recentSearches.length + "건";
    recentSearchBody.innerHTML = recentSearches.map((search, index) => `
      <tr>
        <td>${window.escapeHtml(search.keywords || "전체")}</td>
        <td>${window.escapeHtml(formatDate(search.searchedAt))}</td>
        <td>${window.escapeHtml(String(search.mode || "and").toUpperCase())}</td>
        <td><span class="table-content" title="${window.escapeHtml(filterText(search.filters || {}))}">${window.escapeHtml(filterText(search.filters || {}))}</span></td>
        <td><button class="button button-outline my-table-button repeat-search-button" type="button" data-index="${index}">다시 검색</button></td>
      </tr>`).join("") || `<tr><td class="empty-table-cell" colspan="5">최근 검색 내역이 없습니다.</td></tr>`;
  }

  function renderSavedReports() {
    savedReportCount.textContent = savedReports.length + "건";
    savedReportBody.innerHTML = savedReports.map((report, index) => `
      <tr>
        <td><span class="table-content" title="${window.escapeHtml(report.title || "-")}">${window.escapeHtml(report.title || "-")}</span></td>
        <td>${report.year ? window.escapeHtml(report.year) + "년" : "-"}</td>
        <td>${window.escapeHtml(report.department || "-")}</td>
        <td>${window.escapeHtml(report.auditType || "-")}</td>
        <td>${window.escapeHtml(formatDate(report.savedAt))}</td>
        <td><button class="button button-outline my-table-button open-saved-report-button" type="button" data-index="${index}">원본 HWP 열기</button></td>
        <td><button class="text-button unsave-report-button" type="button" data-index="${index}">저장 해제</button></td>
      </tr>`).join("") || `<tr><td class="empty-table-cell" colspan="7">저장한 감사사례가 없습니다.</td></tr>`;
  }

  async function loadRecentSearches(user) {
    const { data, error } = await window.auditSupabaseClient
      .from("recent_searches")
      .select("id, keywords, searched_at, search_mode, year_from, year_to, department, drafter, audit_type")
      .eq("user_id", user.id)
      .order("searched_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((search) => ({
      id: search.id,
      keywords: search.keywords,
      searchedAt: search.searched_at,
      mode: search.search_mode,
      filters: {
        yearFrom: search.year_from == null ? "" : String(search.year_from),
        yearTo: search.year_to == null ? "" : String(search.year_to),
        department: search.department || "",
        drafter: search.drafter || "",
        auditType: search.audit_type || ""
      }
    }));
  }

  async function loadSavedReports(user) {
    const { data, error } = await window.auditSupabaseClient
      .from("saved_reports")
      .select("id, report_id, saved_at, audit_reports (id, title, file_path, year, department, audit_type)")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((savedReport) => ({
      savedReportId: savedReport.id,
      reportId: savedReport.report_id,
      savedAt: savedReport.saved_at,
      title: savedReport.audit_reports?.title || "-",
      filePath: savedReport.audit_reports?.file_path || "",
      year: savedReport.audit_reports?.year || null,
      department: savedReport.audit_reports?.department || "-",
      auditType: savedReport.audit_reports?.audit_type || "-"
    }));
  }

  async function initialize(user) {
    if (!user || currentUser) return;
    currentUser = user;
    email.textContent = user.email || "-";
    lastSignIn.textContent = formatDate(user.last_sign_in_at);
    renderRecentSearches();
    renderSavedReports();
    if (!window.auditSupabaseClient) {
      window.showToast("마이페이지 데이터를 불러오지 못했습니다.");
      return;
    }
    try {
      [recentSearches, savedReports] = await Promise.all([
        loadRecentSearches(user),
        loadSavedReports(user)
      ]);
      renderRecentSearches();
      renderSavedReports();
    } catch (_error) {
      window.showToast("마이페이지 데이터를 불러오지 못했습니다.");
    }
  }

  recentSearchBody.addEventListener("click", (event) => {
    const button = event.target.closest(".repeat-search-button");
    if (!button || !currentUser) return;
    const search = recentSearches[Number(button.dataset.index)];
    if (!search) return;
    try {
      window.localStorage.setItem(storageKey("pending-search"), JSON.stringify(search));
      window.location.href = "index.html";
    } catch (_error) {
      window.showToast("검색 조건을 불러오지 못했습니다.");
    }
  });

  savedReportBody.addEventListener("click", async (event) => {
    const openButton = event.target.closest(".open-saved-report-button");
    if (openButton) {
      const report = savedReports[Number(openButton.dataset.index)];
      if (report) window.showToast(`원본 경로: ${report.filePath || "등록된 경로 없음"}`);
      return;
    }

    const unsaveButton = event.target.closest(".unsave-report-button");
    if (!unsaveButton || !currentUser || !window.auditSupabaseClient) return;
    const index = Number(unsaveButton.dataset.index);
    const report = savedReports[index];
    if (!report) return;
    unsaveButton.disabled = true;
    try {
      const { error } = await window.auditSupabaseClient
        .from("saved_reports")
        .delete()
        .eq("id", report.savedReportId)
        .eq("user_id", currentUser.id);
      if (error) throw error;
      savedReports = savedReports.filter((_report, itemIndex) => itemIndex !== index);
      renderSavedReports();
      window.showToast("감사사례 저장을 해제했습니다.");
    } catch (_error) {
      unsaveButton.disabled = false;
      window.showToast("감사사례 저장을 해제하지 못했습니다.");
    }
  });

  if (window.auditCurrentUser) initialize(window.auditCurrentUser);
  else window.addEventListener("audit-auth-ready", (event) => initialize(event.detail.user), { once: true });
})();
