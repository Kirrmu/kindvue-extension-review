(function install(scope) {
  'use strict';
  let host, suspended = false, returnFocus = false;
  function remove() { host?.remove(); host = undefined; }
  function paint({ ready, enabled, shoppingEnabled }) {
    if (suspended || !ready || !enabled || shoppingEnabled) { remove(); return; }
    if (host?.isConnected) return;
    const toolbar = document.querySelector('[data-pawmark-shopping-toolbar]');
    const focus = Boolean(toolbar?.shadowRoot?.activeElement);
    host = document.createElement('kindvue-shopping-off');
    host.setAttribute('data-kindvue-shopping-off', '');
    const shadow = host.attachShadow({ mode: 'open' });
    scope.PawmarkTheme.mount(host);
    const style = document.createElement('style');
    style.textContent = `
      :host { all:initial!important; position:fixed!important; right:16px!important; bottom:20px!important; z-index:2147483646!important; max-width:calc(100vw - 32px)!important; }
      * { box-sizing:border-box; }
      button { display:flex; align-items:center; gap:8px; min-height:40px; max-width:100%; padding:8px 12px; border:1px solid var(--pawmark-border); border-radius:6px; background:var(--pawmark-surface); color:var(--pawmark-text-secondary); box-shadow:var(--pawmark-shadow-compact); font:500 12px/1.4 system-ui,sans-serif; letter-spacing:0; cursor:pointer; }
      button svg { display:block; width:20px; height:20px; flex:none; color:var(--pawmark-accent); }
      button:hover { background:var(--pawmark-secondary); }
      button:focus-visible { outline:2px solid var(--pawmark-focus); outline-offset:3px; }
      button:disabled { cursor:wait; }
      .tip { display:none; position:absolute; bottom:calc(100% + 6px); right:0; padding:6px 8px; border-radius:4px; background:var(--pawmark-text); color:var(--pawmark-surface); font:500 12px/1.4 system-ui,sans-serif; }
      button:hover + .tip,button:focus-visible + .tip { display:block; }
      .error { margin-top:4px; max-width:220px; padding:6px; background:var(--pawmark-surface); color:var(--pawmark-danger); font:12px/1.4 system-ui,sans-serif; }.error:empty { display:none; }
      @media(forced-colors:active) { button { border-color:ButtonText; } }
    `;
    const button = document.createElement('button');
    button.type = 'button'; button.setAttribute('aria-label', 'Turn Shopping Mode on');
    button.innerHTML = scope.PawmarkSaveIcons.reveal + '<span>Turn Shopping Mode on</span>';
    const tip = document.createElement('span'); tip.className = 'tip'; tip.textContent = 'Turn Shopping Mode on'; tip.setAttribute('aria-hidden', 'true');
    const error = document.createElement('div'); error.className = 'error'; error.setAttribute('role', 'status');
    button.addEventListener('click', async event => {
      if (!event.isTrusted || button.disabled) return;
      event.stopPropagation(); button.disabled = true; error.textContent = '';
      returnFocus = shadow.activeElement === button;
      try { await scope.KindvueAssistance.setShoppingEnabled(true); }
      catch { returnFocus = false; button.disabled = false; error.textContent = "Couldn't turn Shopping Mode on. Try again."; }
    });
    shadow.append(style, button, tip, error); document.body.append(host);
    if (focus) button.focus({ preventScroll: true });
  }
  scope.KindvueShoppingControl = Object.freeze({
    takeFocus() { const value = returnFocus; returnFocus = false; return value; },
  });
  scope.addEventListener('pagehide', () => { suspended = true; remove(); });
  scope.addEventListener('pageshow', () => { suspended = false; paint(scope.KindvueAssistance.snapshot()); });
  scope.KindvueAssistance.subscribe(paint);
})(globalThis);
