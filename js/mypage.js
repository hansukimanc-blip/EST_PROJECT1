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

  function readStoredItems(type) {
    try {
      const value = JSON.parse(window.localStorage.getItem(storageKey(type)) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_error) {
      return [];
    }
  }

  function writeStoredItems(type, items) {
    try {
      window.localStorage.setItem(storageKey(type), JSON.stringify(items));
      return true;
    } catch (_error) {
      window.showToast("목록을 저장하지 못했습니다.");
      return false;
    }
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

  function initialize(user) {
    if (!user || currentUser) return;
    currentUser = user;
    email.textContent = user.email || "-";
    lastSignIn.textContent = formatDate(user.last_sign_in_at);
    recentSearches = readStoredItems("recent-searches");
    savedReports = readStoredItems("saved-reports");
    renderRecentSearches();
    renderSavedReports();
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

  savedReportBody.addEventListener("click", (event) => {
    const openButton = event.target.closest(".open-saved-report-button");
    if (openButton) {
      const report = savedReports[Number(openButton.dataset.index)];
      if (report) window.showToast(`Mock 원본 경로: ${report.filePath || "등록된 경로 없음"}`);
      return;
    }

    const unsaveButton = event.target.closest(".unsave-report-button");
    if (!unsaveButton) return;
    const index = Number(unsaveButton.dataset.index);
    const nextReports = savedReports.filter((_report, itemIndex) => itemIndex !== index);
    if (!writeStoredItems("saved-reports", nextReports)) return;
    savedReports = nextReports;
    renderSavedReports();
    window.showToast("감사사례 저장을 해제했습니다.");
  });

  if (window.auditCurrentUser) initialize(window.auditCurrentUser);
  else window.addEventListener("audit-auth-ready", (event) => initialize(event.detail.user), { once: true });
})();
