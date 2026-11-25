(function installPawmarkRetailerIdentity(globalScope, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  globalScope.PawmarkRetailerIdentity = api;
})(typeof globalThis === "object" ? globalThis : this, function createRetailerIdentityCore() {
  "use strict";

  const SUPPORTED_PLATFORMS = new Set(["amazon", "myntra", "nykaa", "flipkart"]);

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function parseUrl(value) {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  function meaningfulQueryValue(url, key) {
    const value = normalizeText(url?.searchParams.get(key));
    return value && !/^(?:undefined|null|none)$/i.test(value) ? value : "";
  }

  function normalizeProductId(platform, value) {
    const candidate = normalizeText(value);
    if (!candidate) return "";

    if (platform === "amazon") {
      return /^[A-Z0-9]{10}$/i.test(candidate) ? candidate.toUpperCase() : "";
    }

    if (platform === "myntra") {
      return /^\d{5,}$/.test(candidate) ? candidate : "";
    }

    if (platform === "nykaa") {
      return /^[A-Z0-9_-]{4,}$/i.test(candidate) ? candidate : "";
    }

    if (platform === "flipkart") {
      return /^[A-Z0-9]{8,}$/i.test(candidate) ? candidate.toUpperCase() : "";
    }

    return candidate;
  }

  function productIdFromUrl(platform, value) {
    const url = parseUrl(value);
    if (!url || !SUPPORTED_PLATFORMS.has(platform)) return undefined;

    if (platform === "amazon") {
      const match = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
      const productId = normalizeProductId(platform, match?.[1]);
      return productId ? { productId, source: "URL ASIN" } : undefined;
    }

    if (platform === "myntra") {
      const segments = url.pathname.split("/").filter(Boolean);
      const buyIndex = segments.findIndex((segment) => segment.toLowerCase() === "buy");
      const candidate = buyIndex > 0
        ? segments[buyIndex - 1]
        : [...segments].reverse().find((segment) => /^\d{5,}$/.test(segment));
      const productId = normalizeProductId(platform, candidate);
      return productId ? { productId, source: "URL product code" } : undefined;
    }

    if (platform === "nykaa") {
      const skuId = normalizeProductId(platform, meaningfulQueryValue(url, "skuId"));
      if (skuId) return { productId: skuId, source: "URL skuId" };

      const pathMatch = url.pathname.match(/\/p\/([A-Z0-9_-]+)(?:[/?]|$)/i);
      const productId = normalizeProductId(platform, pathMatch?.[1]);
      return productId ? { productId, source: "URL product ID" } : undefined;
    }

    const productId = normalizeProductId(platform, meaningfulQueryValue(url, "pid"));
    return productId ? { productId, source: "URL PID" } : undefined;
  }

  function cleanProductUrl(platform, value, productId) {
    const url = parseUrl(value);
    if (!url) return normalizeText(value);

    const normalizedId = normalizeProductId(platform, productId);
    const selectedNykaaSku = platform === "nykaa"
      ? meaningfulQueryValue(url, "skuId")
      : "";
    if (platform === "amazon") {
      const productPath = url.pathname.match(
        /^(.*\/(?:dp|gp\/product|gp\/aw\/d)\/)([A-Z0-9]{10})(?:\/.*)?$/i,
      );
      if (productPath) url.pathname = `${productPath[1]}${normalizedId || productPath[2]}`;
    }
    url.hash = "";
    url.search = "";

    if (platform === "nykaa" && normalizedId && selectedNykaaSku) {
      url.searchParams.set("skuId", normalizedId);
    } else if (platform === "flipkart" && normalizedId) {
      url.searchParams.set("pid", normalizedId);
    }

    return url.toString();
  }

  function isLikelyProductUrl(platform, value) {
    return Boolean(productIdFromUrl(platform, value));
  }

  function createFingerprint(identity) {
    const platform = normalizeText(identity?.platform).toLowerCase();
    const productId = normalizeText(identity?.productId).toLowerCase();
    const title = normalizeText(identity?.title).toLowerCase();
    return [platform, productId, title].join("|");
  }

  return Object.freeze({
    cleanProductUrl,
    createFingerprint,
    isLikelyProductUrl,
    normalizeProductId,
    normalizeText,
    productIdFromUrl,
  });
});
