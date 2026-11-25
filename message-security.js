(function install(globalScope) {
  "use strict";
  const hosts = { "amazon.in": "amazon", "nykaa.com": "nykaa", "flipkart.com": "flipkart", "myntra.com": "myntra", "purplle.com": "purplle" };
  const types = ["PAWMARK_MATCH_PRODUCT", "PAWMARK_SUBMIT_PRODUCT", "PAWMARK_SUBMIT_REPORT", "PAWMARK_ANALYTICS", "PAWMARK_SAVED_STATE", "PAWMARK_SAVE_PRODUCT", "PAWMARK_SAVE_CONTEXT", "PAWMARK_OPEN_SAVE_PANEL"];
  const events = ["product_checked", "product_viewed", "brand_viewed", "evidence_opened", "caution_viewed", "alternative_shown", "alternative_clicked"];
  const accountTypes = ["PAWMARK_ACCOUNT_STATE", "PAWMARK_SIGN_IN", "PAWMARK_OPEN_ACCOUNT", "PAWMARK_RESEND_VERIFICATION", "PAWMARK_SIGN_OUT"];
  const sensitive = /(?:^|\/)(?:account|accounts|login|signin|checkout|cart|payment|orders|order-history|address|profile)(?:\/|$)/i;
  function productPage(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password || sensitive.test(decodeURIComponent(url.pathname))) return null;
      const domain = Object.keys(hosts).find((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
      if (!domain) return null;
      const platform = hosts[domain];
      const patterns = { amazon: /\/(?:dp|gp\/product)\/[a-z0-9]{10}(?:\/|$)/i, nykaa: /\/p\/\d+(?:\/|$)/, flipkart: /\/p\/itm[a-z0-9]+/i, myntra: /\/\d+\/buy(?:\/|$)/, purplle: /\/product\/[^/]+/ };
      if (!patterns[platform].test(url.pathname)) return null;
      const pid = platform === "flipkart" ? url.searchParams.get("pid") : null;
      url.search = ""; url.hash = "";
      if (pid && /^[a-z0-9]{1,80}$/i.test(pid)) url.searchParams.set("pid", pid);
      return { platform, url: url.href };
    } catch { return null; }
  }
  function isPopup(sender, runtimeId) {
    
    return new RegExp(`^chrome-extension://${runtimeId}/popup\\.html(?:\\?tab=[0-9]+)?$`).test(sender?.url || '') && (sender.frameId ?? 0) === 0;
  }
  function clean(message, sender, runtimeId) {
    try {
      const alternatives = message?.type === "PAWMARK_ALTERNATIVES_BATCH";
      const check = message?.type === 'PAWMARK_CHECK_REQUEST';
      const batch = message?.type === "PAWMARK_MATCH_BATCH" || alternatives || check;
      const contract = check ? globalScope.PawmarkCheckRequestContract : alternatives ? globalScope.PawmarkAlternativesContract : globalScope.PawmarkBatchContract;
      if (!runtimeId || sender?.id !== runtimeId || (sender.frameId ?? 0) !== 0 || ![...types, ...accountTypes, "PAWMARK_MATCH_BATCH", "PAWMARK_ALTERNATIVES_BATCH", "PAWMARK_CHECK_REQUEST"].includes(message?.type) || JSON.stringify(message).length > (batch ? contract?.MAX_BYTES || 0 : 32768)) return null;
      if (batch) {
        if (!sender.tab || !globalScope.PawmarkAmazonCards?.isListingPage(sender.url || sender.tab.url) || Object.keys(message).some(key => !["type", "request"].includes(key))) return null;
        const request = contract.cleanRequest(message.request);
        return request ? { type: message.type, request } : null;
      }
      const popup = isPopup(sender, runtimeId);
      if (accountTypes.includes(message.type)) {
        if (!popup) return null;
        const fields = message.type === "PAWMARK_OPEN_ACCOUNT" ? ["type", "destination", "analyticsSession", "analyticsOptOut"] : ["type", "analyticsSession", "analyticsOptOut"];
        if (Object.keys(message).some((key) => !fields.includes(key))) return null;
        if (message.type === "PAWMARK_OPEN_ACCOUNT" && !["account", "watchlist", "lists", "home"].includes(message.destination)) return null;
        return { type: message.type, ...(message.destination ? { destination: message.destination } : {}) };
      }
      if (["PAWMARK_SAVE_CONTEXT", "PAWMARK_SAVED_STATE", "PAWMARK_SAVE_PRODUCT"].includes(message.type)) {
        if (!popup || !Number.isSafeInteger(message.tabId) || message.tabId < 0) return null;
        const fields = ["type", "tabId"];
        if (message.type !== "PAWMARK_SAVE_CONTEXT") fields.push("pageUrl", "contextId", ...(message.type === "PAWMARK_SAVED_STATE" ? ["productIds"] : ["productId", "action"]));
        if (Object.keys(message).some(key => !fields.includes(key))) return null;
        const result = { type: message.type, tabId: message.tabId };
        if (message.type === "PAWMARK_SAVE_CONTEXT") return result;
        if (typeof message.pageUrl !== "string" || message.pageUrl.length > 2048 || !productPage(message.pageUrl) || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(message.contextId || '')) return null;
        result.pageUrl = message.pageUrl; result.contextId = message.contextId;
        const validId = id => typeof id === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(id);
        if (message.type === "PAWMARK_SAVED_STATE") {
          if (!Array.isArray(message.productIds) || !message.productIds.length || message.productIds.length > 24 || !message.productIds.every(validId)) return null;
          result.productIds = [...new Set(message.productIds)];
        } else {
          if (!validId(message.productId) || !["add", "watch", "unwatch"].includes(message.action)) return null;
          result.productId = message.productId; result.action = message.action;
        }
        return result;
      }
      if (!sender.tab) return null;
      if (message.type === "PAWMARK_OPEN_SAVE_PANEL") {
        if (!Number.isSafeInteger(sender.tab.id) || !productPage(sender.url || sender.tab.url) || Object.keys(message).some(key => !["type", "analyticsSession", "analyticsOptOut"].includes(key))) return null;
        return { type: message.type, tabId: sender.tab.id };
      }
      if (message.type === 'PAWMARK_ANALYTICS' && globalScope.PawmarkAmazonCards?.isListingPage(sender.url || sender.tab.url)) {
        if (Object.keys(message).some(key => !['type','analyticsSession','analyticsOptOut','events'].includes(key)) || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(message.analyticsSession || '')) return null;
        if (!Array.isArray(message.events) || !message.events.length || message.events.length > 10) return null;
        const cleaned = message.events.map(event => globalScope.PawmarkShoppingAnalyticsContract?.cleanEvent(event));
        return cleaned.every(Boolean) ? { type: message.type, analyticsSession: message.analyticsSession, analyticsOptOut: message.analyticsOptOut === true, events: cleaned } : null;
      }
      const page = productPage(sender.url || sender.tab.url);
      if (!page) return null;
      const result = { type: message.type, analyticsOptOut: message.analyticsOptOut === true };
      if (message.analyticsSession !== undefined) {
        if (typeof message.analyticsSession !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(message.analyticsSession)) return null;
        result.analyticsSession = message.analyticsSession;
      }
      if (message.type === "PAWMARK_MATCH_PRODUCT") {
        const request = message.request;
        if (typeof request?.page?.title !== "string" || !request.page.title.trim() || request.page.title.length > 512) return null;
        result.request = { platform: page.platform, page: { title: request.page.title, url: page.url } };
        if (request.detectedBrand !== undefined) { if (typeof request.detectedBrand !== "string" || request.detectedBrand.length > 160) return null; result.request.detectedBrand = request.detectedBrand; }
        if (request.retailerIdentity?.productId !== undefined) { if (typeof request.retailerIdentity.productId !== "string" || request.retailerIdentity.productId.length > 160) return null; result.request.retailerIdentity = { productId: request.retailerIdentity.productId }; }
        if (request.page.evidence !== undefined) {
          if (!Array.isArray(request.page.evidence) || request.page.evidence.length > 18) return null;
          const allowed = ["structured_metadata", "about_item", "feature_bullets", "product_description", "product_detail"];
          if (request.page.evidence.some((item) => !allowed.includes(item.source) || typeof item.text !== "string" || item.text.length > 1200)) return null;
          result.request.page.evidence = request.page.evidence.map(({ source, text }) => ({ source, text }));
        }
      } else if (message.type === "PAWMARK_ANALYTICS") {
        if (!Array.isArray(message.events) || message.events.length > 10 || message.events.some((event) => !events.includes(event.eventType))) return null;
        result.events = message.events.map((event) => Object.fromEntries(["eventType", "productId", "brandId", "alternativeProductId", "platform"].filter((key) => event[key] !== undefined).map((key) => { if (typeof event[key] !== "string" || event[key].length > 160) throw new Error(); return [key, event[key]]; })));
      } else {
        const allowed = message.type === "PAWMARK_SUBMIT_PRODUCT" ? ["productName", "brandName", "platform", "notes"] : ["reportType", "productSlug", "brandSlug", "productName", "brandName", "platform", "message"];
        if (!message.payload || typeof message.payload !== "object") return null;
        result.payload = Object.fromEntries(allowed.filter((key) => message.payload[key] !== undefined).map((key) => { const value = message.payload[key]; if (typeof value !== "string" || value.length > 2000) throw new Error(); return [key, value]; }));
        result.payload[message.type === "PAWMARK_SUBMIT_PRODUCT" ? "sourceUrl" : "pageUrl"] = page.url;
      }
      return result;
    } catch { return null; }
  }
  globalScope.PawmarkMessageSecurity = Object.freeze({ clean, productPage, isPopup });
  if (typeof module !== "undefined") module.exports = globalScope.PawmarkMessageSecurity;
})(globalThis);
