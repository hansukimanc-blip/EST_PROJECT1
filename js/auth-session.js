(function () {
  "use strict";

  const authClient = window.auditSupabaseClient;
  const logoutButton = document.getElementById("logout-button");
  const adminMenuItems = document.querySelectorAll("[data-admin-menu]");
  const requiresAdmin = document.body.dataset.requireAdmin === "true";
  let redirecting = false;
  let sessionSetupPromise = null;

  function goToLogin() {
    if (redirecting) return;
    redirecting = true;
    window.location.replace("auth.html");
  }

  function goToUserPage() {
    if (redirecting) return;
    redirecting = true;
    window.location.replace("index.html");
  }

  async function getUserRole(user) {
    const { data, error } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return data?.role === "admin" ? "admin" : "user";
  }

  async function showAuthenticatedPage(session) {
    if (sessionSetupPromise) return sessionSetupPromise;
    sessionSetupPromise = (async () => {
      let role = "user";
      try {
        role = await getUserRole(session.user);
      } catch (_error) {
        if (requiresAdmin) {
          goToUserPage();
          return;
        }
      }

      if (requiresAdmin && role !== "admin") {
        goToUserPage();
        return;
      }

      window.auditCurrentUser = session.user;
      window.auditCurrentRole = role;
      adminMenuItems.forEach((item) => { item.hidden = role !== "admin"; });
      document.body.classList.remove("auth-pending");
      if (logoutButton) logoutButton.hidden = false;
      window.dispatchEvent(new CustomEvent("audit-auth-ready", { detail: { user: session.user, role } }));
    })();
    return sessionSetupPromise;
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
    if (session) showAuthenticatedPage(session);
    else if (event === "SIGNED_OUT") goToLogin();
  });

  authClient.auth.getSession().then(({ data, error }) => {
    if (error || !data.session) goToLogin();
    else showAuthenticatedPage(data.session);
  }).catch(goToLogin);
})();
