
(function install(scope) {
  "use strict";
  const core = scope.PawmarkRetailerIdentity || (typeof module === "object" ? require("../platforms/identity-core.js") : null);
  const SEARCH_ROOTS = '[data-component-type="s-search-results"], .s-main-slot, #mainResults';
  const CATEGORY_ROOTS = '[class*="apbSearchResultsContainer"]';
  const RANKED_ROOTS = '.p13n-desktop-grid, #zg-ordered-list';
  const DEAL_ROOTS = '[data-testid="discount-asin-grid"]';
  const ROOTS = [SEARCH_ROOTS, CATEGORY_ROOTS, RANKED_ROOTS, DEAL_ROOTS].join(',');
  const SEARCH_CARDS = '[data-component-type="s-search-result"], [data-component-type="sp-sponsored-result"], [data-asin][data-index], .s-result-item[data-asin]';
  const CATEGORY_CARDS = '[class*="apbSearchResultItem"]';
  const RANKED_CARDS = '#gridItemRoot, .zg-item-immersion';
  const DEAL_CARDS = '[data-testid="product-card"][data-asin]';
  const CARDS = [SEARCH_CARDS, CATEGORY_CARDS, RANKED_CARDS, DEAL_CARDS].join(',');
  const TITLES = 'h2, h3, [class*="p13n-sc-css-line-clamp"], .p13n-sc-truncate, p[id^="title-"]';
  const SECONDARY = '#rhf, #navFooter, header, footer, aside, [data-a-carousel-options], [id*="recommendations"], [id*="sims-"]';
  const HIDDEN_TEXT = '[hidden], [aria-hidden="true"], .a-offscreen, [data-component-type="s-sponsored-label-info-icon"], [data-cy="sponsored-label"]';
  const PROMO = /^(?:sponsored|amazon['\u2019]s choice|best seller|bestseller)$/i;

  
  

  function amazonUrl(value, base) {
    try {
      const url = new URL(value, base);
      return ["https:", "http:"].includes(url.protocol) && ["amazon.in", "www.amazon.in"].includes(url.hostname) && !url.username && !url.password && !url.port ? url : null;
    } catch { return null; }
  }
  
  function isListingPage(value, doc) {
    const url = amazonUrl(value);
    if (!url || url.protocol !== "https:" || core.isLikelyProductUrl("amazon", value)) return false;
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return false; }
    if (/(?:^|\/)(?:ap|account|accounts|your-account|signin|cart|checkout|buy|orders|your-orders|order-history|order-details|address|addresses|payments|payment|profile|css|cpc|returns|return|settings|subscriptions|auto-deliveries|manage|help|customer-preferences|hz\/contact-us)(?:\/|$)/i.test(pathname)) return false;
    if (doc?.querySelector('#dp, #dp-container, #ppd, #productTitle, form[action*="/checkout"], #sc-active-cart')) return false;
    return true;
  }
  function pageType(value, roots = []) {
    const url = amazonUrl(value); if (!url) return 'other_supported_listing';
    if (/\/stores(?:\/|$)/i.test(url.pathname) || url.searchParams.has('field-brandtextbin') || /(?:^|,)p_89[:%]/i.test(url.searchParams.get('rh') || '')) return 'brand_listing';
    if (/\/(?:bestsellers|new-releases)(?:\/|$)/.test(url.pathname)) return 'best_sellers';
    if (/\/(?:deals|goldbox)(?:\/|$)/.test(url.pathname)) return 'deals';
    if (/\/(?:s|search)(?:\/|$)/.test(url.pathname)) return url.searchParams.has('k') || url.searchParams.has('field-keywords') ? 'search' : 'category';
    if (/\/(?:b|l)(?:\/|$)|\/browse\.html/.test(url.pathname)) return 'category';
    if (roots.some(root => root.matches(RANKED_ROOTS))) return 'best_sellers';
    return 'other_supported_listing';
  }
  function primaryRoot(root) { return !root.closest(SECONDARY + ', a, button, [role="link"]'); }
  function cardTitle(heading, win) {
    if (!rendered(heading, win)) return '';
    
    const full = heading.matches('p[id^="title-"], .p13n-sc-truncate') && heading.querySelector('.a-truncate-full');
    return full ? cleanText(full.textContent).slice(0, 1201) : visibleText(heading, win);
  }
  function visibilityStyleChanged(mutation) {
    const previous = mutation.target.ownerDocument.createElement('div').style;
    previous.cssText = mutation.oldValue || '';
    const current = mutation.target.style;
    const keys = new Set(['display', 'visibility', 'opacity', 'content-visibility', ...Array.from(previous).filter(key=>key.startsWith('--')), ...Array.from(current).filter(key=>key.startsWith('--'))]);
    return [...keys].some(key=>previous.getPropertyValue(key)!==current.getPropertyValue(key)||previous.getPropertyPriority(key)!==current.getPropertyPriority(key));
  }
  function productTarget(href, base) {
    if (typeof href !== "string" || href.length > 4096) return null;
    let url = amazonUrl(href, base);
    if (!url) return null;
    if (["/sspa/click", "/gp/slredirect/picassoRedirect.html"].includes(url.pathname)) {
      const target = url.searchParams.get("url");
      if (!target) return null;
      url = amazonUrl(target, url.origin);
      if (!url) return null;
    }
    const asin = core.productIdFromUrl("amazon", url.href)?.productId || null;
    if (asin) return { asin, url: `https://www.amazon.in/dp/${asin}` };
    
    const opaque = url.pathname.match(/^(?:\/[^/]+)*\/(dp|gp\/product|gp\/aw\/d)\/([A-Za-z0-9_-]{1,160})(?:\/ref=[^/]*)?\/?$/i);
    return opaque ? { asin: null, url: `https://www.amazon.in/${opaque[1].toLowerCase()}/${opaque[2]}` } : null;
  }
  function cleanText(value) { return core.normalizeText(value); }
  function rendered(element, win) {
    if (!element?.isConnected || !element.getClientRects().length) return false;
    for (let node = element; node; node = node.parentElement) {
      if (node.hidden || node.getAttribute("aria-hidden") === "true") return false;
      const css = win.getComputedStyle(node);
      if (css.display === "none" || css.visibility === "hidden" || css.visibility === "collapse" || css.opacity === "0") return false;
    }
    return true;
  }
  function visibleText(element, win) {
    if (!element || !rendered(element, win)) return "";
    const walker = element.ownerDocument.createTreeWalker(element, win.NodeFilter.SHOW_TEXT);
    const parts = [];
    let characters = 0, nodes = 0;
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const parent = text.parentElement, value = cleanText(text.textContent);
      if (++nodes > 256 || (characters += value.length) > 1200) return "";
      if (!value || PROMO.test(value) || parent.closest(HIDDEN_TEXT) || !rendered(parent, win)) continue;
      parts.push(text.textContent);
    }
    return cleanText(parts.join(" "));
  }
  function imageUrl(card, base) {
    const image = card.querySelector('img.s-image, [data-component-type="s-product-image"] img, a[href] img');
    if (!image) return null;
    for (const value of [image.currentSrc, image.getAttribute("src"), image.getAttribute("data-src")]) {
      if (!value) continue;
      try {
        const url = new URL(value, base);
        if (url.protocol !== "https:" || url.username || url.password || url.port || !/(?:^|\.)(?:media-amazon\.com|ssl-images-amazon\.com)$/.test(url.hostname)) continue;
        url.hash = ""; url.search = "";
        return url.href;
      } catch {  }
    }
    return null;
  }
  function separateBrandHeading(heading, win) {
    
    const recipe = heading.closest('[data-cy="title-recipe"]');
    const candidates = [...(recipe?.querySelectorAll(':scope > .a-row.a-color-secondary > h2') || [])]
      .filter(node => node !== heading && !node.closest('a[href]') && (node.compareDocumentPosition(heading) & win.Node.DOCUMENT_POSITION_FOLLOWING));
    return candidates.length === 1 ? visibleText(candidates[0], win) : "";
  }
  function extract(card, base, win = card.ownerDocument.defaultView) {
    if (!isListingPage(base, card.ownerDocument) || !card.matches(CARDS) || card.querySelector(CARDS) || !rendered(card, win)) return null;
    const root = card.closest(ROOTS);
    if (!root || !primaryRoot(root) || card.closest(SECONDARY)) return null;
    if (card.matches(RANKED_CARDS) && !root.matches(RANKED_ROOTS) || card.matches(DEAL_CARDS) && !root.matches(DEAL_ROOTS) || card.matches(CATEGORY_CARDS) && !root.matches(CATEGORY_ROOTS)) return null;
    const declaredAsin = core.normalizeProductId("amazon", card.getAttribute("data-asin") || card.querySelector('[data-asin]')?.getAttribute('data-asin'));
    const headings = card.querySelectorAll(TITLES);
    for (const heading of headings) {
      const title = cardTitle(heading, win);
      if (title.length < 3 || title.length > 1200 || PROMO.test(title)) continue;
      const anchor = heading.closest("a[href]") || heading.querySelector("a[href]");
      if (!anchor && headings.length !== 1) continue;
      
      const links = anchor && card.contains(anchor) ? [anchor] : [...card.querySelectorAll('[data-cy="title-recipe"] a[href], [data-component-type="s-product-image"] a[href], a.a-link-normal[href]')];
      for (const link of links) {
        const target = productTarget(link.getAttribute("href"), base);
        if (!target || declaredAsin && target.asin && declaredAsin !== target.asin || !card.matches(SEARCH_CARDS) && !target.asin) continue;
        const asin = declaredAsin || target.asin || null;
        const metadata = card.querySelector('[itemprop="brand"], [data-brand]');
        const brandText = cleanText(card.getAttribute("data-brand") || metadata?.getAttribute("data-brand") || visibleText(metadata, win) || separateBrandHeading(heading, win)).replace(/^brand\s*:\s*/i, "");
        const brand = brandText && brandText.length <= 120 && !PROMO.test(brandText) ? brandText : null;
        const price = card.querySelector('.a-price:not([data-a-strike="true"])');
        return Object.freeze({ retailer: "amazon_in", retailerProductId: asin, title, brand, productUrl: asin ? `https://www.amazon.in/dp/${asin}` : target.url, imageUrl: imageUrl(card, base), priceText: price ? visibleText(price, win).slice(0, 80) || null : null });
      }
    }
    return null;
  }
  function identityKey(identity) {
    return identity.retailerProductId ? `amazon_in:asin:${identity.retailerProductId}` : `amazon_in:url:${identity.productUrl}|title:${cleanText(identity.title).toLowerCase()}`;
  }

  function createRegistry({ document: doc = document, window: win = window, onChange = () => {}, onPresentation = () => {}, isPresentationMutation = () => false,
    retainEntry = () => false, beforeValidate = () => {}, onRootsChanged = () => {}, onWaiting = () => {} } = {}) {
    const roots = new Map(), qualified = new Set(), candidates = new Set(), visible = new Set(), entries = new Map(), groups = new Map();
    const dirty = new Set(), subtrees = new Set();
    const invalidated = new Set(), waiting=new Set();
    const stats = { documentScans: 0, subtreeScans: 0, extractions: 0, changes: 0, mutationCallbacks:0, ignoredMutations:0 };
    const MAX_ENTRIES=512, WORK_CHUNK=32;
    let running = false, timer, discovery, intersection, needsCleanup=false, activeUrl='', restartRoots=[], blockedByDocument=false;
    const currentRoute=()=>win.location.href.split('#')[0]===activeUrl&&isListingPage(win.location.href);
    function pauseRoute(){
      const reusable=isListingPage(win.location.href)?[...roots.keys()].filter(root=>root.isConnected&&root.matches(ROOTS)):[];
      stop();restartRoots=reusable;
    }
    const belongs = (node) => [...qualified].some((root) => root.isConnected && root.matches(ROOTS) && primaryRoot(root) && root.contains(node));
    function qualify(root) {
      if (!primaryRoot(root)) return false;
      if (qualified.has(root)) return true;
      const required = root.matches(SEARCH_ROOTS) ? 1 : 2, identities = new Set();
      
      for (const card of [...root.querySelectorAll(CARDS)].slice(0, 40)) {
        const identity = extract(card, win.location.href, win);
        if (identity) identities.add(identityKey(identity));
        if (identities.size >= required) return true;
      }
      return false;
    }
    function emit(type, entry) { stats.changes++; onChange(Object.freeze({ type, entry })); }
    function invalidate(card) {
      beforeValidate(card);
      const entry = entries.get(card);
      if (!entry || invalidated.has(card)) return;
      invalidated.add(card);
      onPresentation({ type: "invalidated", entry });
    }
    function remove(card) {
      waiting.delete(card);
      const old = entries.get(card);
      if (!old) return;
      entries.delete(card); groups.get(old.key)?.delete(card);
      invalidated.delete(card);
      onPresentation({ type: "removed", entry: old });
      if (!groups.get(old.key)?.size) groups.delete(old.key);
      emit("removed", old);
    }
    function process(card) {
      if (!visible.has(card) && !retainEntry(entries.get(card)) || !card.isConnected || !belongs(card)) { remove(card); return; }
      if(!entries.has(card)&&entries.size>=MAX_ENTRIES){waiting.add(card);return;}
      waiting.delete(card);
      beforeValidate(card);
      stats.extractions++;
      const identity = extract(card, win.location.href, win);
      if (!identity) { remove(card); return; }
      invalidated.delete(card);
      const old = entries.get(card);
      if (old && JSON.stringify(old.identity) === JSON.stringify(identity)) {
        onPresentation({ type: "validated", entry: old });
        return;
      }
      if (old) onPresentation({ type: "invalidated", entry: old });
      const key = identityKey(identity), entry = Object.freeze({ key, element: card, identity, matchState: "unmatched", matchResult: null });
      if (old) {
        groups.get(old.key)?.delete(card);
        if (!groups.get(old.key)?.size) groups.delete(old.key);
      }
      entries.set(card, entry);
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key).add(card);
      onPresentation({ type: "validated", entry });
      emit(old ? "updated" : "added", entry);
      scope.PawmarkConfig?.debugLog?.("[Kindvue SHOPPING MODE] Detected Amazon product", { asinPresent: Boolean(identity.retailerProductId), titlePresent: true, brandPresent: Boolean(identity.brand), urlPresent: true });
    }
    function collect(node) {
      if (node.nodeType !== 1 || !belongs(node)) return;
      stats.subtreeScans++;
      const cards = node.matches(CARDS)?[node]:[...node.querySelectorAll(CARDS)];
      for (const card of cards) {
        if (!candidates.has(card)) { candidates.add(card); intersection.observe(card); }
        if (visible.has(card)) dirty.add(card);
      }
    }
    function flush() {
      timer = undefined;
      if (!currentRoute()) { pauseRoute(); return; }
      blockedByDocument = !isListingPage(win.location.href,doc);
      if (blockedByDocument) {
        qualified.clear();
        for (const card of entries.keys()) remove(card);
        onRootsChanged([]);
        return;
      }
      for (const [root, observer] of roots) if (!root.isConnected || !root.matches(ROOTS) || !primaryRoot(root)) { observer.disconnect(); roots.delete(root); qualified.delete(root); needsCleanup=true; }
      for (const root of roots.keys()) if (!qualified.has(root) && qualify(root)) { qualified.add(root); subtrees.add(root); }
      onRootsChanged([...qualified]);
      if(needsCleanup)for (const card of candidates) if (!card.isConnected || !belongs(card)) {
        intersection.unobserve(card); candidates.delete(card); visible.delete(card); remove(card);
      }
      needsCleanup=false;
      const pending = [...subtrees]; subtrees.clear();
      for (const node of pending) if (!pending.some((other) => other !== node && other.contains(node))) collect(node);
      let work=0;
      for (const card of dirty) {dirty.delete(card);process(card);if(++work>=WORK_CHUNK)break;}
      if(entries.size<MAX_ENTRIES)for(const card of waiting)if(visible.has(card)&&card.isConnected)dirty.add(card);
      onWaiting(waiting.size);
      if(dirty.size)schedule();
    }
    function schedule() { if (running && timer === undefined) timer = win.setTimeout(flush, 100); }
    function addRoot(root) {
      if (!primaryRoot(root) || [...roots.keys()].some((existing) => existing.contains(root))) return;
      for (const [existing, observer] of roots) if (root.contains(existing)) { observer.disconnect(); roots.delete(existing); qualified.delete(existing); }
      const observer = new win.MutationObserver((mutations) => {
        stats.mutationCallbacks++;
        let changed=false;
        for (const mutation of mutations) {
          if (isPresentationMutation(mutation)) {stats.ignoredMutations++;continue;}
          
          
          if (mutation.type==='attributes' && mutation.attributeName==='style' && !visibilityStyleChanged(mutation)) {stats.ignoredMutations++;continue;}
          const target = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
          const card = target?.closest(CARDS);
          const identitySelector=TITLES+', [itemprop="brand"],[data-brand],img.s-image,[data-pawmark-shopping-mode],[data-pawmark-better-choice],[data-pawmark-check-request]';
          const relevant=!card||target===card||target.closest(TITLES+', [itemprop="brand"],[data-brand]')||target.matches(identitySelector)||target.querySelector(identitySelector)||
            mutation.type==='childList'&&[...mutation.addedNodes,...mutation.removedNodes].some(node=>node.nodeType===1&&(node.matches(identitySelector)||node.querySelector(identitySelector)));
          if(!relevant){stats.ignoredMutations++;continue;}
          changed=true;if(mutation.removedNodes.length)needsCleanup=true;
          if (candidates.has(target)) { invalidate(target); dirty.add(target); }
          if (card && root.contains(card)) { invalidate(card); dirty.add(card); }
          else if (mutation.type === "attributes") subtrees.add(target);
          
          if (!card && (mutation.type === "attributes" || mutation.removedNodes.length)) for (const element of entries.keys()) {
            if (mutation.type === "attributes" && target?.contains(element) || !element.isConnected || [...mutation.removedNodes].some(node => node.contains(element))) { invalidate(element); dirty.add(element); }
          }
          if(!card)for (const added of mutation.addedNodes) if (added.nodeType === 1) subtrees.add(added);
        }
        if(changed)schedule();
      });
      observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true, attributeFilter: ["data-asin", "data-index", "data-component-type", "data-testid", "data-brand", "href", "src", "data-src", "id", "class", "style", "hidden", "aria-hidden"] });
      roots.set(root, observer); subtrees.add(root); schedule();
    }
    function discover(node) {
      if (node.nodeType !== 1) return;
      if (node.matches(ROOTS)) addRoot(node);
      for (const root of node.querySelectorAll(ROOTS)) addRoot(root);
    }
    function start() {
      if (running || !isListingPage(win.location.href)) return;
      running = true;
      activeUrl=win.location.href.split('#')[0];
      intersection = new win.IntersectionObserver((records) => {
        for (const record of records) {
          if (record.isIntersecting) { visible.add(record.target); dirty.add(record.target); }
          else { visible.delete(record.target); if (!retainEntry(entries.get(record.target))) remove(record.target); }
        }
        schedule();
      });
      discovery = new win.MutationObserver((mutations) => {
        stats.mutationCallbacks++;
        if (!currentRoute()) { pauseRoute(); return; }
        let changed=blockedByDocument !== !isListingPage(win.location.href,doc);
        for (const mutation of mutations) {
          if (isPresentationMutation(mutation)) continue;
          if ([...roots.keys()].some(root=>root.contains(mutation.target))) continue;
          const affectsRoots=[...roots.keys()].some(root=>!root.isConnected||mutation.type==='attributes'&&mutation.target.contains(root));
          if(affectsRoots){changed=true;needsCleanup=true;}
          if(affectsRoots)for (const card of entries.keys()) if (!card.isConnected || mutation.type === "attributes" && mutation.target.contains(card)) {
            invalidate(card); dirty.add(card);
          }
          if (mutation.type === "attributes" && mutation.target.matches(ROOTS)) {addRoot(mutation.target);changed=true;}
          for (const added of mutation.addedNodes) if(added.nodeType===1&&(added.matches(ROOTS)||added.querySelector(ROOTS))){discover(added);changed=true;}
        }
        if(changed)schedule();
      });
      discovery.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-component-type", "data-testid", "class", "id"] });
      const reusable=restartRoots.filter(root=>root.isConnected&&root.matches(ROOTS));restartRoots=[];
      if(reusable.length)for(const root of reusable)addRoot(root);
      else {stats.documentScans++; discover(doc.documentElement);}
    }
    function stop() {
      running = false;
      restartRoots=[];
      if (timer !== undefined) win.clearTimeout(timer);
      timer = undefined; discovery?.disconnect(); intersection?.disconnect();
      for (const observer of roots.values()) observer.disconnect();
      roots.clear(); qualified.clear(); candidates.clear(); visible.clear(); dirty.clear(); subtrees.clear(); invalidated.clear();waiting.clear();
      for (const card of entries.keys()) remove(card);
      onRootsChanged([]);
      onWaiting(0);
    }
    return Object.freeze({ start, stop, restart:()=>{if(running)pauseRoute();start();}, refreshRoute: () => isListingPage(win.location.href) ? start() : stop(),
      setMatch: (entry, matchState, matchResult) => {
        if(!currentRoute()){if(running)pauseRoute();return;}
        const current = entries.get(entry.element);
        if (!current || current.identity !== entry.identity || current.key !== entry.key) return;
        const updated = Object.freeze({ ...current, matchState, matchResult });
        entries.set(entry.element, updated);
        if (invalidated.has(entry.element)) return;
        beforeValidate(entry.element);
        
        if (matchState === "resolved" && ((!visible.has(entry.element) && !retainEntry(updated)) || !belongs(entry.element) || JSON.stringify(extract(entry.element, win.location.href, win)) !== JSON.stringify(entry.identity))) {
          invalidate(entry.element); dirty.add(entry.element); schedule(); return;
        }
        onPresentation({ type: "validated", entry: updated });
      },
      getRegistry: () => new Map([...groups].map(([key, cards]) => [key, [...cards].map((card) => entries.get(card))])),
      getEntries: () => [...entries.values()], getStats: () => ({ ...stats,entries:entries.size,candidates:candidates.size,visible:visible.size,roots:qualified.size,discoveryRoots:roots.size,pageType:pageType(win.location.href,[...qualified]),running,maxEntries:MAX_ENTRIES,waiting:waiting.size,invalidated:invalidated.size,dirty:dirty.size }),
      validateEntry: entry => {
        if(!currentRoute()){if(running)pauseRoute();return false;}
        const current = entries.get(entry.element);
        if (!current || current.identity !== entry.identity || current.key !== entry.key || current.matchState !== 'resolved' || current.matchResult?.state !== entry.matchResult?.state || current.matchResult?.product?.id !== entry.matchResult?.product?.id || invalidated.has(entry.element)) return false;
        beforeValidate(entry.element);
        if (!entry.element.isConnected || !belongs(entry.element) || JSON.stringify(extract(entry.element, win.location.href, win)) !== JSON.stringify(entry.identity)) {
          invalidate(entry.element); dirty.add(entry.element); schedule(); return false;
        }
        return true;
      },
      refreshRetention: () => {
        for (const [card, entry] of entries) if (!visible.has(card) && !retainEntry(entry)) {
          intersection?.unobserve(card); intersection?.observe(card);
        }
        schedule();
      },
    });
  }
  const findTitleHeading = (card, identity) => [...card.querySelectorAll(TITLES)].find(heading => cardTitle(heading, card.ownerDocument.defaultView) === identity.title) || null;
  const api = Object.freeze({ isListingPage, pageType, productTarget, identityKey, extract, findTitleHeading, createRegistry, selectors: Object.freeze({ roots: ROOTS, cards: CARDS }) });
  scope.PawmarkAmazonCards = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(globalThis);
