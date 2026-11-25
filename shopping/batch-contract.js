(function install(scope) {
  "use strict";
  const MAX_ITEMS = 25, MAX_BYTES = 262144;
  const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
  function productTarget(value) {
    try {
      if (!text(value, 2048)) return null;
      const url = new URL(value);
      if (url.protocol !== "https:" || !["amazon.in", "www.amazon.in"].includes(url.hostname) || url.port || url.username || url.password || url.search || url.hash) return null;
      const route = url.pathname.match(/^\/(dp|gp\/product|gp\/aw\/d)\/([A-Za-z0-9_-]{1,160})\/?$/);
      if (!route) return null;
      const asin = /^[A-Za-z0-9]{10}$/.test(route[2]) ? route[2].toUpperCase() : null;
      return { asin, url: asin ? `https://www.amazon.in/dp/${asin}` : `https://www.amazon.in/${route[1]}/${route[2]}` };
    } catch { return null; }
  }
  function cleanRequest(value) {
    try {
      if (!value || value.retailer !== "amazon_in" || Object.keys(value).some(key => !["retailer", "items"].includes(key)) || !Array.isArray(value.items) || !value.items.length || value.items.length > MAX_ITEMS) return null;
      const keys = new Set(), items = [];
      for (const item of value.items) {
        if (!item || Object.keys(item).some(key => !["clientKey", "retailerProductId", "title", "brand", "productUrl"].includes(key)) || !text(item.clientKey, 1600) || keys.has(item.clientKey) || !text(item.title, 1200) || item.title.trim().length < 3) return null;
        if (item.brand != null && !text(item.brand, 120)) return null;
        if (item.retailerProductId != null && (typeof item.retailerProductId !== "string" || !/^[A-Za-z0-9]{10}$/.test(item.retailerProductId))) return null;
        const target = productTarget(item.productUrl), asin = item.retailerProductId?.toUpperCase() || target?.asin || null;
        if (!target || asin && target.asin && asin !== target.asin) return null;
        keys.add(item.clientKey);
        items.push({ clientKey: item.clientKey, retailerProductId: asin, title: item.title.trim(), brand: item.brand?.trim() || null, productUrl: asin ? `https://www.amazon.in/dp/${asin}` : target.url });
      }
      return { retailer: "amazon_in", items };
    } catch { return null; }
  }
  
  function fingerprint(item) {
    const normalize = value => (value || "").replace(/\s+/g, " ").trim().toLowerCase();
    return JSON.stringify([item.retailerProductId || item.productUrl, normalize(item.title), normalize(item.brand)]);
  }
  const api = Object.freeze({ MAX_ITEMS, MAX_BYTES, cleanRequest, fingerprint });
  scope.PawmarkBatchContract = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(globalThis);
