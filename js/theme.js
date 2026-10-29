(function () {
  "use strict";

  const storageKey = "theme";
  const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function storedTheme() {
    try {
      const value = window.localStorage.getItem(storageKey);
      return value === "dark" || value === "light" ? value : null;
    } catch (_error) {
      return null;
    }
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function updateButtons(theme) {
    const isDark = theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.textContent = isDark ? "☀" : "☾";
      button.setAttribute("aria-label", isDark ? "라이트 모드로 전환" : "다크 모드로 전환");
      button.setAttribute("title", isDark ? "라이트 모드" : "다크 모드");
      button.setAttribute("aria-pressed", String(isDark));
    });
  }

  function applyTheme(theme, persist) {
    document.documentElement.dataset.theme = theme;
    updateButtons(theme);
    if (!persist) return;
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch (_error) {
      // 저장소를 사용할 수 없는 환경에서도 현재 페이지의 테마 전환은 유지합니다.
    }
  }

  applyTheme(storedTheme() || (darkModeQuery.matches ? "dark" : "light"), false);

  document.addEventListener("DOMContentLoaded", () => {
    updateButtons(currentTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
      });
    });
  });

  darkModeQuery.addEventListener("change", (event) => {
    if (!storedTheme()) applyTheme(event.matches ? "dark" : "light", false);
  });
})();
