(function installPawmarkNykaaLifecycle(globalScope, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  globalScope.PawmarkNykaaLifecycle = api;
})(typeof globalThis === "object" ? globalThis : this, function createNykaaLifecycle() {
  "use strict";

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isAuthoritativeTitleSource(source) {
    const value = normalizeText(source);
    return /^(?:DOM |JSON-LD Product\.name|meta property=og:title)/.test(value);
  }

  function isPlaceholderTitle(value, brand = "") {
    const title = normalizeText(value);
    const normalizedBrand = normalizeText(brand).toLowerCase();
    const normalizedTitle = title.toLowerCase();
    const tokens = normalizedTitle.split(/\s+/).filter(Boolean);

    if (!title || title.length < 8 || tokens.length < 2) return true;
    if (normalizedBrand && normalizedTitle === normalizedBrand) return true;
    return /^(?:nykaa|loading(?: product)?|product(?: details)?|buy online|online shopping)[\s.\-]*$/i.test(title);
  }

  function assessIdentity(identity, options = {}) {
    const productId = normalizeText(identity?.productId);
    const title = normalizeText(identity?.title);
    const brand = normalizeText(identity?.brand);
    const sources = identity?.sources && typeof identity.sources === "object"
      ? identity.sources
      : {};
    const reasons = [];

    if (!productId) reasons.push("product ID unavailable");
    if (sources.productIdFrom === "URL product ID" && !options.allowPathProductId) {
      reasons.push("waiting for selected SKU or structured product ID");
    }
    if (!isAuthoritativeTitleSource(sources.titleFrom)) {
      reasons.push("authoritative product title unavailable");
    } else if (isPlaceholderTitle(title, brand)) {
      reasons.push("product title is incomplete or transitional");
    }
    if (!brand && !options.allowMissingBrand) reasons.push("brand unavailable");

    return {
      ready: reasons.length === 0,
      reasons,
      fields: {
        brandReady: Boolean(brand),
        productIdReady: Boolean(productId),
        titleReady: isAuthoritativeTitleSource(sources.titleFrom) && !isPlaceholderTitle(title, brand),
      },
    };
  }

  function createStabilityKey(identity) {
    const sources = identity?.sources && typeof identity.sources === "object"
      ? identity.sources
      : {};
    return [
      normalizeText(identity?.productId).toLowerCase(),
      normalizeText(identity?.title).toLowerCase(),
      normalizeText(identity?.brand).toLowerCase(),
      normalizeText(sources.productIdFrom).toLowerCase(),
      normalizeText(sources.titleFrom).toLowerCase(),
      normalizeText(sources.brandFrom).toLowerCase(),
    ].join("|");
  }

  return Object.freeze({
    assessIdentity,
    createStabilityKey,
    isAuthoritativeTitleSource,
    isPlaceholderTitle,
  });
});
