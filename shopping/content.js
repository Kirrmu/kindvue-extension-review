(function startShoppingDetection(scope) {
  "use strict";
  if (!["amazon.in", "www.amazon.in"].includes(location.hostname) || scope.PawmarkShoppingMode || scope.PawmarkConfig.SHOPPING_MODE_ENABLED===false) return;
  let registry, suspended = false;
  const assistance = scope.KindvueAssistance;
  const active = () => !suspended && assistance.isActive();
  const interactionRoots=new Set();
  const interact=event=>{if(event.isTrusted&&event.composedPath().some(node=>node.tagName?.startsWith('PAWMARK-')))filters.dismissEducation();};
  const analytics = scope.PawmarkShoppingAnalytics.createController({validate:entry=>{
    const valid=registry.validateEntry(entry);
    if(valid)filters.onPresentation({type:'validated',entry});
    return valid;
  },settings:()=>filters.analyticsContext(),passes:entry=>filters.passes(entry)});
  const renderer = scope.PawmarkShoppingBadges.createRenderer({ enabled: scope.PawmarkConfig.SHOPPING_MODE_BADGES });
  const filters = scope.PawmarkShoppingFilters.createController({
    enabled: scope.PawmarkConfig.SHOPPING_MODE_FILTERS,
    onSettingsChange: () => registry?.refreshRetention(),
    onAction: (name, context) => analytics.track(name,{context}),
  });
  const alternatives = scope.PawmarkShoppingAlternatives.createController({
    onRender:(entry,alternative)=>analytics.sync(entry,alternative),
    onCapacity:capacity=>alternatives.retryDeferred(registry.getEntries(),capacity),
    enabled: scope.PawmarkConfig.SHOPPING_MODE_BETTER_CHOICE && scope.PawmarkConfig.SHOPPING_MODE_BADGES,
    validate: entry => {
      const valid = registry.validateEntry(entry);
      if (valid) filters.onPresentation({ type: 'validated', entry });
      return valid;
    },
    send: async request => {
      if (!active()) throw Object.assign(new Error('ASSISTANCE_PAUSED'), { retryable: false });
      const response = await chrome.runtime.sendMessage({ type: 'PAWMARK_ALTERNATIVES_BATCH', request });
      if (!response?.ok) throw Object.assign(new Error('ALTERNATIVES_UNAVAILABLE'), { retryable: response?.error?.retryable !== false, retryAfterMs: response?.error?.retryAfterMs });
      return response.result;
    },
  });
  const requests = scope.PawmarkShoppingCheckRequests.createController({
    onOutcome:(entry,status)=>void analytics.productEvent(status==='created'?'request_submitted':'request_existing',entry),
    enabled: scope.PawmarkConfig.SHOPPING_MODE_CHECK_REQUESTS && scope.PawmarkConfig.SHOPPING_MODE_BADGES,
    validate: entry => {
      const valid = registry.validateEntry(entry);
      if (valid) filters.onPresentation({ type: 'validated', entry });
      return valid;
    },
    send: async request => {
      if (!active()) throw new Error('ASSISTANCE_PAUSED');
      const response = await chrome.runtime.sendMessage({ type: 'PAWMARK_CHECK_REQUEST', request });
      if (!response?.ok) throw new Error('REQUEST_UNAVAILABLE');
      return { status: response.status };
    },
  });
  const queue = scope.PawmarkBatchQueue.createQueue({
    onCapacity:capacity=>{for(const entry of registry.getEntries())if(capacity>0&&entry.matchState==='deferred'){queue.onChange({type:'added',entry});capacity--; }},
    send: async request => {
      if (!active()) throw Object.assign(new Error('ASSISTANCE_PAUSED'), { retryable: false });
      if (!scope.PawmarkAmazonCards.isListingPage(location.href, document) || !registry.getStats().roots) throw Object.assign(new Error("NOT_LISTING"), { retryable: false });
      const response = await chrome.runtime.sendMessage({ type: "PAWMARK_MATCH_BATCH", request });
      if (!response?.ok) throw Object.assign(new Error("BATCH_UNAVAILABLE"), { retryable: response?.error?.retryable !== false, retryAfterMs: response?.error?.retryAfterMs });
      return response.result;
    },
    apply: (entry, state, result) => registry.setMatch(entry, state, result),
    debug: scope.PawmarkConfig.debugLog,
  });
  registry = scope.PawmarkAmazonCards.createRegistry({
    onChange: queue.onChange,
    onPresentation: event => { renderer.onPresentation(event); filters.onPresentation(event); alternatives.onPresentation(event); requests.onPresentation(event); if(event.type==='validated')analytics.sync(event.entry);else analytics.remove(event.entry.element); },
    isPresentationMutation: mutation => renderer.isOwnMutation(mutation) || filters.isOwnMutation(mutation) || alternatives.isOwnMutation(mutation) || requests.isOwnMutation(mutation),
    retainEntry: filters.retainEntry,
    beforeValidate: filters.restore,
    onWaiting:filters.setWaiting,
    onRootsChanged: roots => {
      for(const root of interactionRoots)if(!roots.includes(root)){root.removeEventListener('click',interact,true);interactionRoots.delete(root);}
      for(const root of roots)if(!interactionRoots.has(root)){root.addEventListener('click',interact,true);interactionRoots.add(root);}
      filters.setRoots(roots); if (!roots.length) { queue.clear(); alternatives.clear(); requests.clear(); analytics.stop(); } else analytics.start(scope.PawmarkAmazonCards.pageType(location.href, roots));
    },
  });
  let contextKey='';
  function refreshRoute(){
    if (!active()) return;
    const url=new URL(location.href),next=scope.PawmarkAmazonCards.isListingPage(url.href)?url.pathname+'?'+url.searchParams.toString():'';
    if(next!==contextKey){if(next)registry.restart();else registry.stop();contextKey=next;}
    if(next)registry.start();
  }
  scope.PawmarkShoppingMode = Object.freeze({...registry,refreshRoute});
  scope.PawmarkShoppingBatch = queue;
  scope.PawmarkShoppingBetterChoice = alternatives;
  scope.PawmarkShoppingRequests = requests;
  function stop() { registry.stop(); contextKey = ''; }
  window.addEventListener("pagehide", () => { suspended = true; stop(); });
  window.addEventListener("pageshow", () => { suspended = false; refreshRoute(); });
  window.addEventListener("popstate", refreshRoute);
  window.addEventListener("pawmark:locationchange", refreshRoute);
  assistance.subscribe(() => { if (active()) refreshRoute(); else stop(); });
})(globalThis);
