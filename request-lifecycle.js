(function installPawmarkRequestLifecycle(globalScope) {
  "use strict";

  const TRANSIENT_CODES = new Set([
    "BACKEND_UNAVAILABLE",
    "NETWORK_ERROR",
    "REQUEST_TIMEOUT",
    "RUNTIME_MESSAGE_ERROR",
  ]);

  function isTransientFailure(error) {
    const code = String(error?.code || "").toUpperCase();
    const status = Number(error?.details?.status || error?.status || 0);
    return TRANSIENT_CODES.has(code) || status === 429 || status >= 500;
  }

  function wait(delayMs) {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  async function runWithSingleRetry(request, options = {}) {
    const retryEnabled = options.retry !== false;
    const delayMs = Math.max(0, Number(options.delayMs) || 0);
    try {
      return await request(1);
    } catch (error) {
      if (!retryEnabled || !isTransientFailure(error)) throw error;
      if (delayMs > 0) await wait(delayMs);
      return request(2);
    }
  }

  function shouldAcceptResponse({
    requestId,
    activeRequestId,
    requestFingerprint,
    currentFingerprint,
  }) {
    return Boolean(
      requestFingerprint &&
      currentFingerprint &&
      requestId === activeRequestId &&
      requestFingerprint === currentFingerprint
    );
  }

  const api = Object.freeze({
    isTransientFailure,
    runWithSingleRetry,
    shouldAcceptResponse,
  });

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    globalScope.PawmarkRequestLifecycle = api;
  }
})(typeof globalThis === "object" ? globalThis : this);
