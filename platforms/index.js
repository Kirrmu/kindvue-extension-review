(function initializePawmarkPlatforms(globalScope) {
  "use strict";

  const adapters = [];
  const identityCore = globalScope.PawmarkRetailerIdentity;
  const retailerNames = ["Amazon India", "Amazon", "Nykaa", "Flipkart", "Myntra", "Purplle"];

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function query(selector) {
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  function queryAll(selector) {
    try {
      return Array.from(document.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  function firstText(selectors) {
    return firstTextResult(selectors).value;
  }

  function firstTextResult(selectors) {
    for (const selector of selectors) {
      const value = normalizeText(query(selector)?.textContent);

      if (value) {
        return { value, source: `DOM ${selector}` };
      }
    }

    return { value: "", source: "" };
  }

  function metaContent(key, value) {
    return normalizeText(query(`meta[${key}="${value}"]`)?.getAttribute("content"));
  }

  function metaContentResult(key, value) {
    const content = metaContent(key, value);
    return {
      value: content,
      source: content ? `meta ${key}=${value}` : "",
    };
  }

  function matchesHostname(value, domain) {
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      return hostname === domain || hostname.endsWith(`.${domain}`);
    } catch {
      return false;
    }
  }

  function flattenJsonLd(value, output) {
    if (Array.isArray(value)) {
      value.forEach((entry) => flattenJsonLd(entry, output));
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    output.push(value);

    if (Array.isArray(value["@graph"])) {
      value["@graph"].forEach((entry) => flattenJsonLd(entry, output));
    }
  }

  function getStructuredProducts() {
    const records = [];

    queryAll('script[type="application/ld+json"]').forEach((script) => {
      const source = script.textContent?.trim();

      if (!source) {
        return;
      }

      try {
        flattenJsonLd(JSON.parse(source), records);
      } catch {
        
      }
    });

    return records.filter((record) => {
      const type = record["@type"];
      return type === "Product" || (Array.isArray(type) && type.includes("Product"));
    });
  }

  function getStructuredProduct() {
    return getStructuredProducts()[0] || null;
  }

  function structuredBrand(product = getStructuredProduct()) {
    const brand = product?.brand;

    if (typeof brand === "string") {
      return normalizeText(brand);
    }

    if (brand && typeof brand === "object") {
      return normalizeText(brand.name);
    }

    return "";
  }

  function structuredBrandResult(product = getStructuredProduct()) {
    const value = cleanBrand(structuredBrand(product));
    return { value, source: value ? "JSON-LD Product.brand" : "" };
  }

  function structuredTitleResult(product = getStructuredProduct()) {
    const value = normalizeText(product?.name);
    return { value, source: value ? "JSON-LD Product.name" : "" };
  }

  function structuredSkuResult(product = getStructuredProduct()) {
    const value = normalizeText(product?.sku || product?.mpn || product?.productID);
    return { value, source: value ? "JSON-LD Product.sku" : "" };
  }

  function structuredImage(product = getStructuredProduct()) {
    const image = product?.image;

    if (typeof image === "string") {
      return image;
    }

    if (Array.isArray(image)) {
      const firstImage = image.find((entry) => typeof entry === "string");
      return firstImage || "";
    }

    if (image && typeof image === "object") {
      return typeof image.url === "string" ? image.url : "";
    }

    return "";
  }

  function imageFromElement(element) {
    if (!element) {
      return "";
    }

    const direct =
      element.currentSrc ||
      element.getAttribute("src") ||
      element.getAttribute("data-old-hires") ||
      element.getAttribute("data-zoom-image") ||
      element.getAttribute("data-src");

    if (direct && !direct.startsWith("data:")) {
      return direct;
    }

    const dynamicImages = element.getAttribute("data-a-dynamic-image");

    if (dynamicImages) {
      try {
        const imageMap = JSON.parse(dynamicImages);
        const firstUrl = Object.keys(imageMap)[0];
        return firstUrl || "";
      } catch {
        return "";
      }
    }

    const backgroundImage = element.style?.backgroundImage || getComputedStyle(element).backgroundImage;
    const backgroundMatch = backgroundImage?.match(/url\(["']?(.*?)["']?\)/i);
    return backgroundMatch?.[1] || "";
  }

  function firstImage(selectors) {
    for (const selector of selectors) {
      const imageUrl = imageFromElement(query(selector));

      if (imageUrl) {
        return imageUrl;
      }
    }

    return "";
  }

  function cleanTitle(value, platformName = "") {
    let title = normalizeText(value)
      .replace(/\s*[|–—]\s*Buy\s+Online\b.*$/i, "")
      .replace(/\s*[-|–—]\s*(?:Amazon(?:\.in)?|Nykaa|Flipkart|Myntra|Purplle)\b.*$/i, "")
      .replace(/\s+Buy\s+Online\s+at\b.*$/i, "")
      .replace(/\s+Online\s+at\s+(?:Amazon|Nykaa|Flipkart|Myntra|Purplle)\b.*$/i, "");

    for (const retailerName of retailerNames) {
      title = title.replace(new RegExp(`^${retailerName}\\s*[-|:]\\s*`, "i"), "");
    }

    if (platformName) {
      title = title.replace(new RegExp(`\\s*[-|:]\\s*${platformName}\\s*$`, "i"), "");
    }

    return normalizeText(title);
  }

  function cleanBrand(value) {
    return normalizeText(value)
      .replace(/^brand\s*[:\-]?\s*/i, "")
      .replace(/^visit\s+the\s+/i, "")
      .replace(/\s+store$/i, "")
      .replace(/^by\s+/i, "")
      .replace(/\s*[-|]\s*(?:Amazon|Nykaa|Flipkart|Myntra|Purplle).*$/i, "")
      .trim();
  }

  function inferBrandFromTitle(title) {
    const [firstToken = ""] = normalizeText(title).split(/\s+/);
    const blocked = new Set(["the", "new", "pack", "combo", "buy", "with", "for", "set"]);

    if (firstToken.length < 2 || blocked.has(firstToken.toLowerCase())) {
      return "";
    }

    return firstToken;
  }

  function resolveTitle(selectors, platformName) {
    return resolveTitleResult(selectors, platformName).value;
  }

  function resolveTitleResult(selectors, platformName, options = {}) {
    const platformResult = firstTextResult(selectors);
    const headingResult = firstTextResult(["h1"]);
    const structuredResult = structuredTitleResult();
    const openGraphResult = metaContentResult("property", "og:title");
    const documentResult = {
      value: normalizeText(document.title),
      source: document.title ? "document.title fallback" : "",
    };
    const candidates = options.structuredFirst
      ? [structuredResult, platformResult, headingResult, openGraphResult, documentResult]
      : [platformResult, headingResult, structuredResult, openGraphResult, documentResult];
    const selected = candidates.find((candidate) => candidate.value) || { value: "", source: "" };

    return {
      value: cleanTitle(selected.value, platformName),
      rawValue: selected.value,
      source: selected.source,
    };
  }

  function resolveBrand(selectors, title) {
    return resolveBrandResult(selectors, title, { allowTitleInference: true }).value;
  }

  function resolveBrandResult(selectors, title, options = {}) {
    const structuredResult = structuredBrandResult();
    if (options.structuredFirst && structuredResult.value) return structuredResult;

    const selectedResult = firstTextResult(selectors);
    const selectedBrand = cleanBrand(selectedResult.value);
    if (selectedBrand) {
      return { value: selectedBrand, source: selectedResult.source };
    }

    if (structuredResult.value) return structuredResult;

    const inferred = options.allowTitleInference ? inferBrandFromTitle(title) : "";
    return {
      value: inferred,
      source: inferred ? "title first-token fallback" : "",
    };
  }

  function resolveImage(selectors) {
    return (
      firstImage(selectors) ||
      structuredImage() ||
      metaContent("property", "og:image") ||
      metaContent("name", "twitter:image")
    );
  }

  function canonicalProductUrl() {
    const canonical = query('link[rel="canonical"]')?.getAttribute("href");

    if (canonical) {
      try {
        const parsed = new URL(canonical, window.location.href);
        if (parsed.hostname === window.location.hostname) {
          return parsed.href;
        }
      } catch {
        
      }
    }

    return `${window.location.origin}${window.location.pathname}`;
  }

  function registerAdapter(adapter) {
    if (!adapter?.id || typeof adapter.matchesLocation !== "function") {
      return;
    }

    adapters.push(adapter);
  }

  function getAdapter(url = window.location.href) {
    try { if (/(?:^|\/)(?:account|accounts|login|signin|checkout|cart|payment|orders|address|profile)(?:\/|$)/i.test(decodeURIComponent(new URL(url).pathname))) return undefined; } catch { return undefined; }
    return adapters.find((adapter) => {
      try {
        return adapter.matchesLocation(url);
      } catch {
        return false;
      }
    });
  }

  function extractContext(adapter) {
    if (typeof adapter.getIdentity === "function") {
      const identity = adapter.getIdentity();
      const title = normalizeText(identity?.title);
      const brand = normalizeText(identity?.brand);
      const productId = normalizeText(identity?.productId);

      const baseFingerprint = identityCore?.createFingerprint({
        platform: adapter.id,
        productId,
        title,
      }) || [adapter.id, productId, title].join("|").toLowerCase();

      const pageEvidence = globalScope.PawmarkBundleEvidence?.looksLikeBundleTitle(title)
        ? globalScope.PawmarkBundleEvidence.collectBundleEvidence({
            structuredProduct: getStructuredProduct(),
            selectors: adapter.bundleEvidenceSelectors,
          })
        : [];

      return {
        productTitle: title,
        rawProductTitle: normalizeText(identity?.rawTitle) || title,
        pageUrl: normalizeText(identity?.url) || window.location.href,
        hostname: window.location.hostname,
        platform: adapter.id,
        platformName: adapter.getPlatformName(),
        retailerProductId: productId || undefined,
        detectedBrand: brand,
        productImageUrl: normalizeText(identity?.imageUrl),
        pageEvidence,
        fingerprint: adapter.id === "nykaa"
          ? `${baseFingerprint}|${brand.toLowerCase()}`
          : baseFingerprint,
        identitySources: identity?.sources || {},
      };
    }

    const title = normalizeText(adapter.getProductTitle());
    const brand = normalizeText(adapter.getBrandName(title));

    const pageEvidence = globalScope.PawmarkBundleEvidence?.looksLikeBundleTitle(title)
      ? globalScope.PawmarkBundleEvidence.collectBundleEvidence({
          structuredProduct: getStructuredProduct(),
          selectors: adapter.bundleEvidenceSelectors,
        })
      : [];

    return {
      productTitle: title,
      pageUrl: adapter.getProductUrl(),
      hostname: window.location.hostname,
      platform: adapter.id,
      platformName: adapter.getPlatformName(),
      detectedBrand: brand,
      productImageUrl: normalizeText(adapter.getProductImage()),
      pageEvidence,
      fingerprint: identityCore?.createFingerprint({ platform: adapter.id, title }) || `${adapter.id}||${title}`,
      identitySources: {},
    };
  }

  globalScope.PawmarkPlatforms = {
    extractContext,
    getAdapter,
    registerAdapter,
    utils: {
      canonicalProductUrl,
      cleanBrand,
      firstText,
      firstTextResult,
      getStructuredProduct,
      hasStructuredProduct: () => Boolean(getStructuredProduct()),
      inferBrandFromTitle,
      matchesHostname,
      metaContent,
      normalizeText,
      query,
      queryAll,
      resolveBrand,
      resolveBrandResult,
      resolveImage,
      resolveTitle,
      resolveTitleResult,
      structuredBrandResult,
      structuredSkuResult,
      structuredTitleResult,
    },
  };
})(globalThis);
