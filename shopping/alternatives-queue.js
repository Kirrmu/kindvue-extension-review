
(function install(scope) {
  "use strict";
  const contract = scope.PawmarkAlternativesContract;
  const network=scope.PawmarkShoppingNetwork||(typeof module==='object'?require('./network-policy'):null);
  function createQueue({ send, apply, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, onCapacity = () => {} }) {
    const records = new Map(), bindings = new Map(), cache = new Map();
    const stats = { requests: 0, cacheHits: 0, failures: 0 };
    let timer, inFlight = false, generation = 0;
    const policy=network.createPolicy(now),MAX_PENDING=128;
    const pendingCount=()=>[...records.values()].filter(record=>['queued','in_flight'].includes(record.state)).length;
    const notify = record => { for (const entry of record.entries.values()) apply(entry, record.alternative); };
    function remove(entry) {
      const record = bindings.get(entry.element); if (!record) return;
      bindings.delete(entry.element); record.entries.delete(entry.element);
      if (!record.entries.size && record.state !== 'in_flight') records.delete(record.id);
    }
    function schedule(delay = 200) { if (!inFlight && timer === undefined) timer = setTimer(pump, delay); }
    function add(entry) {
      if (!contract.eligible(entry)) { remove(entry); return; }
      const id = entry.matchResult.product.id, previous = bindings.get(entry.element);
      if (previous?.id === id) { previous.entries.set(entry.element, entry); if (previous.state === 'resolved') apply(entry, previous.alternative); return; }
      remove(entry);
      for (const [key, value] of cache) if (value.until <= now()) cache.delete(key);
      let record = records.get(id);
      if (!record) {
        const saved = cache.get(id); if (saved) stats.cacheHits++;
        if(!saved&&pendingCount()>=MAX_PENDING)return;
        record = { id, entries: new Map(), state: saved ? 'resolved' : 'queued', alternative: saved?.alternative ?? null, attempts: 0 };
        records.set(id, record);
      }
      record.entries.set(entry.element, entry); bindings.set(entry.element, record);
      if (record.state === 'resolved') apply(entry, record.alternative); else schedule();
    }
    async function pump() {
      timer = undefined;
      if (inFlight) return;
      if (policy.wait()) { schedule(policy.wait()); return; }
      const batch = [...records.values()].filter(record => record.entries.size && record.state === 'queued').slice(0, contract.MAX_ITEMS);
      if (!batch.length) return;
      inFlight = true; const token = generation;
      for (const record of batch) { record.state = 'in_flight'; record.attempts++; }
      stats.requests++;
      try {
        const response = await network.deadline(send,{ productIds: batch.map(record => record.id) },setTimer,clearTimer);
        if (token !== generation) return;
        if (!Array.isArray(response?.results) || response.results.length !== batch.length) throw new Error('INVALID_RESPONSE');
        const found = new Map();
        for (const item of response.results) {
          if (!batch.some(record => record.id === item?.productId) || found.has(item.productId) || !(item.alternative === null || item.alternative && typeof item.alternative === 'object')) throw new Error('INVALID_RESPONSE');
          found.set(item.productId, item.alternative);
        }
        policy.success();
        for (const record of batch) {
          record.state = 'resolved'; record.alternative = found.get(record.id);
          cache.delete(record.id); cache.set(record.id, { alternative: record.alternative, until: now() + 300000 });
          while (cache.size > 100) cache.delete(cache.keys().next().value);
          notify(record);
        }
      } catch (error) {
        if (token !== generation) return;
        stats.failures++;
        policy.failure(error,Math.max(...batch.map(record=>record.attempts)));
        for (const record of batch) {
          record.state = error?.retryable !== false && record.attempts < 3 ? 'queued' : 'resolved';
          if (record.state === 'resolved') {
            record.alternative = null; cache.set(record.id, { alternative: null, until: now() + 30000 });
            while (cache.size > 100) cache.delete(cache.keys().next().value);
            notify(record);
          }
        }
      } finally {
        if (token === generation) {
          for (const record of batch) if (!record.entries.size) records.delete(record.id);
        }
        inFlight=false;onCapacity(MAX_PENDING-pendingCount());schedule();
      }
    }
    return Object.freeze({ add, remove, has:entry=>bindings.has(entry.element), clear: () => { generation++; if (timer !== undefined) clearTimer(timer); timer = undefined; records.clear(); bindings.clear(); cache.clear(); policy.clear(); },
      getStats: () => ({ ...stats, inFlight, queued: [...records.values()].filter(record => record.state === 'queued').length, cached: cache.size, bindings: bindings.size,pending:pendingCount(),maxPending:MAX_PENDING,...policy.stats() }) });
  }
  scope.PawmarkAlternativesQueue = Object.freeze({ createQueue });
  if (typeof module === 'object' && module.exports) module.exports = scope.PawmarkAlternativesQueue;
})(globalThis);
