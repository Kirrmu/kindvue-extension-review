(function install(scope) {
  'use strict';
  if (scope.KindvueAssistance) return;
  
  const STORAGE_KEY = 'kindvueShoppingPausedV1', SHOPPING_KEY = 'kindvueShoppingEnabledV1';
  const listeners = new Set();
  const revisions = { [STORAGE_KEY]: 0, [SHOPPING_KEY]: 0 };
  let paused = true, shoppingEnabled = false, ready = false;
  const snapshot = () => Object.freeze({ paused, enabled: !paused, shoppingEnabled, ready });
  function publish(previous) {
    if (previous !== JSON.stringify(snapshot())) for (const listener of listeners) listener(snapshot());
  }
  function assign(key, value) {
    if (key === STORAGE_KEY) paused = value === true;
    else shoppingEnabled = value !== false;
  }
  scope.chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const previous = JSON.stringify(snapshot());
    for (const key of [STORAGE_KEY, SHOPPING_KEY]) if (Object.hasOwn(changes, key)) {
      revisions[key]++;
      assign(key, changes[key].newValue);
    }
    publish(previous);
  });
  async function read() {
    const before = { ...revisions };
    const value = await scope.chrome.storage.local.get([STORAGE_KEY, SHOPPING_KEY]);
    const previous = JSON.stringify(snapshot());
    for (const key of [STORAGE_KEY, SHOPPING_KEY]) if (revisions[key] === before[key]) assign(key, value[key]);
    ready = true;
    publish(previous);
  }
  
  const loaded = read().catch(() => {});
  async function write(key, value) {
    if (typeof value !== 'boolean') throw new TypeError('Invalid assistance preference');
    await loaded;
    if (!ready) await read();
    if ((key === STORAGE_KEY ? paused : shoppingEnabled) === value) return;
    const before = revisions[key];
    await scope.chrome.storage.local.set({ [key]: value });
    if (revisions[key] === before) {
      const previous = JSON.stringify(snapshot());
      revisions[key]++; assign(key, value); publish(previous);
    }
  }
  scope.KindvueAssistance = Object.freeze({ STORAGE_KEY, SHOPPING_KEY, snapshot,
    setPaused: value => write(STORAGE_KEY, value),
    setEnabled: value => typeof value === 'boolean' ? write(STORAGE_KEY, !value) : Promise.reject(new TypeError('Invalid assistance preference')),
    setShoppingEnabled: value => write(SHOPPING_KEY, value),
    isActive: () => ready && !paused && shoppingEnabled,
    subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
  });
})(globalThis);
