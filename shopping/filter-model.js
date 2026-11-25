(function install(scope) {
  "use strict";
  const defaults = Object.freeze({ enabled: true, score: "all", vegan: false, crueltyFree: false, mode: "dim" });
  function settings(value) {
    return { enabled: value?.enabled !== false, score: ["70", "85"].includes(value?.score) ? value.score : "all",
      vegan: value?.vegan === true, crueltyFree: value?.crueltyFree === true, mode: value?.mode === "hide" ? "hide" : "dim" };
  }
  const active = value => value.enabled && (value.score !== "all" || value.vegan || value.crueltyFree);
  function evaluate(entry, value) {
    if (!active(value)) return { state: "PASS", reason: null };
    const result = entry.matchResult;
    if (entry.matchState !== "resolved" || !result || result.clientKey !== entry.key) return { state: "PENDING", reason: entry.matchState === "failed" ? "unavailable" : "pending" };
    if (result.state !== "product" || !result.product?.id) return { state: "FAIL", reason: "evidence" };
    const product = result.product;
    let insufficient = false, fails = false;
    if (value.score !== "all") {
      if (typeof product.score !== "number" || !Number.isFinite(product.score) || product.score < 0 || product.score > 100) insufficient = true;
      else if (product.score < Number(value.score)) fails = true;
    }
    
    if (value.vegan && product.veganStatus !== "vegan") {
      if (product.veganStatus === "non_vegan") fails = true;
      else insufficient = true;
    }
    if (value.crueltyFree && product.crueltyFreeStatus !== "confirmed") {
      if (product.crueltyFreeStatus === "not_cruelty_free") fails = true;
      else insufficient = true;
    }
    return fails || insufficient ? { state: "FAIL", reason: fails ? "criteria" : "evidence" } : { state: "PASS", reason: null };
  }
  const api = Object.freeze({ defaults, settings, active, evaluate });
  scope.PawmarkShoppingFilterModel = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(globalThis);
