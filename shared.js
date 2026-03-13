(() => {
  "use strict";

  const SUPABASE_URL = "https://dtxrbjppxyggjkpybdcu.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_YGhtBnurAg3otWaBMXKjvQ_TQRQkvc9";

  const SESSION_KEY = "bh_session_user";

  let _client = null;
  function getSupabaseClient() {
    if (_client) return _client;
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Supabase library not loaded. Include @supabase/supabase-js before shared.js");
    }
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _client;
  }

  function getSessionUser() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getCurrentUsername() {
    const user = getSessionUser();
    if (!user) return "";
    return String(user.name || user.phone || "").trim();
  }

  window.BH = Object.freeze({
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    getSupabaseClient,
    getSessionUser,
    getCurrentUsername
  });
})();

