(function install(scope) {
  'use strict';
  if (scope.PawmarkTheme) return;
  const STORAGE_KEY = 'pawmarkThemeV1';
  
  const light = Object.freeze({
    "background": "#f5f1e8",
    "page": "#f5f1e8",
    "surface": "#fdfefb",
    "surface-muted": "#edf2ed",
    "surface-strong": "#dce7dc",
    "primary": "#244d35",
    "primary-hover": "#1b392a",
    "primary-active": "#142e20",
    "on-primary": "#ffffff",
    "text-primary": "#20342a",
    "text-secondary": "#526157",
    "text-muted": "#59675d",
    "border": "#7b8d7f",
    "border-subtle": "#d9e2d9",
    "success": "#187344",
    "success-strong": "#145d38",
    "success-surface": "#e9f4ec",
    "success-border": "#6c9779",
    "warning": "#8a5b16",
    "warning-strong": "#704710",
    "warning-surface": "#fbf3df",
    "warning-border": "#b29354",
    "poor": "#b14430",
    "poor-surface": "#faeeea",
    "poor-border": "#c78070",
    "danger": "#b12e40",
    "danger-strong": "#8e2434",
    "danger-surface": "#faeded",
    "danger-border": "#cb7d87",
    "on-danger": "#ffffff",
    "overlay": "#fdfefb",
    "image-stage": "#ffffff",
    "image-ink": "#244d35",
    "brand-surface": "#244d35",
    "on-brand": "#ffffff",
    "shadow-ink": "#20342a",
    "art-highlight": "rgb(255 255 255 / 22%)",
    "primary-action": "#244d35",
    "brand-primary": "#244d35",
    "brand-primary-hover": "#1b392a",
    "brand-primary-active": "#142e20",
    "brand-secondary": "#526157",
    "brand-soft": "#edf2ed",
    "brand-strong": "#dce7dc",
    "brand-border": "#7b8d7f",
    "brand-ring": "#244d35",
    "background-elevated": "#fdfefb",
    "background-panel": "#edf2ed",
    "background-muted": "#f5f1e8",
    "surface-card": "#fdfefb",
    "surface-overlay": "#fdfefb",
    "surface-input": "#fdfefb",
    "surface-button-secondary": "#fdfefb",
    "text-inverse": "#ffffff",
    "border-default": "#7b8d7f",
    "border-strong": "#59675d",
    "focus": "#244d35",
    "input": "#fdfefb",
    "success-muted": "#e9f4ec",
    "good": "#187344",
    "mixed": "#8a5b16",
    "caution": "#8a5b16",
    "avoid": "#b12e40",
    "not-supported": "#b12e40",
    "info": "#526157",
    "neutral": "#59675d",
    "unknown": "#59675d",
    "unknown-surface": "#edf2ed",
    "status-positive": "#187344",
    "status-positive-soft": "#e9f4ec",
    "status-caution": "#8a5b16",
    "status-caution-soft": "#fbf3df",
    "status-negative": "#b12e40",
    "status-negative-soft": "#faeded",
    "status-neutral": "#59675d",
    "status-neutral-soft": "#edf2ed",
    "meter-excellent": "#187344",
    "meter-good": "#187344",
    "meter-mixed": "#8a5b16",
    "meter-poor": "#b14430",
    "meter-avoid": "#b12e40",
    "tooltip": "#20342a",
    "on-tooltip": "#fdfefb",
    "bg": "#f5f1e8",
    "secondary": "#edf2ed",
    "subtle": "#f5f1e8",
    "strong": "#dce7dc",
    "text": "#20342a",
    "accent": "#244d35",
    "accent-hover": "#1b392a",
    "accent-active": "#142e20",
    "on-accent": "#ffffff",
    "shadow": "0 18px 56px color-mix(in srgb, #20342a 24%, transparent)",
    "shadow-compact": "0 6px 20px color-mix(in srgb, #20342a 14%, transparent)",
    "logo-filter": "brightness(0) invert(0.5) sepia(1) saturate(1.975) hue-rotate(92deg) brightness(0.429605)",
    "logo-inverse-filter": "none"
  });
  const dark = Object.freeze({
    "background": "#17211c",
    "page": "#202c25",
    "surface": "#202c25",
    "surface-muted": "#29382e",
    "surface-strong": "#35483a",
    "primary": "#b6cda9",
    "primary-hover": "#cbdfc0",
    "primary-active": "#d5e5c6",
    "on-primary": "#17211c",
    "text-primary": "#f1f5ef",
    "text-secondary": "#c2cdbf",
    "text-muted": "#a7b6a5",
    "border": "#718573",
    "border-subtle": "#435647",
    "success": "#70d69a",
    "success-strong": "#a0e6ba",
    "success-surface": "#253d2e",
    "success-border": "#618b70",
    "warning": "#f1c45b",
    "warning-strong": "#f6d796",
    "warning-surface": "#3b3323",
    "warning-border": "#8b7448",
    "poor": "#f3a18c",
    "poor-surface": "#402e28",
    "poor-border": "#986a5f",
    "danger": "#ff9c9c",
    "danger-strong": "#ffc0c0",
    "danger-surface": "#432e2c",
    "danger-border": "#996963",
    "on-danger": "#321917",
    "overlay": "#202c25",
    "image-stage": "#ffffff",
    "image-ink": "#244d35",
    "brand-surface": "#29382e",
    "on-brand": "#f1f5ef",
    "shadow-ink": "#080f0a",
    "art-highlight": "rgb(255 255 255 / 8%)",
    "primary-action": "#b6cda9",
    "brand-primary": "#b6cda9",
    "brand-primary-hover": "#cbdfc0",
    "brand-primary-active": "#d5e5c6",
    "brand-secondary": "#c2cdbf",
    "brand-soft": "#29382e",
    "brand-strong": "#35483a",
    "brand-border": "#718573",
    "brand-ring": "#b6cda9",
    "background-elevated": "#202c25",
    "background-panel": "#29382e",
    "background-muted": "#17211c",
    "surface-card": "#202c25",
    "surface-overlay": "#202c25",
    "surface-input": "#202c25",
    "surface-button-secondary": "#202c25",
    "text-inverse": "#17211c",
    "border-default": "#718573",
    "border-strong": "#a7b6a5",
    "focus": "#b6cda9",
    "input": "#202c25",
    "success-muted": "#253d2e",
    "good": "#70d69a",
    "mixed": "#f1c45b",
    "caution": "#f1c45b",
    "avoid": "#ff9c9c",
    "not-supported": "#ff9c9c",
    "info": "#c2cdbf",
    "neutral": "#a7b6a5",
    "unknown": "#a7b6a5",
    "unknown-surface": "#29382e",
    "status-positive": "#70d69a",
    "status-positive-soft": "#253d2e",
    "status-caution": "#f1c45b",
    "status-caution-soft": "#3b3323",
    "status-negative": "#ff9c9c",
    "status-negative-soft": "#432e2c",
    "status-neutral": "#a7b6a5",
    "status-neutral-soft": "#29382e",
    "meter-excellent": "#70d69a",
    "meter-good": "#70d69a",
    "meter-mixed": "#f1c45b",
    "meter-poor": "#f3a18c",
    "meter-avoid": "#ff9c9c",
    "tooltip": "#f1f5ef",
    "on-tooltip": "#202c25",
    "bg": "#17211c",
    "secondary": "#29382e",
    "subtle": "#17211c",
    "strong": "#35483a",
    "text": "#f1f5ef",
    "accent": "#b6cda9",
    "accent-hover": "#cbdfc0",
    "accent-active": "#d5e5c6",
    "on-accent": "#17211c",
    "shadow": "0 18px 56px color-mix(in srgb, #080f0a 24%, transparent)",
    "shadow-compact": "0 6px 20px color-mix(in srgb, #080f0a 14%, transparent)",
    "logo-filter": "none",
    "logo-inverse-filter": "brightness(0) invert(0.5) sepia(1) saturate(1.975) hue-rotate(92deg) brightness(0.429605)"
  });
  
  
  const aliases = {
    cream: 'subtle', green: 'accent', 'green-dark': 'text', muted: 'secondary',
    avoid: 'danger', 'avoid-soft': 'danger-surface', 'poor-soft': 'poor-surface',
    mixed: 'warning', 'mixed-soft': 'warning-surface', 'good-soft': 'success-surface',
    pawmarked: 'success', 'pawmarked-soft': 'success-surface',
    'status-positive': 'success', 'status-positive-soft': 'success-surface',
    'status-negative': 'danger', 'status-negative-soft': 'danger-surface',
    'status-caution': 'warning', 'status-caution-soft': 'warning-surface',
    'status-neutral': 'unknown', 'status-neutral-soft': 'unknown-surface',
  };
  const declarations = (palette) => Object.entries(palette).map(([key, value]) => `--pawmark-${key}:${value};`).join('') +
    Object.entries(aliases).map(([key, value]) => `--pawmark-${key}:var(--pawmark-${value});`).join('');
  function css(selector) {
    const fonts = '--pawmark-font-brand:Georgia,"Times New Roman",serif;--pawmark-font-ui:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
    const state = value => selector === ':host' ? `:host([data-pawmark-theme="${value}"])` : `${selector}[data-pawmark-theme="${value}"]`;
    const pending = selector === ':host' ? ':host([data-pawmark-theme-pending])' : `${selector}[data-pawmark-theme-pending]`;
    return `${selector}{${declarations(light)}${fonts}}${state('light')}{color-scheme:light!important;}${state('dark')}{${declarations(dark)}color-scheme:dark!important;}${pending}{visibility:hidden!important;}${selector} [data-kindvue-logo="transparent"]{filter:var(--pawmark-logo-filter,none);}`;
  }
  const normalize = value => ['light', 'dark', 'system'].includes(value) ? value : 'system';
  const media = scope.matchMedia?.('(prefers-color-scheme: dark)');
  const roots = new Set(), subscribers = new Set();
  let preference = 'system', loaded = false, revision = 0, documentStyle, shadowSheet;
  const mounted = new WeakSet();
  const resolved = () => preference === 'system' ? (media?.matches ? 'dark' : 'light') : preference;
  const snapshot = () => Object.freeze({ preference, resolved: resolved(), ready: loaded });
  function paint(root) {
    const theme = resolved();
    if (root.getAttribute('data-pawmark-theme') !== theme) root.setAttribute('data-pawmark-theme', theme);
    root.toggleAttribute('data-pawmark-theme-pending', !loaded);
  }
  function broadcast() {
    for (const root of roots) {
      if (!root.isConnected) { roots.delete(root); continue; }
      paint(root);
    }
    for (const listener of subscribers) listener(snapshot());
  }
  function mount(root) {
    if (!root) return;
    for (const previous of roots) if (!previous.isConnected) roots.delete(previous);
    if (root.shadowRoot) {
      if (!mounted.has(root) && scope.CSSStyleSheet && 'adoptedStyleSheets' in root.shadowRoot) {
        if (!shadowSheet) { shadowSheet = new scope.CSSStyleSheet(); shadowSheet.replaceSync(css(':host')); }
        root.shadowRoot.adoptedStyleSheets = [...root.shadowRoot.adoptedStyleSheets, shadowSheet];
      } else if (!mounted.has(root)) {
        const style = root.ownerDocument.createElement('style');
        style.setAttribute('data-pawmark-theme-tokens', ''); style.textContent = css(':host');
        root.shadowRoot.append(style);
      }
    } else if (!documentStyle) {
      documentStyle = root.ownerDocument.createElement('style');
      documentStyle.setAttribute('data-pawmark-theme-tokens', '');
      documentStyle.textContent = css('.pawmark-widget') + css('html[data-pawmark-popup]');
      (root.ownerDocument.head || root.ownerDocument.documentElement).append(documentStyle);
    }
    mounted.add(root); roots.add(root); paint(root);
  }
  media?.addEventListener('change', () => { if (preference === 'system') broadcast(); });
  scope.chrome?.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !Object.hasOwn(changes, STORAGE_KEY)) return;
    revision++;
    const next = normalize(changes[STORAGE_KEY].newValue);
    if (preference === next) return;
    preference = next; broadcast();
  });
  const initialRevision = revision;
  const ready = Promise.resolve().then(() => scope.chrome?.storage?.local?.get(STORAGE_KEY)).then(value => {
    if (revision === initialRevision) preference = normalize(value?.[STORAGE_KEY]);
  }).catch(() => {}).finally(() => { loaded = true; broadcast(); });
  async function setPreference(value) {
    if (!['light', 'dark', 'system'].includes(value)) throw new TypeError('Invalid theme preference');
    await ready;
    
    if (!scope.chrome?.storage?.local) throw new Error('Theme storage unavailable');
    if (preference === value) return;
    const writeRevision = revision;
    await scope.chrome.storage.local.set({ [STORAGE_KEY]: value });
    
    if (revision !== writeRevision) return;
    revision++;
    if (preference !== value) { preference = value; broadcast(); }
  }
  scope.PawmarkTheme = Object.freeze({ STORAGE_KEY, light, dark, css, normalize, mount, ready, snapshot, setPreference,
    subscribe(listener) { subscribers.add(listener); listener(snapshot()); return () => subscribers.delete(listener); },
  });
  if (scope.document?.documentElement.hasAttribute('data-pawmark-popup')) mount(scope.document.documentElement);
})(globalThis);
