(function install(scope) {
  'use strict';
  const validProduct = match => match?.kind === 'product' && typeof match.id === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(match.id);
  function products(match) {
    const candidates = match?.kind === 'bundle' ? match.components.map(component => component.match) : [match];
    return [...new Map(candidates.filter(validProduct).map(product => [product.id, product])).values()].slice(0, 24);
  }
  let current = null;
  function render(match) {
    if (!validProduct(match)) return '';
    
    return `<div class="pawmark-widget__saves"><button type="button" class="pawmark-widget__open-saves" data-kindvue-open-saves>${scope.PawmarkSaveIcons.bookmark}<span>Save in Kindvue</span></button></div>`;
  }
  function wire(widget, match, send) {
    const matches = products(match).map(product => ({ id: product.id, name: String(product.name || 'Product').slice(0, 240) }));
    if (!matches.length) return;
    current = { widget, products: matches, pageUrl: scope.location?.href, contextId: scope.crypto.randomUUID() };
    for (const button of widget.querySelectorAll('[data-kindvue-open-saves]')) button.addEventListener('click', event => {
      event.stopPropagation();
      if (!event.isTrusted || !widget.isConnected) return;
      void send({ type: 'PAWMARK_OPEN_SAVE_PANEL' }).catch(() => {
        
        button.querySelector('span').textContent = 'Open Kindvue from your browser toolbar';
      });
    });
  }
  scope.chrome?.runtime?.onMessage?.addListener((message, sender, reply) => {
    if (sender.id !== scope.chrome.runtime.id || sender.tab || message?.type !== 'PAWMARK_PUBLIC_SAVE_CONTEXT' || Object.keys(message).length !== 1) return false;
    const assistance = scope.KindvueAssistance?.snapshot();
    const active = assistance?.ready && assistance.enabled && assistance.shoppingEnabled && current?.widget.isConnected && current.pageUrl === scope.location.href;
    reply(active ? { pageUrl: current.pageUrl, contextId: current.contextId, products: current.products } : null);
    return false;
  });
  scope.PawmarkSaveActions = Object.freeze({ products, render, wire });
  if (typeof module !== 'undefined') module.exports = scope.PawmarkSaveActions;
})(globalThis);
