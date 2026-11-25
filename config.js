(function installPawmarkConfig(globalScope) {
  const KINDVUE_BASE_URL = "https://kindvue.in";
  const PAWMARK_BASE_URL = KINDVUE_BASE_URL; 
  
  const BRAND = Object.freeze({"brandName":"Kindvue","brandLine":"Know better. Shop kinder.","scoreName":"Kindness Meter","pickName":"Kindvue Pick","alternativeName":"Kinder Choice","logoSource":"/final_kindvue_logo.png","logoTransparentSource":"/final_kindvue_logo_no_bg.png"});
  
  
  const ANALYTICS_INTERNAL_TRAFFIC = false;
  const DEBUG = false;
  
  const SHOPPING_MODE_ENABLED = true;
  
  
  const SHOPPING_MODE_BADGES = true;
  
  const SHOPPING_MODE_FILTERS = SHOPPING_MODE_BADGES;
  const SHOPPING_MODE_BETTER_CHOICE = SHOPPING_MODE_BADGES;
  const SHOPPING_MODE_CHECK_REQUESTS = SHOPPING_MODE_BADGES;
  const SHOPPING_MODE_ONBOARDING = true;
  const SHOPPING_MODE_ANALYTICS = false;

  function debugLog(...args) {
    if (DEBUG) console.log(...args);
  }

  function debugWarn(...args) {
    if (DEBUG) console.warn(...args);
  }

  debugLog(`[Kindvue CONFIG] ${PAWMARK_BASE_URL}`);

  function internalUrl(path = "/") {
    const internalPath = typeof path === "string" && path.trim() ? path.trim() : "/";

    try {
      const parsed = new URL(internalPath, `${PAWMARK_BASE_URL}/`);
      return new URL(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
        `${PAWMARK_BASE_URL}/`,
      ).toString();
    } catch {
      return `${PAWMARK_BASE_URL}/`;
    }
  }

  function getPawmarkUrl(path = "/") {
    const url = new URL(internalUrl(path));
    
    url.searchParams.set("kindvue_source", "extension");
    return url.toString();
  }

  function getPawmarkApiUrl(path) {
    return internalUrl(path);
  }

  globalScope.PawmarkConfig = Object.freeze({
    BRAND,
    KINDVUE_BASE_URL,
    DEBUG,
    SHOPPING_MODE_ENABLED,
    SHOPPING_MODE_BADGES,
    SHOPPING_MODE_FILTERS,
    SHOPPING_MODE_BETTER_CHOICE,
    SHOPPING_MODE_CHECK_REQUESTS,
    SHOPPING_MODE_ONBOARDING,
    SHOPPING_MODE_ANALYTICS,
    ANALYTICS_INTERNAL_TRAFFIC,
    debugLog,
    debugWarn,
    getPawmarkApiUrl,
    getPawmarkUrl,
    PAWMARK_BASE_URL,
  });
})(globalThis);
