const element = (id) => document.getElementById(id);
let themeBusy = false;
function paintTheme({ preference, ready }) {
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === preference));
    button.disabled = !ready || themeBusy;
  });
}
globalThis.PawmarkTheme.subscribe(paintTheme);
document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', async () => {
  if (themeBusy) return;
  themeBusy = true;
  paintTheme(globalThis.PawmarkTheme.snapshot());
  element('theme-feedback').textContent = '';
  try { await globalThis.PawmarkTheme.setPreference(button.dataset.themeChoice); }
  catch { element('theme-feedback').textContent = "Appearance couldn't be saved. Try again."; }
  finally { themeBusy = false; paintTheme(globalThis.PawmarkTheme.snapshot()); }
}));
document.querySelectorAll('[data-popup-icon]').forEach((icon) => {
  icon.innerHTML = globalThis.PawmarkSaveIcons[icon.dataset.popupIcon] || '';
});
let busy = false;
async function send(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response?.ok) throw Object.assign(new Error("Couldn't connect to Kindvue. Try again."), { code: response?.error?.code });
  return response.result;
}
function paint(account) {
  globalThis.KindvuePopupSaves.setAccount(account);
  const active = account.authenticated;
  element("account-title").textContent = active ? account.displayName ? `Hello, ${account.displayName}` : "Your Kindvue" : account.state === "expired" ? "Session expired" : account.state === "unavailable" ? "Account unavailable" : "Sign in to Kindvue";
  element("account-copy").textContent = active ? account.emailVerified ? "Your saved products, together." : "Verify your email to sync saved products." : account.state === "expired" ? "Sign in again to sync your saved products." : account.state === "unavailable" ? "Your Kindvue account is currently unavailable." : "Save products, sync your watchlist, and build shopping lists while you shop.";
  element("account-signin").hidden = active || account.state === "unavailable";
  element("account-signin").textContent = account.state === "expired" ? "Sign in again" : "Sign in";
  element("account-verification").hidden = !active || account.emailVerified;
  element("account-menu").hidden = !active && account.state !== "unavailable";
  element("account-signout").hidden = !active;
  element("account-retry").hidden = true;
}
async function action(callback) {
  if (busy) return;
  busy = true;
  document.querySelector(".pawmark-popup__account").setAttribute("aria-busy", "true");
  document.querySelectorAll(".pawmark-popup__account button").forEach((button) => { button.disabled = true; });
  element("account-feedback").textContent = "";
  try { await callback(); }
  catch (error) { element("account-feedback").textContent = error.code === "AUTH_CANCELLED" ? "Connection cancelled." : "Couldn't connect to Kindvue. Try again."; element("account-retry").hidden = false; }
  finally {
    busy = false;
    document.querySelector(".pawmark-popup__account").setAttribute("aria-busy", "false");
    document.querySelectorAll(".pawmark-popup__account button").forEach((button) => { button.disabled = false; });
  }
}
const refresh = () => action(async () => paint(await send("PAWMARK_ACCOUNT_STATE")));
element("account-signin").addEventListener("click", () => action(async () => paint(await send("PAWMARK_SIGN_IN"))));
element("account-signout").addEventListener("click", () => action(async () => { globalThis.KindvuePopupSaves.clear(); paint(await send("PAWMARK_SIGN_OUT")); }));
element("account-resend").addEventListener("click", () => action(async () => { await send("PAWMARK_RESEND_VERIFICATION"); element("account-feedback").textContent = "If verification is needed, a new email has been requested."; }));
element("account-retry").addEventListener("click", refresh);
document.querySelectorAll("[data-destination]").forEach((button) => button.addEventListener("click", () => void send("PAWMARK_OPEN_ACCOUNT", { destination: button.dataset.destination })));
for (const route of ["privacy", "terms"]) element(`pawmark-${route}`).addEventListener("click", (event) => { event.preventDefault(); void chrome.tabs.create({ url: globalThis.PawmarkConfig.getPawmarkUrl(`/${route}`) }); });
window.addEventListener("focus", refresh);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes.pawmarkExtensionCredential) { globalThis.KindvuePopupSaves.clear(); void refresh(); }
});
void refresh();
let savingAssistance = false, savingExtension = false;
function paintAssistance({ enabled, shoppingEnabled, ready }) {
  const label = shoppingEnabled ? 'Turn Shopping Mode off' : 'Turn Shopping Mode on';
  element('shopping-state').textContent = !ready ? 'Unavailable' : shoppingEnabled ? 'On' : 'Off';
  element('shopping-power-label').textContent = label;
  element('shopping-power').setAttribute('aria-label', label);
  element('shopping-power').title = label;
  element('shopping-power').querySelector('[data-popup-icon]').innerHTML = globalThis.PawmarkSaveIcons[shoppingEnabled ? 'visibility' : 'reveal'];
  element('shopping-power').disabled = savingAssistance || !ready || !enabled;
  element('shopping-status').textContent = !ready ? 'Preference unavailable.' : !enabled ? 'Enable Kindvue to use Shopping Mode.' : shoppingEnabled ? 'On across supported shopping sites.' : 'Off across supported shopping sites.';
  element('try-shopping').hidden = !ready || !enabled || !shoppingEnabled || !globalThis.PawmarkConfig.SHOPPING_MODE_ENABLED;
  const extensionLabel = ready && enabled ? 'Disable Kindvue' : 'Enable Kindvue';
  element('extension-state').textContent = !ready ? 'Unavailable' : enabled ? 'Enabled' : 'Disabled';
  element('extension-power-label').textContent = extensionLabel;
  element('extension-power').setAttribute('aria-label', extensionLabel);
  element('extension-power').disabled = savingExtension;
}
globalThis.KindvueAssistance.subscribe(paintAssistance);
element('shopping-power').addEventListener('click', async () => {
  if (savingAssistance) return;
  const state = globalThis.KindvueAssistance.snapshot();
  savingAssistance = true; element('shopping-power').disabled = true;
  try { await globalThis.KindvueAssistance.setShoppingEnabled(!state.shoppingEnabled); }
  catch { element('shopping-status').textContent = "Couldn't save the preference. Try again."; }
  finally { savingAssistance = false; element('shopping-power').disabled = !globalThis.KindvueAssistance.snapshot().enabled; }
});
element('extension-power').addEventListener('click', async () => {
  if (savingExtension) return;
  savingExtension = true; element('extension-power').disabled = true;
  element('extension-status').textContent = '';
  const state = globalThis.KindvueAssistance.snapshot();
  try { await globalThis.KindvueAssistance.setEnabled(state.ready ? !state.enabled : true); }
  catch { element('extension-status').textContent = "Couldn't save the extension preference. Try again."; }
  finally { savingExtension = false; paintAssistance(globalThis.KindvueAssistance.snapshot()); }
});
