(function installPawmarkUiUtils(globalScope) {
  const PLATFORM_ORDER = ["Amazon", "Nykaa", "Flipkart", "Myntra", "Purplle", "Official"];

  const PLATFORM_ALIASES = new Map([
    ["amazon", "Amazon"],
    ["amazon india", "Amazon"],
    ["amazon_in", "Amazon"],
    ["amazon_india", "Amazon"],
    ["nykaa", "Nykaa"],
    ["flipkart", "Flipkart"],
    ["myntra", "Myntra"],
    ["purplle", "Purplle"],
    ["official", "Official"],
    ["official site", "Official"],
    ["official website", "Official"],
    ["brand website", "Official"],
  ]);

  function normalizePlatformKey(platform) {
    return String(platform || "")
      .trim()
      .toLowerCase()
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ");
  }

  function getPlatformLabel(platform) {
    const key = normalizePlatformKey(platform);
    if (!key) return "Other";
    if (PLATFORM_ALIASES.has(key)) return PLATFORM_ALIASES.get(key);

    return key
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function isSafePurchaseUrl(value) {
    if (/^\/go\/[a-zA-Z0-9_-]+(?:\?.*)?$/.test(String(value || ""))) return true;
    try {
      const url = new URL(String(value));
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }

  function getPurchaseLinks(links) {
    const unique = new Map();

    for (const link of Array.isArray(links) ? links : []) {
      if (!link || !isSafePurchaseUrl(link.url)) continue;
      const label = getPlatformLabel(link.platform);
      const key = `${label.toLowerCase()}|${link.url}`;
      if (!unique.has(key)) unique.set(key, { ...link, affiliateActive: link.affiliateActive === true, label });
    }

    return [...unique.values()].sort((left, right) => {
      const leftIndex = PLATFORM_ORDER.indexOf(left.label);
      const rightIndex = PLATFORM_ORDER.indexOf(right.label);
      const leftOrder = leftIndex === -1 ? PLATFORM_ORDER.length : leftIndex;
      const rightOrder = rightIndex === -1 ? PLATFORM_ORDER.length : rightIndex;
      return leftOrder - rightOrder || left.label.localeCompare(right.label);
    });
  }

  function getScoreTone(score) {
    const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
    if (safeScore >= 85) return { key: "pawmarked", status: "Pawmarked" };
    if (safeScore >= 70) return { key: "good", status: "Good" };
    if (safeScore >= 50) return { key: "mixed", status: "Mixed" };
    if (safeScore >= 30) return { key: "poor", status: "Poor" };
    return { key: "avoid", status: "Avoid" };
  }

  function getScoreLabel(status) {
    return status === "Pawmarked" ? (globalScope.PawmarkConfig?.BRAND?.pickName || "Kindvue Pick") : status;
  }

  function getConceptIcon(name) {
    const paths = {
      caution: `
        <path d="M12 8v5.1M12 16.4h.01" stroke="currentColor" stroke-linecap="round" stroke-width="1.6"></path>
        <path d="m9.9 4.6-6.65 11.5A2.2 2.2 0 0 0 5.15 19h13.7a2.2 2.2 0 0 0 1.9-2.9L14.1 4.6a2.42 2.42 0 0 0-4.2 0Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.45"></path>
      `,
      "cruelty-free": `
        <path d="M12 3.2 19 6v5.1c0 4.5-2.8 7.7-7 9.7-4.2-2-7-5.2-7-9.7V6l7-2.8Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.45"></path>
        <circle cx="9" cy="10" fill="currentColor" r="1"></circle>
        <circle cx="12" cy="8.8" fill="currentColor" r="1"></circle>
        <circle cx="15" cy="10" fill="currentColor" r="1"></circle>
        <path d="M9.4 14c0-1.35 1.1-2.35 2.6-2.35s2.6 1 2.6 2.35c0 1.1-1 1.65-2.6 1.65S9.4 15.1 9.4 14Z" fill="currentColor"></path>
      `,
      vegan: `
        <path d="M12 20v-8.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"></path>
        <path d="M11.8 12.3c-3.7.2-6.1-1.7-6.4-5.6 3.8-.2 6.2 1.7 6.4 5.6Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"></path>
        <path d="M12.2 15.1c.2-4 2.2-6.4 6.4-6.6-.2 4.1-2.3 6.4-6.4 6.6Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"></path>
      `,
    };
    const path = paths[name];
    if (!path) return "";

    return `<svg aria-hidden="true" class="pawmark-concept-icon" fill="none" focusable="false" viewBox="0 0 24 24">${path}</svg>`;
  }

  globalScope.PawmarkUI = Object.freeze({
    getConceptIcon,
    getPlatformLabel,
    getPurchaseLinks,
    getScoreTone,
    getScoreLabel,
  });
})(globalThis);
