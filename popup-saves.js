(function install(scope) {
  'use strict';
  const section = document.getElementById('saved-products');
  const list = document.getElementById('saved-products-list');
  const feedback = document.getElementById('saved-products-feedback');
  const retry = document.getElementById('saved-products-retry');
  let account = null, sourceTab, revision = 0;
  async function send(type, payload) {
    const response = await chrome.runtime.sendMessage({ type, ...payload });
    if (!response?.ok) throw Object.assign(new Error('Save unavailable'), { code: response?.error?.code });
    return response.result;
  }
  function clear() {
    revision++;
    list.replaceChildren();
    feedback.textContent = '';
    retry.hidden = true;
    section.hidden = true;
  }
  function errorText(error) {
    return ({ SIGN_IN_REQUIRED: 'Sign in to save this product.', SESSION_EXPIRED: 'Session expired. Sign in again.',
      EMAIL_VERIFICATION_REQUIRED: 'Verify your email to save products.', ACCOUNT_UNAVAILABLE: 'Your account is unavailable.',
      STALE_CONTEXT: 'The product page changed. Reopen Kindvue on that page.', PRODUCT_UNAVAILABLE: 'This product is no longer available.',
      RATE_LIMITED: 'Too many requests. Try again shortly.' })[error?.code] || "Couldn't connect to Kindvue. Try again.";
  }
  async function refresh() {
    clear();
    const generation = revision;
    const assistance = scope.KindvueAssistance.snapshot();
    if (!assistance.ready || !assistance.enabled || !assistance.shoppingEnabled || !account) return;
    try {
      if (sourceTab === undefined) {
        const query = new URL(location.href).searchParams.get('tab');
        sourceTab = query !== null ? Number(query) : (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
      }
      if (!Number.isSafeInteger(sourceTab) || sourceTab < 0) return;
      const context = await send('PAWMARK_SAVE_CONTEXT', { tabId: sourceTab });
      if (generation !== revision) return;
      section.hidden = false;
      feedback.textContent = account.authenticated ? account.emailVerified ? 'Loading saved state...' : 'Verify your email to save products.' : 'Sign in to save this product.';
      const identity = { tabId: sourceTab, pageUrl: context.pageUrl, contextId: context.contextId };
      let busy = false;
      const rows = context.products.map(product => {
        const row = document.createElement('div'); row.className = 'pawmark-popup__product';
        
        row.dataset.pawmarkSaveId = product.id;
        const name = document.createElement('h3'); name.textContent = product.name; row.append(name);
        const controls = document.createElement('div'); controls.className = 'pawmark-popup__save-actions'; row.append(controls);
        const state = { watched: false, inShoppingList: false, ready: false };
        const buttons = ['add', 'watch'].map(action => {
          const button = document.createElement('button'); button.type = 'button'; button.dataset.pawmarkSave = action;
          controls.append(button);
          button.addEventListener('click', async event => {
            if (!event.isTrusted || busy || !state.ready || generation !== revision) return;
            busy = true; paintAll(); feedback.textContent = '';
            try {
              if (action === 'add' && state.inShoppingList) {
                await send('PAWMARK_OPEN_ACCOUNT', { destination: 'lists' });
              } else {
                const result = await send('PAWMARK_SAVE_PRODUCT', { ...identity, productId: product.id, action: action === 'add' ? 'add' : state.watched ? 'unwatch' : 'watch' });
                if (generation !== revision) return;
                if (action === 'add') state.inShoppingList = result.inShoppingList;
                else state.watched = result.watched;
                feedback.textContent = action === 'add' ? result.changed ? 'Added to My Shopping List' : 'Already in My Shopping List' : state.watched ? 'Watching product' : 'Stopped watching product';
              }
            } catch (error) {
              if (generation !== revision) return;
              
              clear(); section.hidden = false; feedback.textContent = errorText(error); retry.hidden = false;
            } finally { busy = false; if (generation === revision) paintAll(); }
          });
          return button;
        });
        list.append(row);
        function paint() {
          buttons.forEach((button, index) => {
            const add = index === 0, active = add ? state.inShoppingList : state.watched;
            button.disabled = busy || !state.ready;
            if (state.ready) button.setAttribute('aria-pressed', String(active)); else button.removeAttribute('aria-pressed');
            button.setAttribute('aria-label', `${add ? active ? 'Manage shopping list for' : 'Add to shopping list:' : active ? 'Unwatch' : 'Watch'} ${product.name}`);
            button.innerHTML = (add ? active ? scope.PawmarkSaveIcons.check : scope.PawmarkSaveIcons.bag : scope.PawmarkSaveIcons.bookmark);
            const label = document.createElement('span'); label.textContent = add ? active ? 'In list' : 'Add to list' : active ? 'Watching' : 'Watch'; button.append(label);
          });
        }
        return { product, state, paint };
      });
      function paintAll() { rows.forEach(row => row.paint()); }
      paintAll();
      if (!account.authenticated || !account.emailVerified) return;
      const result = await send('PAWMARK_SAVED_STATE', { ...identity, productIds: context.products.map(product => product.id) });
      if (generation !== revision) return;
      for (const row of rows) {
        const state = result.products.find(item => item.productId === row.product.id);
        if (!state || typeof state.watched !== 'boolean' || typeof state.inShoppingList !== 'boolean') throw new Error('Invalid saved state');
        Object.assign(row.state, { watched: state.watched, inShoppingList: state.inShoppingList, ready: true });
      }
      feedback.textContent = ''; paintAll();
    } catch (error) {
      if (generation !== revision) return;
      const hadProducts = !section.hidden;
      clear();
      if (hadProducts) { section.hidden = false; feedback.textContent = errorText(error); retry.hidden = false; }
    }
  }
  retry.addEventListener('click', event => { if (event.isTrusted) void refresh(); });
  scope.KindvueAssistance.subscribe(() => { void refresh(); });
  chrome.tabs.onUpdated.addListener((tabId, change) => { if (tabId === sourceTab && (change.url || change.status === 'loading')) clear(); });
  chrome.tabs.onRemoved.addListener(tabId => { if (tabId === sourceTab) clear(); });
  scope.KindvuePopupSaves = Object.freeze({ clear, setAccount(value) { account = value; void refresh(); } });
})(globalThis);
