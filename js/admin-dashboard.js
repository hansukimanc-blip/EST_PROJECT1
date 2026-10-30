(function () {
  "use strict";

  const supabaseClient = window.auditSupabaseClient;
  const reportCount = document.getElementById("admin-report-count");
  const searchCount = document.getElementById("admin-search-count");
  const savedCount = document.getElementById("admin-saved-count");
  const searchActivityCount = document.getElementById("search-activity-count");
  const savedActivityCount = document.getElementById("saved-activity-count");
  const searchActivityBody = document.getElementById("admin-search-activity-body");
  const savedActivityBody = document.getElementById("admin-saved-activity-body");
  let initialized = false;

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

  function filterText(search) {
    const parts = [];
    if (search.year_from || search.year_to) parts.push(`${search.year_from || "전체"}~${search.year_to || "전체"}년`);
    if (search.department) parts.push(search.department);
    if (search.drafter) parts.push(`기안자 ${search.drafter}`);
    if (search.audit_type) parts.push(search.audit_type);
    return parts.length ? parts.join(" / ") : "없음";
  }

  function reportFromRelation(value) {
    return Array.isArray(value) ? value[0] : value;
  }

  function renderSearchActivity(rows, count) {
    searchCount.textContent = `${count || 0}건`;
    searchActivityCount.textContent = `${count || 0}건`;
    searchActivityBody.innerHTML = rows.map((search) => `
      <tr>
        <td>${window.escapeHtml(search.user_email || "-")}</td>
        <td>${window.escapeHtml(search.keywords || "전체")}</td>
        <td>${window.escapeHtml(String(search.search_mode || "and").toUpperCase())}</td>
        <td><span class="table-content" title="${window.escapeHtml(filterText(search))}">${window.escapeHtml(filterText(search))}</span></td>
        <td>${window.escapeHtml(formatDate(search.searched_at))}</td>
      </tr>`).join("") || `<tr><td class="empty-table-cell" colspan="5">조회 가능한 최근 검색 기록이 없습니다.</td></tr>`;
  }

  function renderSavedActivity(rows, count) {
    savedCount.textContent = `${count || 0}건`;
    savedActivityCount.textContent = `${count || 0}건`;
    savedActivityBody.innerHTML = rows.map((saved) => {
      const report = reportFromRelation(saved.audit_reports) || {};
      return `
        <tr>
          <td>${window.escapeHtml(saved.user_email || "-")}</td>
          <td><span class="table-content" title="${window.escapeHtml(report.title || "-")}">${window.escapeHtml(report.title || "-")}</span></td>
          <td>${window.escapeHtml(report.department || "-")}</td>
          <td>${window.escapeHtml(report.audit_type || "-")}</td>
          <td>${window.escapeHtml(formatDate(saved.saved_at))}</td>
        </tr>`;
    }).join("") || `<tr><td class="empty-table-cell" colspan="5">조회 가능한 저장 기록이 없습니다.</td></tr>`;
  }

  async function initialize() {
    if (initialized) return;
    initialized = true;
    if (!supabaseClient || !window.auditCurrentUser) return;

    const [reportsResult, searchesResult, savedResult] = await Promise.all([
      supabaseClient.from("audit_reports").select("id", { count: "exact", head: true }),
      supabaseClient
        .from("recent_searches")
        .select("user_email, keywords, searched_at, search_mode, year_from, year_to, department, drafter, audit_type", { count: "exact" })
        .order("searched_at", { ascending: false })
        .limit(50),
      supabaseClient
        .from("saved_reports")
        .select("user_email, saved_at, audit_reports (title, department, audit_type)", { count: "exact" })
        .order("saved_at", { ascending: false })
        .limit(50)
    ]);

    let hasError = false;
    if (reportsResult.error) {
      reportCount.textContent = "-";
      hasError = true;
    } else {
      reportCount.textContent = `${reportsResult.count || 0}건`;
    }

    if (searchesResult.error) {
      renderSearchActivity([], 0);
      hasError = true;
    } else {
      renderSearchActivity(searchesResult.data || [], searchesResult.count);
    }

    if (savedResult.error) {
      renderSavedActivity([], 0);
      hasError = true;
    } else {
      renderSavedActivity(savedResult.data || [], savedResult.count);
    }

    if (hasError) window.showToast("일부 운영 현황을 불러오지 못했습니다.");
  }

  if (window.auditCurrentUser) initialize();
  else window.addEventListener("audit-auth-ready", initialize, { once: true });
})();
