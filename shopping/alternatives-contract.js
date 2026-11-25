(function install(scope) {
  "use strict";
  const MAX_ITEMS = 12, MAX_BYTES = 4096, MIN_GAIN = 10;
  const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(value);
  function cleanRequest(value) {
    if (!value || Object.keys(value).some(key => key !== 'productIds') || !Array.isArray(value.productIds) || !value.productIds.length || value.productIds.length > MAX_ITEMS || !value.productIds.every(validId)) return null;
    return { productIds: [...new Set(value.productIds)] };
  }
  function eligible(entry) {
    const result = entry?.matchResult, product = result?.product;
    return entry?.matchState === 'resolved' && result?.clientKey === entry.key && result.state === 'product' && validId(product?.id) && Number.isFinite(product.score) && product.score >= 0 && product.score < 70;
  }
  function better(current, candidate) {
    return validId(candidate?.id) && candidate.id !== current.id && /^[A-Za-z0-9_-]{1,200}$/.test(candidate.slug) &&
      typeof candidate.name === 'string' && candidate.name.length > 0 && candidate.name.length <= 512 &&
      typeof candidate.brandName === 'string' && candidate.brandName.length <= 200 &&
      Number.isFinite(candidate.score) && candidate.score >= 70 && candidate.score <= 100 && candidate.score - current.score >= MIN_GAIN;
  }
  function supportsListing(entry, candidate) {
    const evidence = title => ({
      spf: String(title || '').match(/\bspf\s*[-:]?\s*(\d+(?:\.\d+)?)/i)?.[1],
      pa: String(title || '').match(/\bpa\s*(\+{1,4})(?!\+)/i)?.[1],
      actives: new Set([...String(title || '').matchAll(/\b(\d+(?:\.\d+)?)\s*%\s*(salicylic\s+acid|niacinamide|zinc)\b/gi)].map(match => `${match[2].toLowerCase().replace(/\s+/g, ' ')}:${Number(match[1])}`)),
    });
    const live = evidence(entry?.identity?.title), alternative = evidence(candidate?.name);
    
    return (!live.spf || Number(live.spf) === Number(alternative.spf)) && (!live.pa || live.pa === alternative.pa) &&
      [...live.actives].every(value => alternative.actives.has(value));
  }
  const api = Object.freeze({ MAX_ITEMS, MAX_BYTES, MIN_GAIN, cleanRequest, eligible, better, supportsListing });
  scope.PawmarkAlternativesContract = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
