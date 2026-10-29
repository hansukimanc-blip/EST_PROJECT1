(function () {
  "use strict";

  const authClient = window.auditSupabaseClient;
  const form = document.getElementById("auth-form");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const loginModeButton = document.getElementById("login-mode-button");
  const signupModeButton = document.getElementById("signup-mode-button");
  const submitButton = document.getElementById("auth-submit-button");
  const message = document.getElementById("auth-message");
  let mode = "login";
  let redirecting = false;

  function showMessage(text, type) {
    message.textContent = text;
    message.className = "auth-message " + type;
    message.hidden = false;
  }

  function clearMessage() {
    message.hidden = true;
    message.textContent = "";
    message.className = "auth-message";
  }

  function friendlyError(error) {
    const value = String(error?.message || "").toLocaleLowerCase();
    if (value.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
    if (value.includes("email not confirmed")) return "이메일 인증을 완료한 후 로그인해 주세요.";
    if (value.includes("user already registered")) return "이미 가입된 이메일입니다. 로그인해 주세요.";
    if (value.includes("password") && (value.includes("least") || value.includes("short"))) return "비밀번호는 6자 이상 입력해 주세요.";
    if (value.includes("invalid email")) return "올바른 이메일 주소를 입력해 주세요.";
    if (value.includes("rate limit") || value.includes("too many")) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    if (value.includes("signup") && value.includes("disabled")) return "현재 회원가입을 사용할 수 없습니다. 관리자에게 문의해 주세요.";
    return error?.message || "인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }

  function goToMain() {
    if (redirecting) return;
    redirecting = true;
    window.location.replace("index.html");
  }

  function setMode(nextMode) {
    mode = nextMode;
    const isLogin = mode === "login";
    loginModeButton.classList.toggle("active", isLogin);
    signupModeButton.classList.toggle("active", !isLogin);
    loginModeButton.setAttribute("aria-selected", String(isLogin));
    signupModeButton.setAttribute("aria-selected", String(!isLogin));
    passwordInput.autocomplete = isLogin ? "current-password" : "new-password";
    submitButton.textContent = isLogin ? "로그인" : "회원가입";
    clearMessage();
  }

  if (!authClient) {
    showMessage("인증 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.", "error");
    form.querySelectorAll("input, button").forEach((element) => { element.disabled = true; });
    return;
  }

  loginModeButton.addEventListener("click", () => setMode("login"));
  signupModeButton.addEventListener("click", () => setMode("signup"));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    clearMessage();
    submitButton.disabled = true;
    submitButton.textContent = mode === "login" ? "로그인 중…" : "가입 처리 중…";

    const credentials = {
      email: emailInput.value.trim(),
      password: passwordInput.value
    };

    try {
      if (mode === "login") {
        const { data, error } = await authClient.auth.signInWithPassword(credentials);
        if (error) throw error;
        if (data.session) goToMain();
      } else {
        const { data, error } = await authClient.auth.signUp(credentials);
        if (error) throw error;
        if (data.session) {
          goToMain();
        } else {
          showMessage("회원가입이 완료되었습니다. 이메일의 인증 링크를 확인한 후 로그인해 주세요.", "success");
          passwordInput.value = "";
        }
      }
    } catch (error) {
      showMessage(friendlyError(error), "error");
    } finally {
      if (!redirecting) {
        submitButton.disabled = false;
        submitButton.textContent = mode === "login" ? "로그인" : "회원가입";
      }
    }
  });

  authClient.auth.onAuthStateChange((_event, session) => {
    if (session) goToMain();
  });

  authClient.auth.getSession().then(({ data, error }) => {
    if (error) showMessage(friendlyError(error), "error");
    else if (data.session) goToMain();
  }).catch((error) => showMessage(friendlyError(error), "error"));
})();
