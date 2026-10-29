(function () {
  "use strict";

  const reports = window.mockReports || [];
  const form = document.getElementById("search-form");
  const keywordInput = document.getElementById("keyword-input");
  const yearFrom = document.getElementById("year-from");
  const yearTo = document.getElementById("year-to");
  const departmentFilter = document.getElementById("department-filter");
  const drafterFilter = document.getElementById("drafter-filter");
  const typeFilter = document.getElementById("type-filter");
  const resultCount = document.getElementById("result-count");
  const resultsList = document.getElementById("results-list");
  const searchSummary = document.getElementById("search-summary");
  const resetButton = document.getElementById("reset-button");

  function uniqueValues(key) {
    return [...new Set(reports.map((report) => report[key]))].sort((a, b) => a > b ? 1 : -1);
  }

  function addOptions(select, values, descending) {
    const sorted = descending ? [...values].sort((a, b) => b - a) : values;
    sorted.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value + (typeof value === "number" ? "년" : "");
      select.appendChild(option);
    });
  }

  function parseKeywords(value) {
    return [...new Set(value.split(/[\s,]+/).map((word) => word.trim()).filter(Boolean))];
  }

  function userStorageKey(type, user) {
    return `audit-${type}:${user.id}`;
  }

  function saveRecentSearch(searchData) {
    const user = window.auditCurrentUser;
    if (!user) return;
    try {
      const key = userStorageKey("recent-searches", user);
      const stored = JSON.parse(window.localStorage.getItem(key) || "[]");
      const searches = Array.isArray(stored) ? stored : [];
      searches.unshift(searchData);
      window.localStorage.setItem(key, JSON.stringify(searches));
    } catch (_error) {
      window.showToast("최근 검색 내역을 저장하지 못했습니다.");
    }
  }

  function highlight(text, keywords) {
    if (!keywords.length) return window.escapeHtml(text);
    const escapedWords = keywords.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp("(" + escapedWords.join("|") + ")", "gi");
    return window.escapeHtml(text).replace(pattern, "<mark>$1</mark>");
  }

  function makePreview(content, keywords) {
    if (!keywords.length) return content.length > 155 ? content.slice(0, 155) + "…" : content;
    const lowerContent = content.toLocaleLowerCase();
    const positions = keywords.map((word) => lowerContent.indexOf(word.toLocaleLowerCase())).filter((position) => position >= 0);
    const firstPosition = positions.length ? Math.min(...positions) : 0;
    const start = Math.max(0, firstPosition - 45);
    const end = Math.min(content.length, firstPosition + 135);
    return (start > 0 ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
  }

  function resultCard(report, keywords) {
    const preview = makePreview(report.content, keywords);
    return `
      <article class="result-card">
        <div class="result-main">
          <div class="result-meta">
            <span>${report.year}년</span><span>${window.escapeHtml(report.department)}</span><span>기안자 ${window.escapeHtml(report.drafter)}</span><span>${window.escapeHtml(report.auditType)}</span>
          </div>
          <h3>${highlight(report.title, keywords)}</h3>
          <p class="file-name"><span aria-hidden="true">HWP</span>${highlight(report.fileName, keywords)}</p>
          <p class="preview">${highlight(preview, keywords)}</p>
        </div>
        <button class="button button-outline original-button" type="button" data-id="${report.id}">원본 HWP 열기</button>
      </article>`;
  }

  function renderEmpty(hasConditions) {
    resultCount.textContent = "0건";
    resultsList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 120 90" aria-hidden="true">
          <rect x="28" y="12" width="64" height="68" rx="7"/><path d="M42 33h36M42 47h29M42 61h20"/>
          <circle cx="86" cy="67" r="16"/><path d="m97 78 10 9"/>
        </svg>
        <h3>${hasConditions ? "조건에 맞는 감사사례가 없습니다" : "검색할 키워드나 조건을 입력해 주세요"}</h3>
        <p>${hasConditions ? "키워드 또는 필터 조건을 변경해 다시 검색해 보세요." : "등록된 모든 보고서에서 관련 사례를 찾아드립니다."}</p>
      </div>`;
  }

  function search() {
    const keywords = parseKeywords(keywordInput.value);
    const mode = form.elements["search-mode"].value;
    const from = Number(yearFrom.value) || null;
    const to = Number(yearTo.value) || null;
    const department = departmentFilter.value;
    const drafter = drafterFilter.value;
    const auditType = typeFilter.value;
    const hasConditions = keywords.length || from || to || department || drafter || auditType;

    if (from && to && from > to) {
      window.showToast("시작 연도는 종료 연도보다 이전이어야 합니다.");
      yearFrom.focus();
      return;
    }

    const filtered = reports.filter((report) => {
      const lowerText = report.content.toLocaleLowerCase();
      const keywordMatches = keywords.map((word) => lowerText.includes(word.toLocaleLowerCase()));
      const matchesKeyword = !keywords.length || (mode === "and" ? keywordMatches.every(Boolean) : keywordMatches.some(Boolean));
      return matchesKeyword
        && (!from || report.year >= from)
        && (!to || report.year <= to)
        && (!department || report.department === department)
        && (!drafter || report.drafter === drafter)
        && (!auditType || report.auditType === auditType);
    });

    resultCount.textContent = filtered.length + "건";
    resultsList.innerHTML = filtered.map((report) => resultCard(report, keywords)).join("");
    if (!filtered.length) renderEmpty(Boolean(hasConditions));

    const summaryParts = [];
    if (keywords.length) summaryParts.push(`<strong>${keywords.map(window.escapeHtml).join(", ")}</strong> · ${mode.toUpperCase()}`);
    if (from || to) summaryParts.push(`${from || "전체"} ~ ${to || "전체"}년`);
    if (department) summaryParts.push(window.escapeHtml(department));
    if (drafter) summaryParts.push("기안자 " + window.escapeHtml(drafter));
    if (auditType) summaryParts.push(window.escapeHtml(auditType));
    searchSummary.innerHTML = summaryParts.length ? "적용 조건: " + summaryParts.join(" / ") : "전체 등록 보고서를 표시하고 있습니다.";
    searchSummary.hidden = false;

    saveRecentSearch({
      keywords: keywordInput.value.trim(),
      searchedAt: new Date().toISOString(),
      mode,
      filters: {
        yearFrom: yearFrom.value,
        yearTo: yearTo.value,
        department,
        drafter,
        auditType
      }
    });
  }

  function applyPendingSearch(user) {
    try {
      const key = userStorageKey("pending-search", user);
      const value = window.localStorage.getItem(key);
      if (!value) return;
      window.localStorage.removeItem(key);
      const pending = JSON.parse(value);
      const filters = pending.filters || {};
      keywordInput.value = pending.keywords || "";
      yearFrom.value = filters.yearFrom || "";
      yearTo.value = filters.yearTo || "";
      departmentFilter.value = filters.department || "";
      drafterFilter.value = filters.drafter || "";
      typeFilter.value = filters.auditType || "";
      const modeInput = form.querySelector(`input[name="search-mode"][value="${pending.mode === "or" ? "or" : "and"}"]`);
      if (modeInput) modeInput.checked = true;
      search();
    } catch (_error) {
      window.showToast("검색 조건을 불러오지 못했습니다.");
    }
  }

  const years = uniqueValues("year");
  addOptions(yearFrom, years, true);
  addOptions(yearTo, years, true);
  addOptions(departmentFilter, uniqueValues("department"), false);
  addOptions(drafterFilter, uniqueValues("drafter"), false);
  addOptions(typeFilter, uniqueValues("auditType"), false);

  if (window.auditCurrentUser) applyPendingSearch(window.auditCurrentUser);
  else window.addEventListener("audit-auth-ready", (event) => applyPendingSearch(event.detail.user), { once: true });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    search();
  });

  resetButton.addEventListener("click", () => {
    form.reset();
    searchSummary.hidden = true;
    renderEmpty(false);
    keywordInput.focus();
  });

  resultsList.addEventListener("click", (event) => {
    const button = event.target.closest(".original-button");
    if (!button) return;
    const report = reports.find((item) => item.id === Number(button.dataset.id));
    window.showToast(`Mock 원본 경로: ${report.filePath}`);
  });

  renderEmpty(false);
})();
