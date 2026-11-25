(function initializePawmarkBundleEvidence(globalScope) {
  "use strict";

  const BUNDLE_WORDS = /\b(?:bundle|combo|kit|duo|trio|pair|set|regimen|gift\s+pack|assorted|variety\s+pack)\b/i;
  const PRODUCT_FORMS = /\b(?:face\s+wash|face\s+cleanser|body\s+wash|shampoo|conditioner|serum|sunscreen|moisturi[sz]er|cream|toner|lip\s+balm|roll[ -]?on|pimple\s+patch|cleanser|lotion)\b/gi;
  const EXCLUDED_ANCESTORS = [
    "[id*='review' i]",
    "[class*='review' i]",
    "[id*='sponsored' i]",
    "[class*='sponsored' i]",
    "[id*='recommend' i]",
    "[class*='recommend' i]",
    "[id*='carousel' i]",
    "[class*='carousel' i]",
    "[id*='frequently' i]",
    "[class*='frequently' i]",
  ].join(",");
  const SOURCE_ORDER = [
    "structured_metadata",
    "about_item",
    "feature_bullets",
    "product_description",
    "product_detail",
  ];
  const MAX_EVIDENCE_ITEMS = 18;
  const MAX_TEXT_LENGTH = 1200;

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function looksLikeBundleTitle(value) {
    const title = normalizeText(value);
    const forms = title.match(PRODUCT_FORMS) || [];
    const hasComponentSeparator = /(?:\+|&|\||,|\band\b|\bwith\b)/i.test(title);
    
    return BUNDLE_WORDS.test(title) || hasComponentSeparator
      && new Set(forms.map((form) => form.toLowerCase())).size >= 2;
  }

  function addEvidence(output, seen, source, value) {
    const text = normalizeText(value).slice(0, MAX_TEXT_LENGTH);
    const key = text.toLowerCase();
    if (!text || text.length < 8 || seen.has(key)) return;
    seen.add(key);
    output.push({ source, text });
  }

  function structuredEvidence(product, output, seen) {
    if (!product || typeof product !== "object") return;
    addEvidence(output, seen, "structured_metadata", product.description);

    const properties = Array.isArray(product.additionalProperty)
      ? product.additionalProperty
      : product.additionalProperty ? [product.additionalProperty] : [];
    properties.forEach((property) => {
      if (!property || typeof property !== "object") return;
      addEvidence(
        output,
        seen,
        "structured_metadata",
        [property.name, property.value].filter(Boolean).join(": "),
      );
    });
  }

  function domEvidence(documentRef, selectors, source, output, seen) {
    for (const selector of selectors || []) {
      let elements = [];
      try {
        elements = Array.from(documentRef.querySelectorAll(selector));
      } catch {
        continue;
      }

      for (const element of elements) {
        if (element.closest?.(EXCLUDED_ANCESTORS)) continue;
        addEvidence(output, seen, source, element.textContent);
        if (output.length >= MAX_EVIDENCE_ITEMS) return;
      }
    }
  }

  function collectBundleEvidence({ documentRef = document, structuredProduct, selectors = {} }) {
    const output = [];
    const seen = new Set();
    structuredEvidence(structuredProduct, output, seen);

    for (const source of SOURCE_ORDER.slice(1)) {
      domEvidence(documentRef, selectors[source], source, output, seen);
      if (output.length >= MAX_EVIDENCE_ITEMS) break;
    }

    return output.slice(0, MAX_EVIDENCE_ITEMS);
  }

  const api = {
    collectBundleEvidence,
    looksLikeBundleTitle,
    normalizeText,
  };

  globalScope.PawmarkBundleEvidence = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
