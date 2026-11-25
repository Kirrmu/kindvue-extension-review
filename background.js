importScripts("config.js", "request-lifecycle.js", "platforms/identity-core.js", "shopping/amazon-cards.js", "shopping/batch-contract.js", "shopping/network-policy.js", "shopping/alternatives-contract.js", "shopping/check-request-contract.js", "shopping/analytics-contract.js", "message-security.js", "account-auth.js");

const PAWMARK_BASE_URL = globalThis.PawmarkConfig.PAWMARK_BASE_URL;
const getPawmarkApiUrl = globalThis.PawmarkConfig.getPawmarkApiUrl;
const PAWMARK_DEBUG = globalThis.PawmarkConfig.DEBUG === true;
const debugLog = globalThis.PawmarkConfig.debugLog;
const debugWarn = globalThis.PawmarkConfig.debugWarn;
const requestLifecycle = globalThis.PawmarkRequestLifecycle;
const REQUEST_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 250;

class PawmarkRequestError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "PawmarkRequestError";
    this.code = code;
    this.details = details;
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function logRequestFailure(url, error) {
  if (!PAWMARK_DEBUG) return;
  debugWarn("[Kindvue background] request failed:", {
    url,
    code: error.code || "UNKNOWN_ERROR",
    message: errorMessage(error),
    status: error.details?.status,
  });
}

