
(function install(scope) {
  "use strict";
  const contract = scope.PawmarkBatchContract || (typeof module === "object" ? require("./batch-contract") : null);
  const network = scope.PawmarkShoppingNetwork || (typeof module === "object" ? require("./network-policy") : null);
  function createQueue({ send, apply, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, debug = () => {}, onCapacity = () => {} }) {
    const records = new Map(), bindings = new Map(), cache = new Map();
    const stats = { batchRequests: 0, cacheHits: 0, failures: 0, productMatches: 0, brandMatches: 0, unknown: 0, bundleMatches: 0 };
    let timer, inFlight = false, generation = 0;
    const policy=network.createPolicy(now), MAX_PENDING=128;
    const pendingCount=()=>[...records.values()].filter(record=>['queued','in_flight'].includes(record.state)).length;
    function notify(record) { for (const entry of record.entries.values()) apply(entry, record.state, record.result ? Object.freeze({ ...record.result, clientKey: entry.key }) : null); }
    function remember(record) {
      cache.delete(record.fingerprint);
      cache.set(record.fingerprint, { state: record.state, result: record.result, until: now() + 300000 });
      while (cache.size > 300) cache.delete(cache.keys().next().value);
    }
    function pruneCache() { for (const [key, value] of cache) if (value.until <= now()) cache.delete(key); }
    function schedule(delay = 200) { if (!inFlight && timer === undefined) timer = setTimer(pump, delay); }
    function remove(entry) {
      const record = bindings.get(entry.element);
      if (!record) return;
      bindings.delete(entry.element); record.entries.delete(entry.element);
      if (!record.entries.size && record.state !== "in_flight") records.delete(record.fingerprint);
    }
    function add(entry) {
      remove(entry); pruneCache();
      const { retailerProductId, title, brand, productUrl } = entry.identity;
      const request = contract.cleanRequest({ retailer: "amazon_in", items: [{ clientKey: entry.key, retailerProductId, title, brand, productUrl }] });
      if (!request) { apply(entry, "failed", null); return; }
      const item = request.items[0], fingerprint = contract.fingerprint(item);
      let record = records.get(fingerprint);
      if (!record) {
        const saved = cache.get(fingerprint);
        if(!saved&&pendingCount()>=MAX_PENDING){apply(entry,'deferred',null);return;}
        if (saved) { stats.cacheHits++; cache.delete(fingerprint); cache.set(fingerprint, saved); }
        record = { fingerprint, item, entries: new Map(), state: saved?.state || "queued", result: saved?.result || null, attempts: 0, due: now() };
        records.set(fingerprint, record);
      }
      record.entries.set(entry.element, entry); bindings.set(entry.element, record);
      apply(entry,record.state,record.result?Object.freeze({...record.result,clientKey:entry.key}):null);schedule();
    }
    function readResults(response, batch) {
      if (!Array.isArray(response?.results) || response.results.length !== batch.length) throw new Error("INVALID_RESPONSE");
      const expected = new Set(batch.map(record => record.item.clientKey)), found = new Map();
      for (const result of response.results) {
        if (!expected.has(result?.clientKey) || found.has(result.clientKey) || !["product", "brand", "none", "bundle"].includes(result.state)) throw new Error("INVALID_RESPONSE");
        if (result.state === "product" && (typeof result.product?.id !== "string" || typeof result.product?.slug !== "string" || !Number.isFinite(result.product?.score) || result.product.score < 0 || result.product.score > 100)) throw new Error("INVALID_RESPONSE");
        if (result.state === "brand" && (typeof result.brand?.id !== "string" || typeof result.brand?.name !== "string" || result.product || "score" in result.brand)) throw new Error("INVALID_RESPONSE");
        if (result.state === "none" && (result.product || result.brand)) throw new Error("INVALID_RESPONSE");
        if (result.state === "bundle" && (!Array.isArray(result.components) || result.product || result.score !== undefined)) throw new Error("INVALID_RESPONSE");
        found.set(result.clientKey, result);
      }
      return found;
    }
    async function pump() {
      timer = undefined;
      if (inFlight) return;
      if (policy.wait()) { schedule(policy.wait()); return; }
      pruneCache();
      const batch = [], keys = new Set();
      for (const record of records.values()) {
        if (record.entries.size && record.state === "queued" && record.due <= now() && !keys.has(record.item.clientKey)) {
          batch.push(record); keys.add(record.item.clientKey);
          if (batch.length === contract.MAX_ITEMS) break;
        }
      }
      if (!batch.length) {
        const pending = [...records.values()].filter(record => record.entries.size && record.state === "queued");
        if (pending.length) schedule(Math.max(1, Math.min(...pending.map(record => record.due)) - now()));
        return;
      }
      inFlight = true;
      const started = now(), token = generation;
      for (const record of batch) { record.state = "in_flight"; record.attempts++; notify(record); }
      stats.batchRequests++;
      try {
        const response = await network.deadline(send,{ retailer: "amazon_in", items: batch.map(record => record.item) },setTimer,clearTimer);
        if (token !== generation) return;
        const results = readResults(response, batch);
        policy.success();
        for (const record of batch) {
          record.state = "resolved"; record.result = results.get(record.item.clientKey);
          stats[{ product: "productMatches", brand: "brandMatches", none: "unknown", bundle: "bundleMatches" }[record.result.state]]++;
          remember(record); notify(record);
        }
      } catch (error) {
        if (token !== generation) return;
        stats.failures++;
        const retryable = error?.retryable !== false;
        const due=policy.failure(error,Math.max(...batch.map(record=>record.attempts)));
        for (const record of batch) {
          record.state = retryable && record.attempts < 3 && record.entries.size ? "queued" : "failed";
          record.due = due || now();
          if (record.state === "failed") remember(record);
          notify(record);
        }
      } finally {
        if (token === generation) {
          for (const record of batch) if (!record.entries.size) records.delete(record.fingerprint);
          debug("[Kindvue SHOPPING MODE BATCH]", { ...stats, uniqueIdentities: records.size, queued: [...records.values()].filter(record => record.state === "queued").length, durationMs: now() - started });
        }
        inFlight=false;onCapacity(MAX_PENDING-pendingCount());schedule();
      }
    }
    function clear() {
      generation++; if (timer !== undefined) clearTimer(timer); timer = undefined; policy.clear();
      records.clear(); bindings.clear(); cache.clear();
    }
    return Object.freeze({ onChange: ({ type, entry }) => type === "removed" ? remove(entry) : add(entry), clear,
      getStats: () => ({ ...stats, bindings: bindings.size, identities: records.size, cached: cache.size, inFlight, pending:pendingCount(),maxPending:MAX_PENDING,...policy.stats() }),
    });
  }
  scope.PawmarkBatchQueue = Object.freeze({ createQueue });
  if (typeof module === "object" && module.exports) module.exports = scope.PawmarkBatchQueue;
})(globalThis);
