(function () {
  "use strict";

  const projectUrl = "https://kgwlpwecwewfwgmohvla.supabase.co";
  const publishableKey = "sb_publishable_bQhiCmYKDKb82uZXN1fNTA_LULDmGgp";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase JS 라이브러리를 불러오지 못했습니다.");
    return;
  }

  window.auditSupabaseClient = window.supabase.createClient(projectUrl, publishableKey);
})();