async function fetchOnce(url, options, attempt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  debugLog("[Kindvue background] fetch attempt", { attempt, url });

  let response;
  try {
    response = await fetch(url, { ...options, credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", signal: controller.signal });
  } catch (error) {
    clearTimeout(timeout);
    const timedOut = error instanceof Error && error.name === "AbortError";
    const failure = new PawmarkRequestError(
      timedOut ? "REQUEST_TIMEOUT" : "BACKEND_UNAVAILABLE",
      timedOut
        ? `Kindvue did not respond within ${REQUEST_TIMEOUT_MS}ms.`
        : `Could not reach Kindvue at ${PAWMARK_BASE_URL}.`,
      { cause: errorMessage(error), url },
    );
    logRequestFailure(url, failure);
    throw failure;
  }
  try {
  if (!response.ok) {
    const failure = new PawmarkRequestError(
      "HTTP_ERROR",
      `Kindvue returned HTTP ${response.status}.`,
      { status: response.status, url, ...(["/api/match/batch", "/api/alternatives/batch"].includes(new URL(url).pathname) ? { retryAfterMs: globalThis.PawmarkShoppingNetwork.retryAfter(response.headers.get("retry-after")) } : {}) },
    );
    logRequestFailure(url, failure);
    throw failure;
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    const failure = new PawmarkRequestError(
      "MALFORMED_JSON",
      "Kindvue returned an unreadable response.",
      { cause: errorMessage(error), url },
    );
    logRequestFailure(url, failure);
    throw failure;
  }

  if (!data || typeof data !== "object") {
    const failure = new PawmarkRequestError(
      "MALFORMED_RESPONSE",
      "Kindvue returned an unexpected response.",
      { url },
    );
    logRequestFailure(url, failure);
    throw failure;
  }

  return data;
  } finally { clearTimeout(timeout); }
}

async function fetchFromPawmark(path, options = {}, retry = false) {
  const headers = { ...options.headers };
  delete headers['x-pawmark-page-session'];
  delete headers['x-kindvue-analytics-consent'];
  options = { ...options, headers: { ...headers, 'x-kindvue-client': 'extension', 'x-pawmark-analytics-opt-out': '1' } };
  if (globalThis.PawmarkConfig.ANALYTICS_INTERNAL_TRAFFIC) options = { ...options, headers: { ...options.headers, "x-pawmark-test": "1" } };
  const url = getPawmarkApiUrl(path);
  if (PAWMARK_DEBUG) {
    debugLog(path === "/api/match" ? "[Kindvue API]" : "[Kindvue background] attempting:", url);
  }
  const data = await requestLifecycle.runWithSingleRetry(
    (attempt) => fetchOnce(url, options, attempt),
    { retry, delayMs: RETRY_DELAY_MS },
  );
  return { base: PAWMARK_BASE_URL, data };
}

async function handleMatchProduct(message) {
  const request = message.request && typeof message.request === "object"
    ? message.request
    : undefined;
  const page = request?.page && typeof request.page === "object" ? request.page : undefined;
  const title = String(page?.title || "").trim();

  if (!title) {
    return {
      ok: false,
      error: "No product title provided.",
    };
  }

  const { base, data } = await fetchFromPawmark("/api/match", {
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }, true);

  return {
    ok: true,
    apiBase: base,
    result: data,
  };
}

async function handleSubmitProduct(message) {
  const payload = message.payload && typeof message.payload === "object" ? message.payload : {};
  const { base, data } = await fetchFromPawmark("/api/submissions", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return {
    ok: true,
    apiBase: base,
    result: data,
  };
}

async function handleSubmitReport(message) {
  const payload = message.payload && typeof message.payload === "object" ? message.payload : {};
  const { base, data } = await fetchFromPawmark("/api/reports", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return {
    ok: true,
    apiBase: base,
    result: data,
  };
}

function serializeBackgroundError(error) {
  if (error instanceof PawmarkRequestError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "BACKGROUND_ERROR",
    message: "The Kindvue background request could not be completed.",
  };
}

async function publicSaveContext(tabId) {
  const unavailable = () => new PawmarkRequestError('STALE_CONTEXT', 'Reopen Kindvue on the product page.');
  try {
    const preference = await chrome.storage.local.get(['kindvueShoppingPausedV1', 'kindvueShoppingEnabledV1']);
    if (preference.kindvueShoppingPausedV1 === true || preference.kindvueShoppingEnabledV1 === false) throw unavailable();
    const tab = await chrome.tabs.get(tabId);
    const page = globalThis.PawmarkMessageSecurity.productPage(tab.url);
    if (!page) throw unavailable();
    const context = await chrome.tabs.sendMessage(tabId, { type: 'PAWMARK_PUBLIC_SAVE_CONTEXT' }, { frameId: 0 });
    if (!context || context.pageUrl !== tab.url || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(context.contextId || '') || !Array.isArray(context.products) || !context.products.length || context.products.length > 24) throw unavailable();
    if (context.products.some(item => !/^[A-Za-z0-9_-]{1,160}$/.test(item?.id || '') || typeof item.name !== 'string' || !item.name || item.name.length > 240)) throw unavailable();
    const latest = await chrome.tabs.get(tabId);
    if (latest.url !== tab.url) throw unavailable();
    return { tabId, pageUrl: tab.url, contextId: context.contextId, platform: page.platform, products: context.products.map(({ id, name }) => ({ id, name })) };
  } catch { throw unavailable(); }
}

async function handleSavedProducts(message) {
  try {
    const context = await publicSaveContext(message.tabId);
    const ids = message.type === 'PAWMARK_SAVED_STATE' ? message.productIds : [message.productId];
    if (context.pageUrl !== message.pageUrl || context.contextId !== message.contextId || ids.some(id => !context.products.some(product => product.id === id))) throw new PawmarkRequestError('STALE_CONTEXT', 'Reopen Kindvue on the product page.');
    message.platform = context.platform;
    const data = await globalThis.PawmarkAccountAuth.request("saved-products", message.type === "PAWMARK_SAVED_STATE"
      ? { action: "state", productIds: message.productIds }
      : { action: message.action, productId: message.productId, platform: message.platform }, true, message);
    
    if (message.type === "PAWMARK_SAVED_STATE") {
      if (!Array.isArray(data.products)) throw new Error();
      const products = message.productIds.map((productId) => {
        const item = data.products.find((entry) => entry.productId === productId);
        if (!item || typeof item.watched !== "boolean" || typeof item.inShoppingList !== "boolean") throw new Error();
        return { productId, watched: item.watched, inShoppingList: item.inShoppingList };
      });
      return { ok: true, result: { products } };
    }
    const key = message.action === "add" ? "inShoppingList" : "watched";
    if (typeof data[key] !== "boolean") throw new Error();
    return { ok: true, result: { [key]: data[key], changed: data.changed === true } };
  } catch (error) {
    return { ok: false, error: { code: error.code || "SAVE_FAILED", message: "Couldn't save product. Try again." } };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  message = globalThis.PawmarkMessageSecurity.clean(message, sender, chrome.runtime.id);
  if (!message) {
    sendResponse({ ok: false, error: "Invalid Kindvue message." });
    return false;
  }

  const respond = async () => {
    try {
      message.analyticsOptOut = true;
      delete message.analyticsSession;
      if (message.type === 'PAWMARK_OPEN_SAVE_PANEL') {
        const context = await publicSaveContext(message.tabId);
        const tab = await chrome.tabs.get(context.tabId);
        if (!tab.active || tab.url !== (sender.url || sender.tab.url)) throw new PawmarkRequestError('STALE_CONTEXT', 'Open Kindvue from your browser toolbar.');
        try { await chrome.action.openPopup({ windowId: tab.windowId }); }
        catch { await chrome.tabs.create({ url: `chrome-extension://${chrome.runtime.id}/popup.html?tab=${tab.id}` }); }
        sendResponse({ ok: true, result: {} }); return;
      }
      if (message.type === 'PAWMARK_SAVE_CONTEXT') {
        sendResponse({ ok: true, result: await publicSaveContext(message.tabId) }); return;
      }
      if (message.type === "PAWMARK_SIGN_IN") {
        const account = await globalThis.PawmarkAccountAuth.authorize();
        if (!globalThis.PawmarkMessageSecurity.isPopup(sender, chrome.runtime.id)) delete account.displayName;
        sendResponse({ ok: true, result: account }); return;
      }
      if (message.type === "PAWMARK_ACCOUNT_STATE") {
        const account = await globalThis.PawmarkAccountAuth.account();
        
        if (!globalThis.PawmarkMessageSecurity.isPopup(sender, chrome.runtime.id)) delete account.displayName;
        sendResponse({ ok: true, result: account }); return;
      }
      if (message.type === "PAWMARK_SIGN_OUT") {
        sendResponse({ ok: true, result: await globalThis.PawmarkAccountAuth.signOut() }); return;
      }
      if (message.type === "PAWMARK_RESEND_VERIFICATION") {
        await globalThis.PawmarkAccountAuth.request("resend-verification", {});
        sendResponse({ ok: true, result: { message: "If verification is needed, a new email has been requested." } }); return;
      }
      if (message.type === "PAWMARK_OPEN_ACCOUNT") {
        const paths = { account: "/account", watchlist: "/watchlist", lists: "/shopping-list", home: "/" };
        await chrome.tabs.create({ url: globalThis.PawmarkConfig.getPawmarkUrl(paths[message.destination]) });
        sendResponse({ ok: true, result: {} }); return;
      }
      if (message.type === "PAWMARK_SAVED_STATE" || message.type === "PAWMARK_SAVE_PRODUCT") {
        sendResponse(await handleSavedProducts(message)); return;
      }
      if (message.type === "PAWMARK_ANALYTICS") {
        
        sendResponse({ ok: true });
        return;
      }
      if (message.type === "PAWMARK_MATCH_PRODUCT") {
        sendResponse(await handleMatchProduct(message));
        return;
      }
      if (message.type === 'PAWMARK_CHECK_REQUEST') {
        try {
          const data = await globalThis.PawmarkAccountAuth.request('check-request',message.request,false);
          if (!['created','already_exists','linked_to_existing'].includes(data.status)) throw new Error('Invalid response');
          sendResponse({ok:true,status:data.status});
        } catch { sendResponse({ok:false}); }
        return;
      }
      if (message.type === "PAWMARK_MATCH_BATCH" || message.type === "PAWMARK_ALTERNATIVES_BATCH") {
        try {
          const endpoint = message.type === "PAWMARK_MATCH_BATCH" ? "/api/match/batch" : "/api/alternatives/batch";
          const { data } = await fetchFromPawmark(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message.request) });
          sendResponse({ ok: true, result: data });
        } catch (error) {
          const status = error.details?.status;
          sendResponse({ ok: false, error: { code: "BATCH_UNAVAILABLE", retryable: !status || status === 429 || status >= 500, retryAfterMs: error.details?.retryAfterMs || 0 } });
        }
        return;
      }

      if (message.type === "PAWMARK_SUBMIT_PRODUCT") {
        sendResponse(await handleSubmitProduct(message));
        return;
      }

      if (message.type === "PAWMARK_SUBMIT_REPORT") {
        sendResponse(await handleSubmitReport(message));
        return;
      }

      sendResponse({
        ok: false,
        error: "Unsupported Kindvue message type.",
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error: message.type.startsWith("PAWMARK_") && ["SIGN_IN_REQUIRED", "SESSION_EXPIRED", "ACCOUNT_UNAVAILABLE", "EMAIL_VERIFICATION_REQUIRED", "EXTENSION_UNAVAILABLE", "SCOPE_REQUIRED", "RATE_LIMITED", "AUTH_CANCELLED", "CONNECTION_FAILED"].includes(error.code)
          ? { code: error.code, message: "Couldn't connect to Kindvue. Try again." } : serializeBackgroundError(error),
      });
    }
  };

  respond();

  return true;
});
