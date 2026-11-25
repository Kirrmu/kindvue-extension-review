(function install(scope) {
  "use strict";
  const storage = chrome.storage.session;
  const locked = storage.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  const key = "pawmarkExtensionCredential";
  let generation = 0, authorizing = null;
  let requestSessionPromise;
  const invalid = ["SESSION_EXPIRED", "ACCOUNT_UNAVAILABLE"];
  const fail = (code) => Object.assign(new Error("Couldn't connect to Kindvue. Try again."), { code });
  const random = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const base = new URL(scope.PawmarkConfig.PAWMARK_BASE_URL);
  const safeBase = !base.username && !base.password && base.pathname === "/" && !base.search && !base.hash && (base.protocol === "https:" && base.hostname === "kindvue.in");
  async function clear(reason = "signed_out") {
    generation++;
    await locked;
    await storage.remove(key);
    await storage.set({ pawmarkAccountReason: reason });
  }
  async function request(operation, body, authenticated = true, metadata = {}) {
    if (!safeBase || !["authorize-request", "token", "me", "saved-products", "revoke", "resend-verification", "check-request"].includes(operation)) throw fail("CONNECTION_FAILED");
    await locked;
    const optional = operation === 'check-request';
    let start = generation;
    let saved = authenticated || optional ? (await storage.get(key))[key] : null;
    if (authenticated && !saved) {
      const reason = (await storage.get("pawmarkAccountReason")).pawmarkAccountReason;
      throw fail(reason === "expired" ? "SESSION_EXPIRED" : reason === "unavailable" ? "ACCOUNT_UNAVAILABLE" : "SIGN_IN_REQUIRED");
    }
    if (saved && (!/^[A-Za-z0-9_-]{43}$/.test(saved.token) || !Number.isFinite(Date.parse(saved.expiresAt)) || Date.parse(saved.expiresAt) <= Date.now())) {
      await clear("expired"); if (!optional) throw fail("SESSION_EXPIRED"); saved = null; start = generation;
    }
    let requestSession;
    if (optional) {
      requestSessionPromise ||= (async () => {
        const old = (await storage.get('pawmarkCheckRequestSession')).pawmarkCheckRequestSession;
        if (typeof old === 'string' && /^[A-Za-z0-9_-]{43}$/.test(old)) return old;
        const value = random(); await storage.set({pawmarkCheckRequestSession:value}); return value;
      })();
      requestSession = await requestSessionPromise;
    }
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(new URL(`/api/extension/${operation}`, base).href, {
        
        method: "POST", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(saved ? { Authorization: `Bearer ${saved.token}` } : {}), ...(requestSession ? {'X-Pawmark-Request-Session':requestSession} : {}), ...(metadata.analyticsOptOut ? { "X-Pawmark-Analytics-Opt-Out": "1" } : {}), ...(scope.PawmarkConfig.ANALYTICS_INTERNAL_TRAFFIC ? { "X-Pawmark-Test": "1" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json();
      if (start !== generation) throw fail("SIGN_IN_REQUIRED");
      if (!response.ok) {
        const code = response.status === 401 ? "SESSION_EXPIRED" : response.status === 429 ? "RATE_LIMITED" : ["EMAIL_VERIFICATION_REQUIRED", "ACCOUNT_UNAVAILABLE", "SCOPE_REQUIRED", "EXTENSION_UNAVAILABLE"].includes(data.code) ? data.code : response.status === 404 ? "PRODUCT_UNAVAILABLE" : "CONNECTION_FAILED";
        if ((authenticated || optional) && invalid.includes(code)) await clear(code === "ACCOUNT_UNAVAILABLE" ? "unavailable" : "expired");
        throw fail(code);
      }
      return data;
    } catch (error) { throw error.code ? error : fail("CONNECTION_FAILED"); }
    finally { clearTimeout(timer); }
  }
  async function account() {
    try {
      const data = await request("me");
      if (data.authenticated !== true || typeof data.emailVerified !== "boolean" || data.accountStatus !== "ACTIVE") throw fail("CONNECTION_FAILED");
      return { authenticated: true, emailVerified: data.emailVerified, accountStatus: "ACTIVE", displayName: typeof data.displayName === "string" ? data.displayName.slice(0, 80) : null };
    } catch (error) {
      if (["SIGN_IN_REQUIRED", ...invalid].includes(error.code)) return { authenticated: false, state: error.code === "SESSION_EXPIRED" ? "expired" : error.code === "ACCOUNT_UNAVAILABLE" ? "unavailable" : "signed_out" };
      throw error;
    }
  }
  async function authorize() {
    if (authorizing) return authorizing;
    authorizing = (async () => {
      const current = await account();
      if (current.authenticated) return current;
      const start = generation;
      const verifier = random(), state = random();
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
      const challenge = btoa(String.fromCharCode(...digest)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
      const initiated = await request("authorize-request", { extensionId: chrome.runtime.id, challenge, state }, false);
      if (!/^\/account\/extension\?request=[A-Za-z0-9_-]{43}$/.test(initiated.path)) throw fail("CONNECTION_FAILED");
      let callback;
      try { callback = await chrome.identity.launchWebAuthFlow({ url: new URL(initiated.path, base).href, interactive: true }); }
      catch { throw fail("AUTH_CANCELLED"); }
      const result = new URL(callback), expected = new URL(chrome.identity.getRedirectURL("pawmark"));
      const params = new URLSearchParams(result.hash.slice(1));
      if (result.origin !== expected.origin || result.pathname !== expected.pathname || result.search || params.get("state") !== state || !/^[A-Za-z0-9_-]{43}$/.test(params.get("code") || "") || start !== generation) throw fail("AUTH_CANCELLED");
      const credential = await request("token", { code: params.get("code"), verifier }, false);
      if (!/^[A-Za-z0-9_-]{43}$/.test(credential.token) || !Number.isFinite(Date.parse(credential.expiresAt)) || start !== generation) throw fail("AUTH_CANCELLED");
      await locked;
      await storage.set({ [key]: { token: credential.token, expiresAt: credential.expiresAt }, pawmarkAccountReason: "connected" });
      return account();
    })();
    try { return await authorizing; } finally { authorizing = null; }
  }
  async function signOut() {
    
    try { await request("revoke", {}); }
    catch (error) { if (!["SIGN_IN_REQUIRED", ...invalid].includes(error.code)) throw error; }
    await clear();
    return { authenticated: false, state: "signed_out" };
  }
  scope.PawmarkAccountAuth = Object.freeze({ account, authorize, signOut, request });
})(globalThis);
