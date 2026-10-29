(function () {
  "use strict";

  const authClient = window.auditSupabaseClient;
  const logoutButton = document.getElementById("logout-button");
  let redirecting = false;

  function goToLogin() {
    if (redirecting) return;
    redirecting = true;
    window.location.replace("auth.html");
  }

  function showAuthenticatedPage() {
    document.body.classList.remove("auth-pending");
    if (logoutButton) logoutButton.hidden = false;
  }

  if (!authClient) {
    goToLogin();
    return;
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = "로그아웃 중…";
      try {
        const { error } = await authClient.auth.signOut({ scope: "local" });
        if (error) throw error;
        goToLogin();
      } catch (_error) {
        logoutButton.disabled = false;
        logoutButton.textContent = "로그아웃";
        if (window.showToast) window.showToast("로그아웃하지 못했습니다. 다시 시도해 주세요.");
        else window.alert("로그아웃하지 못했습니다. 다시 시도해 주세요.");
      }
    });
  }

  authClient.auth.onAuthStateChange((event, session) => {
    if (session) showAuthenticatedPage();
    else if (event === "SIGNED_OUT") goToLogin();
  });

  authClient.auth.getSession().then(({ data, error }) => {
    if (error || !data.session) goToLogin();
    else showAuthenticatedPage();
  }).catch(goToLogin);
})();
