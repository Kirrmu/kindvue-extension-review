const getPawmarkWebUrl = globalThis.PawmarkConfig.getPawmarkUrl;
const MIN_CONFIDENCE_TO_SHOW_DETAILS = 58;
const MINIMUM_PURCHASE_LINK_SCORE = 70;
const WIDGET_ID = "pawmark-extension-widget";
const assistance = globalThis.KindvueAssistance;
let pageSuspended = false;
const assistanceActive = () => !pageSuspended && assistance.isActive();
const DETECTION_DEBOUNCE_MS = 650;
const requestLifecycle = globalThis.PawmarkRequestLifecycle;
const NYKAA_STABILITY_DELAY_MS = 360;
const NYKAA_MIN_SETTLE_MS = 760;
const NYKAA_FALLBACK_WAIT_MS = 4800;
const NYKAA_MAX_WAIT_MS = 7200;
const NYKAA_MAX_RETRY_ATTEMPTS = 16;

let detectionTimer;
let nykaaRetryTimer;
let pendingDetectionReason = "page update";
let activeRequestId = 0;
let lastIdentityFingerprint = "";
let lastRetailerIdentity;
let lastObservedUrl = window.location.href;
let nykaaIdentityState = createNykaaIdentityState();

class PawmarkExtensionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PawmarkExtensionError";
    this.code = code;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getScoreTone(score) {
  return globalThis.PawmarkUI?.getScoreTone(score) || { key: "neutral", status: "Unknown" };
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function fallbackBundleReason(reasonCode, label, brandName) {
  const productForm = String(label || "product").toLowerCase();
  if (reasonCode === "AMBIGUOUS_CANDIDATES") {
    return `Multiple Kindvue products fit this ${productForm} description, so Kindvue cannot identify the exact formulation confidently.`;
  }
  if (reasonCode === "NO_CATALOGUE_MATCH") {
    return `The listing provides a specific ${productForm} description, but Kindvue does not currently have a matching product in the catalogue.`;
  }
  if (reasonCode === "INSUFFICIENT_RETAILER_DETAIL") {
    return `The retailer does not provide enough product-level detail to identify this ${productForm} formulation reliably.`;
  }
  if (brandName) {
    return `The listing says '${label}' but does not specify which ${brandName} ${productForm} is included.`;
  }
  return `The listing names only the ${productForm} type and does not specify the exact formulation.`;
}

function debugLog(label, details) {
  globalThis.PawmarkConfig?.debugLog(label, details);
}

function debugWarn(label, details) {
  globalThis.PawmarkConfig?.debugWarn(label, details);
}

function currentPageFingerprint() {
  try {
    const platforms = globalThis.PawmarkPlatforms;
    const adapter = platforms?.getAdapter(window.location.href);
    if (!adapter || (!adapter.isProductPage() && !adapter.isPotentialProductPage?.())) return "";
    return platforms.extractContext(adapter).fingerprint || "";
  } catch (error) {
    debugWarn("[Kindvue content] Could not verify current identity", {
      message: error instanceof Error ? error.message : String(error),
    });
    return "";
  }
}

function shouldAcceptMatchResponse(requestId, requestFingerprint) {
  if (!assistanceActive()) return false;
  return requestLifecycle?.shouldAcceptResponse({
    requestId,
    activeRequestId,
    requestFingerprint,
    currentFingerprint: currentPageFingerprint(),
  }) === true;
}

function discardStaleResponse(requestId, requestFingerprint) {
  if (!assistanceActive()) return;
  debugLog("[Kindvue STALE RESPONSE DISCARDED]", {
    requestId,
    activeRequestId,
    requestFingerprint,
    currentFingerprint: currentPageFingerprint(),
  });
  schedulePawmarkRefresh("stale response discarded", 0);
}

function createNykaaIdentityState(routeKey = "") {
  return {
    routeKey,
    startedAt: Date.now(),
    attempts: 0,
    candidateKey: "",
    candidateObservedAt: 0,
    stableObservations: 0,
    previousIdentity: lastRetailerIdentity,
  };
}

function clearNykaaRetry() {
  if (!nykaaRetryTimer) return;
  window.clearTimeout(nykaaRetryTimer);
  nykaaRetryTimer = undefined;
}

function getNykaaRouteKey(value = window.location.href) {
  try {
    const url = new URL(value);
    const skuId = url.searchParams.get("skuId")?.trim();
    return `${url.origin}${url.pathname}${skuId ? `?skuId=${skuId}` : ""}`;
  } catch {
    return value;
  }
}

function resetNykaaIdentityState(routeKey = "") {
  clearNykaaRetry();
  nykaaIdentityState = createNykaaIdentityState(routeKey);
}

function scheduleNykaaIdentityRetry(reason, delay = NYKAA_STABILITY_DELAY_MS) {
  if (!assistanceActive()) return;
  if (nykaaRetryTimer) return;

  nykaaRetryTimer = window.setTimeout(() => {
    nykaaRetryTimer = undefined;
    refreshPawmark(`Nykaa identity retry: ${reason}`);
  }, delay);
}

function ensureNykaaLoading(context = {}) {
  const current = document.getElementById(WIDGET_ID);
  if (current?.dataset.pawmarkState === "loading") return;

  renderLoading({
    platformName: context.platformName || "Nykaa",
  });
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function purchaseLinksAreEligible(value, score) {
  return typeof value === "boolean" ? value : safeNumber(score) >= MINIMUM_PURCHASE_LINK_SCORE;
}

function normalizeClaimConsistencyIssue(value) {
  const issue = safeObject(value);
  const summary = optionalString(issue?.summary);
  if (!summary) return undefined;

  return {
    title: optionalString(issue.title) || "Claim inconsistency",
    summary,
    penalty: safeNumber(issue.penalty, 0),
  };
}

function normalizeEvidenceCautions(value) {
  return (Array.isArray(value) ? value : []).flatMap((candidate) => {
    const caution = safeObject(candidate);
    const title = optionalString(caution?.title);
    const summary = optionalString(caution?.summary);
    if (!title || !summary) return [];

    const source = safeObject(caution.source);
    const sourceUrl = optionalString(source?.url);

    const type = optionalString(caution.type) || "general_context";
    return [{
      type,
      title,
      summary: type === "vegan_status_caution"
        && /non-vegan assessment/i.test(summary)
        && !/disclosed ingredient information/i.test(summary)
        ? "Non-vegan assessment is based on available formulation evidence; ingredient sources and product claims may vary."
        : summary,
      source: sourceUrl
        ? {
            label: optionalString(source.label) || "Evidence source",
            url: sourceUrl,
          }
        : undefined,
    }];
  });
}

function normalizeAlternatives(value) {
  return (Array.isArray(value) ? value : []).filter(
    (alternative) => safeObject(alternative) && optionalString(alternative.name),
  );
}

function wireImageFallbacks(widget) {
  widget.querySelectorAll("[data-pawmark-image]").forEach((image) => {
    image.addEventListener("error", () => {
      image.hidden = true;
      const fallback = image.nextElementSibling;
      if (fallback) fallback.hidden = false;
    }, { once: true });
  });
}


function sendPawmarkMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new PawmarkExtensionError(
          "RUNTIME_MESSAGE_ERROR",
          chrome.runtime.lastError.message || "The Kindvue service worker did not respond.",
        ));
        return;
      }

      if (!response || typeof response !== "object") {
        reject(new PawmarkExtensionError(
          "MALFORMED_BACKGROUND_RESPONSE",
          "The Kindvue service worker returned an unexpected response.",
        ));
        return;
      }

      if (!response?.ok) {
        const structuredError = safeObject(response.error);
        reject(new PawmarkExtensionError(
          optionalString(structuredError?.code) || "BACKGROUND_REQUEST_ERROR",
          optionalString(structuredError?.message) ||
            optionalString(response.error) ||
            "The Kindvue request could not be completed.",
        ));
        return;
      }

      resolve(response.result);
    });
  });
}

function getMatchPayload(result) {
  if (!result || typeof result !== "object") {
    return undefined;
  }

  const resultType = optionalString(result.type);

  if (resultType === "product" && safeObject(result.product)) {
    const score = safeNumber(result.product.score);
    const matchDetails = safeObject(result.match);
    return {
      kind: "product",
      typeLabel: "Product",
      id: result.product.id,
      slug: result.product.slug,
      name: result.product.name || "Matched product",
      brandName: result.product.brandName,
      brandSlug: result.product.brandSlug,
      score,
      status: result.product.status || "Unknown",
      url: result.product.url || "#",
      confidence: safeNumber(matchDetails?.confidence),
      confidenceLevel: safeNumber(matchDetails?.confidence) === 100 ? "EXACT" : "HIGH",
      reason: result.product.shortReason || optionalString(matchDetails?.method),
      imageUrl: result.product.imageUrl,
      veganStatus: optionalString(result.product.veganStatus) || "unknown",
      veganStatusLabel: optionalString(result.product.veganStatusLabel) || "Unknown",
      crueltyFreeStatus: optionalString(result.product.crueltyFreeStatus) || "unknown",
      crueltyFreeStatusLabel: optionalString(result.product.crueltyFreeStatusLabel) || "Unknown",
      claimConsistencyIssue: normalizeClaimConsistencyIssue(result.product.claimConsistencyIssue),
      evidenceCautions: normalizeEvidenceCautions(result.product.evidenceCautions),
      purchaseLinksEligible: purchaseLinksAreEligible(
        result.product.purchaseLinksEligible,
        score,
      ),
      purchaseLinks: Array.isArray(result.product.purchaseLinks) ? result.product.purchaseLinks : [],
      betterAlternatives: normalizeAlternatives(result.product.betterAlternatives),
      matchedVariant: safeObject(result.matchedVariant) || safeObject(result.product.matchedVariant),
    };
  }

  if (resultType === "brand" && safeObject(result.brand)) {
    return {
      kind: "brand",
      typeLabel: "Brand",
      slug: result.brand.slug,
      name: result.brand.name || "Matched brand",
      url: result.brand.url || "#",
      confidence: 100,
      reason: optionalString(result.reason) || result.brand.shortReason,
      veganStatus: optionalString(result.brand.veganStatus) || "unknown",
      veganStatusLabel: optionalString(result.brand.veganStatusLabel) || "Unknown",
      crueltyFreeStatus: optionalString(result.brand.crueltyFreeStatus) || "unknown",
      crueltyFreeStatusLabel: optionalString(result.brand.crueltyFreeStatusLabel) || "Unknown",
      claimConsistencyIssue: normalizeClaimConsistencyIssue(result.brand.claimConsistencyIssue),
      evidenceCautions: normalizeEvidenceCautions(result.brand.evidenceCautions),
      purchaseLinks: [],
      betterAlternatives: [],
    };
  }

  if (resultType === "unresolved") {
    const reasonCode = optionalString(result.reasonCode) || "INSUFFICIENT_RETAILER_DETAIL";
    const label = optionalString(result.label) || "Product";
    const brandName = optionalString(result.brandName);
    return {
      kind: "unresolved",
      typeLabel: "Product",
      confidence: 100,
      productForm: optionalString(result.productForm) || "product",
      label,
      brandName,
      reasonCode,
      reason: optionalString(result.reason) || fallbackBundleReason(reasonCode, label, brandName),
      evidence: (Array.isArray(result.evidence) ? result.evidence : [])
        .map(optionalString)
        .filter(Boolean),
    };
  }

  if (resultType === "bundle" && Array.isArray(result.components)) {
    const bundleBrand = safeObject(result.brand);
    const components = result.components.flatMap((candidate) => {
      const component = safeObject(candidate);
      const rawLabel = optionalString(component?.rawLabel);
      const componentMatch = getMatchPayload(component?.match);
      if (!rawLabel) return [];
      return [{
        rawLabel,
        status: optionalString(component.status),
        productForm: optionalString(component.productForm),
        label: optionalString(component.label),
        reasonCode: optionalString(component.reasonCode),
        reason: optionalString(component.reason),
        normalized: optionalString(component.normalized),
        match: componentMatch || {
          kind: "none",
          typeLabel: "Product",
          confidence: 100,
          reason: optionalString(component?.match?.reason) || "Exact product not found.",
        },
      }];
    });
    const incomplete = result.contentsComplete === false && result.componentCount === null;
    if (components.length < 2 && !incomplete) return undefined;

    return {
      kind: "bundle",
      componentCount: incomplete ? null : components.length,
      contentsComplete: !incomplete,
      typeLabel: "Bundle",
      confidence: 100,
      reason: optionalString(result.reason),
      brandName: optionalString(bundleBrand?.name),
      components,
    };
  }

  if (resultType === "none") {
    return {
      kind: "none",
      typeLabel: "Product",
      confidence: 100,
      reason: optionalString(result.reason) || "No exact Kindvue product match found.",
    };
  }

  return undefined;
}

let disposePanelResize;
let disposePanelTheme;

function removeExistingWidget() {
  disposePanelResize?.();
  disposePanelResize = undefined;
  disposePanelTheme?.();
  disposePanelTheme = undefined;
  document.getElementById(WIDGET_ID)?.remove();
}

function createWidgetShell() {
  removeExistingWidget();

  const widget = document.createElement("aside");
  widget.id = WIDGET_ID;
  widget.className = "pawmark-widget";
  globalThis.PawmarkTheme?.mount(widget);
  widget.setAttribute("aria-live", "polite");

  return widget;
}

function renderLauncher() {
  return `
    <button class="pawmark-widget__launcher" type="button" data-pawmark-open aria-label="Open Kindvue">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" data-kindvue-logo="transparent"><image href="data:image/png;base64,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" width="48" height="48"/></svg>
    </button>
  `;
}

function renderBrandLockup() {
  return `
    <div class="pawmark-widget__brand-lockup" role="img" aria-label="Kindvue">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" fill="none" data-kindvue-logo="transparent"><image href="data:image/png;base64,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" width="48" height="48"/></svg>
      <strong>Kindvue</strong>
    </div>
  `;
}

function wireWidgetControls(widget) {
  disposePanelResize = globalThis.KindvuePanelResize?.mount(widget);
  const theme = globalThis.PawmarkTheme;
  if (theme) {
    let busy = false;
    const feedback = document.createElement("span");
    feedback.className = "pawmark-widget__theme-feedback";
    feedback.setAttribute("role", "status");
    widget.append(feedback);
    const buttons = [false, true].map(launcher => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `pawmark-widget__appearance${launcher ? " pawmark-widget__appearance--launcher" : ""}`;
      button.setAttribute("data-pawmark-theme-toggle", "");
      if (launcher) widget.append(button);
      else widget.querySelector(".pawmark-widget__actions")?.prepend(button);
      button.addEventListener("click", async event => {
        if (!event.isTrusted || busy) return;
        event.stopPropagation();
        busy = true; feedback.textContent = ""; paint(theme.snapshot());
        try { await theme.setPreference(theme.snapshot().resolved === "dark" ? "light" : "dark"); }
        catch { feedback.textContent = "Appearance couldn't be saved. Try again."; }
        finally { busy = false; paint(theme.snapshot()); }
      });
      return button;
    });
    function paint({ preference, resolved, ready }) {
      const label = resolved === "dark" ? "Use light mode" : "Use dark mode";
      for (const button of buttons) {
        button.innerHTML = globalThis.PawmarkSaveIcons[resolved === "dark" ? "sun" : "moon"];
        button.setAttribute("aria-label", label);
        button.setAttribute("aria-description", `Current appearance: ${resolved}${preference === "system" ? " (system)" : ""}. Applies only to Kindvue.`);
        button.title = feedback.textContent || label;
        button.disabled = !ready || busy;
      }
    }
    disposePanelTheme = theme.subscribe(paint);
  }
  const minimizeButton = widget.querySelector("[data-pawmark-minimize]");
  const openButton = widget.querySelector("[data-pawmark-open]");
  const aboutButton = widget.querySelector("[data-pawmark-about]");
  const aboutPanel = widget.querySelector("[data-pawmark-about-panel]");
  const cautionButton = widget.querySelector("[data-pawmark-cautions-toggle]");
  const cautionPanel = widget.querySelector("[data-pawmark-cautions-panel]");

  minimizeButton?.addEventListener("click", () => {
    widget.classList.remove("pawmark-widget--expanding");
    widget.classList.add("pawmark-widget--minimized");
    openButton?.focus();
  });
  openButton?.addEventListener("click", () => {
    widget.classList.remove("pawmark-widget--minimized");
    widget.classList.add("pawmark-widget--expanding");
    window.setTimeout(() => widget.classList.remove("pawmark-widget--expanding"), 220);
    minimizeButton?.focus();
  });
  aboutButton?.addEventListener("click", () => {
    if (!aboutPanel) return;
    const willOpen = aboutPanel.hidden;
    aboutPanel.hidden = !willOpen;
    aboutButton.setAttribute("aria-expanded", String(willOpen));
  });
  cautionButton?.addEventListener("click", () => {
    if (!cautionPanel) return;
    const willOpen = cautionPanel.hidden;
    const count = Number(cautionButton.dataset.cautionCount || 0);
    cautionPanel.hidden = !willOpen;
    cautionButton.setAttribute("aria-expanded", String(willOpen));
    cautionButton.textContent = willOpen
      ? "Hide additional cautions"
      : `+${count} more caution${count === 1 ? "" : "s"}`;
  });
}

function renderLoading(context) {
  const widget = createWidgetShell();
  widget.classList.add("pawmark-widget--quiet");
  widget.dataset.pawmarkState = "loading";
  widget.innerHTML = `
    ${renderLauncher()}
    <div class="pawmark-widget__header">
      ${renderBrandLockup()}
      <div class="pawmark-widget__actions">
        <button type="button" data-pawmark-minimize aria-label="Minimize Kindvue">&#215;</button>
      </div>
    </div>
    <div class="pawmark-widget__quiet-body">
      <div class="pawmark-widget__loading-row">
        <span class="pawmark-widget__loader" aria-hidden="true"></span>
        <div>
          <p class="pawmark-widget__eyebrow">${escapeHtml(context.platformName)} product</p>
          <p class="pawmark-widget__quiet-text">Checking this product&hellip;</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(widget);
  wireWidgetControls(widget);
}

async function submitMissingProduct(context, widget, triggerButton) {
  const scope = triggerButton?.closest("[data-pawmark-submission-scope]") || widget;
  const status = scope.querySelector("[data-pawmark-submit-status]");
  const button = triggerButton || scope.querySelector("[data-pawmark-submit]");
  const title = context.productTitle || "";

  if (!title || !status || !button) {
    return;
  }

  button.disabled = true;
  status.textContent = "Submitting...";

  try {
    await sendPawmarkMessage({
      type: "PAWMARK_SUBMIT_PRODUCT",
      payload: {
        productName: title,
        brandName: context.detectedBrand || undefined,
        sourceUrl: context.pageUrl,
        platform: context.platform,
        notes: context.submissionNotes || undefined,
      },
    });

    status.textContent = "Submitted for review.";
  } catch (error) {
    debugWarn("[Kindvue content] Submission failed", error);
    button.disabled = false;
    status.textContent = "Could not submit right now.";
  }
}

async function submitUserReport(match, context, widget, triggerButton) {
  const scope = triggerButton?.closest("[data-pawmark-report-scope]") || widget;
  const status = scope.querySelector("[data-pawmark-report-status]");
  const button = triggerButton || scope.querySelector("[data-pawmark-report]");

  if (!status || !button) {
    return;
  }

  button.disabled = true;
  status.textContent = "Sending report...";

  try {
    await sendPawmarkMessage({
      type: "PAWMARK_SUBMIT_REPORT",
      payload: {
        reportType: "wrong_match",
        productSlug: match.typeLabel === "Product" ? match.slug : undefined,
        brandSlug: match.typeLabel === "Brand" ? match.slug : match.brandSlug,
        productName: match.typeLabel === "Product" ? match.name : context.productTitle,
        brandName: match.brandName || (match.typeLabel === "Brand" ? match.name : context.detectedBrand),
        pageUrl: context.pageUrl,
        platform: context.platform,
        message: context.productTitle
          ? `Detected shopping title: ${context.productTitle}`
          : undefined,
      },
    });

    status.textContent = "Thanks - we'll review this.";
  } catch (error) {
    debugWarn("[Kindvue content] Report failed", error);
    button.disabled = false;
    status.textContent = "Could not send report right now.";
  }
}

function renderNoMatch(context = {}) {
  const title = context.productTitle || "";
  const widget = createWidgetShell();
  widget.classList.add("pawmark-widget--quiet");
  widget.innerHTML = `
    ${renderLauncher()}
    <div class="pawmark-widget__header">
      ${renderBrandLockup()}
      <div class="pawmark-widget__actions">
        <button type="button" data-pawmark-minimize aria-label="Minimize Kindvue">&#215;</button>
      </div>
    </div>
    <div class="pawmark-widget__quiet-body">
      ${context.platformName ? `<p class="pawmark-widget__eyebrow">${escapeHtml(context.platformName)} product</p>` : ""}
      <p class="pawmark-widget__quiet-title">No Kindvue match yet.</p>
      <p class="pawmark-widget__quiet-text">Help us add it to the catalogue.</p>
      ${
        title
          ? `<p class="pawmark-widget__detected-title">${escapeHtml(title)}</p>
             <button class="pawmark-widget__submit" type="button" data-pawmark-submit>Submit this product</button>
             <p class="pawmark-widget__submission-note">Submission helps Kindvue identify products to review. It does not guarantee inclusion or a particular rating.</p>
             <p class="pawmark-widget__submit-status" data-pawmark-submit-status></p>`
          : ""
      }
    </div>
  `;
  document.body.appendChild(widget);
  wireWidgetControls(widget);
  widget.querySelector("[data-pawmark-submit]")?.addEventListener("click", () => {
    submitMissingProduct(context, widget);
  });
}

function renderError(errorCode = "REQUEST_FAILED") {
  const widget = createWidgetShell();
  widget.classList.add("pawmark-widget--quiet");
  const guidance = errorCode === "BACKEND_UNAVAILABLE" || errorCode === "NETWORK_ERROR"
    ? "Make sure Kindvue is running, then try again."
    : errorCode === "RUNTIME_MESSAGE_ERROR"
      ? "Reload the extension, then try again."
      : "Try again in a moment.";
  widget.innerHTML = `
    ${renderLauncher()}
    <div class="pawmark-widget__header">
      ${renderBrandLockup()}
      <div class="pawmark-widget__actions">
        <button type="button" data-pawmark-minimize aria-label="Minimize Kindvue">&#215;</button>
      </div>
    </div>
    <div class="pawmark-widget__quiet-body">
      <p class="pawmark-widget__quiet-title">Kindvue couldn&rsquo;t check this product right now.</p>
      <p class="pawmark-widget__quiet-text">${guidance}</p>
      <button class="pawmark-widget__retry" type="button" data-pawmark-retry>Try again</button>
    </div>
  `;
  document.body.appendChild(widget);
  wireWidgetControls(widget);
  widget.querySelector("[data-pawmark-retry]")?.addEventListener("click", () => {
    lastIdentityFingerprint = "";
    refreshPawmark("manual retry");
  });
}

function getTrackedPurchaseUrl(link, placement) {
  const value = String(link?.url || "");
  if (!value.startsWith("/go/")) return value;

  const url = new URL(getPawmarkWebUrl(value));
  url.searchParams.set("placement", placement);
  return url.toString();
}

function renderPurchaseLinks(links, label = "Available at", compact = false, placement = "extension_current_product") {
  const purchaseLinks = globalThis.PawmarkUI?.getPurchaseLinks(links) || [];
  if (purchaseLinks.length === 0) {
    return "";
  }

  return `
    <div class="pawmark-widget__purchase ${compact ? "pawmark-widget__purchase--compact" : ""}">
      ${label ? `<p>${escapeHtml(label)}</p>` : ""}
      <div class="pawmark-widget__platforms">
      ${purchaseLinks
        .map(
          (link) => `
            <a aria-label="Buy on ${escapeHtml(link.label)}" href="${escapeHtml(getTrackedPurchaseUrl(link, placement))}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(link.label)}
            </a>
          `,
        )
        .join("")}
      </div>
      ${compact ? "" : '<p class="pawmark-widget__retailer-note">Checkout is with the retailer. Check its final price, tax and shipping.</p>'}
      ${!compact && purchaseLinks.some((link) => link.affiliateActive) ? '<p class="pawmark-widget__affiliate-disclosure">Kindvue may earn a commission at no extra cost to you. This never changes ratings, evidence or recommendation order.</p>' : ""}
    </div>
  `;
}

function renderCurrentProductPurchaseState(match) {
  if (match.purchaseLinksEligible) {
    return renderPurchaseLinks(match.purchaseLinks, "Available at", false, "extension_current_product");
  }

  return `
    <div class="pawmark-widget__purchase-policy" role="note">
      <strong>Buying links hidden</strong>
      <p>Kindvue only links products scoring 70+.</p>
      ${match.betterAlternatives.length > 0 ? "<span>Explore Kinder Choice below.</span>" : ""}
    </div>
  `;
}

function renderAlternativeImage(alternative) {
  const fallback = escapeHtml((alternative.name || "P").trim().charAt(0).toUpperCase());
  if (!alternative.imageUrl) {
    return `<span class="pawmark-widget__alternative-fallback" aria-hidden="true">${fallback}</span>`;
  }

  return `
    <img data-pawmark-image src="${escapeHtml(alternative.imageUrl)}" alt="${escapeHtml(alternative.imageAlt || alternative.name)}" />
    <span class="pawmark-widget__alternative-fallback" aria-hidden="true" hidden>${fallback}</span>
  `;
}

function renderAlternatives(alternatives, productUrl) {
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    return `
      <section class="pawmark-widget__alternatives">
        <h3>Kinder Choice</h3>
        <p class="pawmark-widget__empty">No Kinder Choice found yet.</p>
      </section>
    `;
  }

  return `
    <section class="pawmark-widget__alternatives">
      <h3>Kinder Choice</h3>
      <div class="pawmark-widget__alternative-list">
        ${alternatives
          .slice(0, 3)
          .map((alternative) => {
            const tone = getScoreTone(alternative.score);
            const purchaseLinksEligible = purchaseLinksAreEligible(
              alternative.purchaseLinksEligible,
              alternative.score,
            );
            return `
              <article class="pawmark-widget__alternative">
                <div class="pawmark-widget__alternative-image">
                  ${renderAlternativeImage(alternative)}
                </div>
                <div class="pawmark-widget__alternative-content">
                  <a class="pawmark-widget__alternative-name" href="${escapeHtml(
                    getPawmarkWebUrl(alternative.url),
                  )}" target="_blank" rel="noopener noreferrer">
                    ${escapeHtml(alternative.name)}
                  </a>
                  <p>${escapeHtml(alternative.brandName || "Brand")}</p>
                  ${purchaseLinksEligible ? renderPurchaseLinks(alternative.purchaseLinks, "", true, "extension_alternative") : ""}
                </div>
                <span class="pawmark-widget__score-pill" data-score-tone="${tone.key}" aria-label="${escapeHtml(alternative.score)} out of 100, ${globalThis.PawmarkUI.getScoreLabel(tone.status)}">
                  ${escapeHtml(alternative.score)}
                </span>
              </article>
            `;
          })
          .join("")}
      </div>
      ${alternatives.some((alternative) => Array.isArray(alternative.purchaseLinks) && alternative.purchaseLinks.some((link) => link?.affiliateActive === true)) ? '<p class="pawmark-widget__affiliate-disclosure pawmark-widget__affiliate-disclosure--alternatives">Kindvue may earn a commission from qualifying purchases, at no extra cost to you.</p>' : ""}
      ${alternatives.length > 3 ? `<a class="pawmark-widget__view-more" href="${escapeHtml(getPawmarkWebUrl(productUrl))}" target="_blank" rel="noopener noreferrer">Explore Kinder Choice</a>` : ""}
    </section>
  `;
}

function getVeganIndicator(status, label) {
  if (status === "vegan") return { label: label || "Yes", tone: "positive" };
  if (status === "non_vegan") return { label: label || "No", tone: "negative" };
  if (status === "unclear" || status === "partial") {
    return { label: label || "Unclear", tone: "caution" };
  }
  return { label: label || "Unknown", tone: "neutral" };
}

function getCrueltyFreeIndicator(status, label) {
  if (status === "confirmed") {
    return { label: "Yes", tone: "positive" };
  }
  if (status === "not_cruelty_free") {
    return { label: "No", tone: "negative" };
  }
  if (status === "unclear") {
    return { label: label || "Unclear", tone: "caution" };
  }
  return { label: label || "Unknown", tone: "neutral" };
}

function renderConceptIcon(name) {
  return globalThis.PawmarkUI?.getConceptIcon?.(name) || "";
}

function renderStatusIndicator(name, indicator, concept) {
  return `
    <div class="pawmark-widget__status" data-status-tone="${indicator.tone}">
      <span class="pawmark-widget__status-symbol" aria-hidden="true">${renderConceptIcon(concept)}</span>
      <span class="pawmark-widget__status-name">${escapeHtml(name)}</span>
      <strong>${escapeHtml(indicator.label)}</strong>
    </div>
  `;
}

function renderStatusIndicators(match) {
  return `
    <div class="pawmark-widget__statuses" aria-label="Vegan and cruelty-free status">
      ${renderStatusIndicator("Vegan", getVeganIndicator(match.veganStatus, match.veganStatusLabel), "vegan")}
      ${renderStatusIndicator(
        "Cruelty-free",
        getCrueltyFreeIndicator(match.crueltyFreeStatus, match.crueltyFreeStatusLabel),
        "cruelty-free",
      )}
    </div>
  `;
}

function normalizeCautionKey(caution) {
  return `${caution.type || "caution"}|${caution.summary || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getDisplayCautions(match) {
  const cautions = [];

  if (match.claimConsistencyIssue?.summary) {
    cautions.push({
      type: "claim_consistency",
      title: match.claimConsistencyIssue.title || "Claim inconsistency",
      summary: match.claimConsistencyIssue.summary,
      penalty: match.claimConsistencyIssue.penalty,
    });
  }

  for (const caution of match.evidenceCautions || []) {
    if (!caution?.summary || !caution?.title) continue;
    if (caution.type === "claim_consistency" && match.claimConsistencyIssue) continue;
    cautions.push(caution);
  }

  return [...new Map(cautions.map((caution) => [normalizeCautionKey(caution), caution])).values()];
}

function renderCautionSource(caution) {
  if (!caution.source?.url) return "";

  return `
    <a class="pawmark-widget__caution-source" href="${escapeHtml(caution.source.url)}" target="_blank" rel="noopener noreferrer">
      View source <span aria-hidden="true">&#8599;</span>
    </a>
  `;
}

function renderCautionContent(caution, compact = false) {
  const penalty = Number(caution.penalty);
  const penaltyLabel = Number.isFinite(penalty) && penalty < 0
    ? ` <span class="pawmark-widget__caution-penalty">&middot; ${penalty}</span>`
    : "";

  return `
    <div class="pawmark-widget__caution-copy ${compact ? "pawmark-widget__caution-copy--compact" : ""}">
      <strong>${escapeHtml(caution.title)}${penaltyLabel}</strong>
      <p>${escapeHtml(caution.summary)}</p>
      ${renderCautionSource(caution)}
    </div>
  `;
}

function renderCautions(match) {
  const cautions = getDisplayCautions(match);
  if (cautions.length === 0) return "";

  const remaining = cautions.slice(1);
  return `
    <section class="pawmark-widget__cautions" aria-label="Evidence cautions">
      <div class="pawmark-widget__caution-primary">
        <span class="pawmark-widget__caution-icon" role="img" aria-label="Caution">${renderConceptIcon("caution")}</span>
        ${renderCautionContent(cautions[0])}
      </div>
      ${
        remaining.length > 0
          ? `
            <button
              class="pawmark-widget__caution-toggle"
              type="button"
              data-pawmark-cautions-toggle
              data-caution-count="${remaining.length}"
              aria-controls="pawmark-additional-cautions"
              aria-expanded="false"
            >+${remaining.length} more caution${remaining.length === 1 ? "" : "s"}</button>
            <div class="pawmark-widget__caution-more" id="pawmark-additional-cautions" data-pawmark-cautions-panel hidden>
              ${remaining.map((caution) => renderCautionContent(caution, true)).join("")}
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderCompactCaution(match) {
  const caution = getDisplayCautions(match)[0];
  if (!caution) return "";

  return `
    <div class="pawmark-widget__bundle-caution">
      <span class="pawmark-widget__bundle-caution-icon" aria-hidden="true">${renderConceptIcon("caution")}</span>
      ${renderCautionContent(caution, true)}
    </div>
  `;
}

function renderBrandContext(match) {
  const crueltyFree = getCrueltyFreeIndicator(
    match.crueltyFreeStatus,
    match.crueltyFreeStatusLabel,
  );
  const vegan = getVeganIndicator(match.veganStatus, match.veganStatusLabel);
  const caution = getDisplayCautions(match)[0];

  return `
    <section class="pawmark-widget__brand-context" aria-label="Brand context">
      <p class="pawmark-widget__brand-context-label">Brand context</p>
      <dl class="pawmark-widget__brand-context-list">
        <div data-status-tone="${crueltyFree.tone}">
          <dt>Cruelty-free</dt>
          <dd>${escapeHtml(crueltyFree.label)}</dd>
        </div>
        <div data-status-tone="${vegan.tone}">
          <dt>Vegan brand status</dt>
          <dd>${escapeHtml(vegan.label)}</dd>
        </div>
      </dl>
      <p class="pawmark-widget__brand-context-note">Brand-level information is shown for context only.</p>
      ${
        caution
          ? `<div class="pawmark-widget__brand-caution">
              <span class="pawmark-widget__brand-caution-icon" aria-hidden="true">${renderConceptIcon("caution")}</span>
              <div>
                <strong>Brand evidence &middot; ${escapeHtml(caution.title)}</strong>
                <p>${escapeHtml(caution.summary)}</p>
                ${renderCautionSource(caution)}
              </div>
            </div>`
          : ""
      }
    </section>
  `;
}

function renderBrandRecognition(match, context) {
  const widget = createWidgetShell();
  widget.classList.add("pawmark-widget--quiet");
  widget.innerHTML = `
    ${renderLauncher()}
    <div class="pawmark-widget__header">
      ${renderBrandLockup()}
      <div class="pawmark-widget__actions">
        <button type="button" data-pawmark-minimize aria-label="Minimize Kindvue">&#215;</button>
      </div>
    </div>
    <div class="pawmark-widget__quiet-body">
      <p class="pawmark-widget__eyebrow">Exact product not found</p>
      <p class="pawmark-widget__brand-recognized-label">We recognize the brand</p>
      <p class="pawmark-widget__brand-recognized-name">${escapeHtml(match.name)}</p>
      <p class="pawmark-widget__quiet-text">We recognize ${escapeHtml(match.name)}, but this exact product is not yet in Kindvue&rsquo;s catalogue, so it does not have a product-level Kindness Meter score.</p>
      ${renderBrandContext(match)}
      <p class="pawmark-widget__brand-submit-copy">Help us add this exact product.</p>
      <button class="pawmark-widget__submit" type="button" data-pawmark-submit>Submit this product for review</button>
      <div class="pawmark-widget__brand-recognition-actions">
        <a class="pawmark-widget__link" href="${escapeHtml(getPawmarkWebUrl(match.url))}" target="_blank" rel="noopener noreferrer">
          View ${escapeHtml(match.name)} on Kindvue
        </a>
      </div>
      <p class="pawmark-widget__submission-note">Submission helps Kindvue identify products to review. It does not guarantee inclusion or a particular rating.</p>
      <p class="pawmark-widget__submit-status" data-pawmark-submit-status></p>
    </div>
  `;
  document.body.appendChild(widget);
  wireWidgetControls(widget);
  widget.querySelector("[data-pawmark-submit]")?.addEventListener("click", () => {
    submitMissingProduct(
      {
        ...context,
        detectedBrand: context.detectedBrand || match.name,
      },
      widget,
    );
  });
}

function renderBundleComponent(component, index) {
  const match = component.match;
  const componentNumber = index + 1;

  if (match.kind === "product") {
    const tone = getScoreTone(match.score);
    return `
      <article class="pawmark-widget__bundle-component" data-pawmark-report-scope>
        <p class="pawmark-widget__bundle-index">Component ${componentNumber} &middot; Matched</p>
        <h3>${escapeHtml(match.name)}</h3>
        <p class="pawmark-widget__bundle-meta">${escapeHtml(match.brandName || component.rawLabel)}</p>
        <div class="pawmark-widget__bundle-score" data-score-tone="${tone.key}" aria-label="Kindness Meter score ${match.score} out of 100, ${globalThis.PawmarkUI.getScoreLabel(tone.status)}">
          <strong>${match.score} <small>/ 100</small></strong>
          <span>${escapeHtml(globalThis.PawmarkUI.getScoreLabel(tone.status))}</span>
        </div>
        ${renderStatusIndicators(match)}
        ${renderCompactCaution(match)}
        ${globalThis.PawmarkSaveActions.render(match, escapeHtml)}
        <div class="pawmark-widget__bundle-actions">
          <a href="${escapeHtml(getPawmarkWebUrl(match.url))}" target="_blank" rel="noopener noreferrer">More details</a>
          <button type="button" data-pawmark-component-report="${index}">Report</button>
        </div>
        <p class="pawmark-widget__report-status" data-pawmark-report-status></p>
      </article>
    `;
  }

  if (match.kind === "unresolved") {
    return `
      <article class="pawmark-widget__bundle-component pawmark-widget__bundle-component--unresolved" data-pawmark-submission-scope>
        <p class="pawmark-widget__bundle-index">Component ${componentNumber} &middot; Unresolved</p>
        <h3>${escapeHtml(match.label || component.label || component.rawLabel)}</h3>
        ${match.brandName ? `<p class="pawmark-widget__bundle-recognition">Brand recognized: <strong>${escapeHtml(match.brandName)}</strong></p>` : ""}
        <p class="pawmark-widget__bundle-unmatched">${escapeHtml(match.reason)}</p>
        <div class="pawmark-widget__bundle-actions">
          <button type="button" data-pawmark-submit data-pawmark-submit-component="${index}">Submit this component for review</button>
        </div>
        <p class="pawmark-widget__submit-status" data-pawmark-submit-status></p>
      </article>
    `;
  }

  if (match.kind === "brand") {
    return `
      <article class="pawmark-widget__bundle-component" data-pawmark-submission-scope>
        <p class="pawmark-widget__bundle-index">Component ${componentNumber}</p>
        <h3>${escapeHtml(component.rawLabel)}</h3>
        <p class="pawmark-widget__bundle-recognition">Brand recognized: <strong>${escapeHtml(match.name)}</strong></p>
        <p class="pawmark-widget__bundle-unmatched">${escapeHtml(component.reason || match.reason || fallbackBundleReason("NO_CATALOGUE_MATCH", component.label || component.rawLabel, match.name))}</p>
        <div class="pawmark-widget__bundle-actions">
          <button type="button" data-pawmark-submit data-pawmark-submit-component="${index}">Submit this component</button>
          <a href="${escapeHtml(getPawmarkWebUrl(match.url))}" target="_blank" rel="noopener noreferrer">View brand</a>
        </div>
        <p class="pawmark-widget__submit-status" data-pawmark-submit-status></p>
      </article>
    `;
  }

  return `
    <article class="pawmark-widget__bundle-component" data-pawmark-submission-scope>
      <p class="pawmark-widget__bundle-index">Component ${componentNumber}</p>
      <h3>${escapeHtml(component.rawLabel)}</h3>
      <p class="pawmark-widget__bundle-unmatched">${escapeHtml(component.reason || match.reason || fallbackBundleReason("NO_CATALOGUE_MATCH", component.label || component.rawLabel))}</p>
      <div class="pawmark-widget__bundle-actions">
        <button type="button" data-pawmark-submit data-pawmark-submit-component="${index}">Submit this component</button>
      </div>
      <p class="pawmark-widget__submit-status" data-pawmark-submit-status></p>
    </article>
  `;
}

function renderBundleMatch(match, context) {
  const widget = createWidgetShell();
  const exactMatches = match.components.filter((component) => component.match.kind === "product").length;
  const unresolvedMatches = match.components.filter((component) => component.match.kind === "unresolved").length;
  widget.innerHTML = `
    ${renderLauncher()}
    <div class="pawmark-widget__header">
      ${renderBrandLockup()}
      <div class="pawmark-widget__actions">
        <button type="button" data-pawmark-minimize aria-label="Minimize Kindvue">&#215;</button>
      </div>
    </div>
    <div class="pawmark-widget__body pawmark-widget__body--bundle">
      <p class="pawmark-widget__eyebrow">Bundle detected${context.platformName ? ` on ${escapeHtml(context.platformName)}` : ""}</p>
      <h2>${match.contentsComplete === false ? "Multiple products in this listing" : `${match.components.length} products in this listing`}</h2>
      <p class="pawmark-widget__bundle-summary">${match.contentsComplete === false ? `${exactMatches} exact products matched. The listing does not identify the complete contents, so the total product count is unknown.` : `${exactMatches} of ${match.components.length} exact products matched.`}${unresolvedMatches > 0 ? " Some bundle listings name only the product types, so Kindvue may not be able to identify each exact formulation." : exactMatches > 0 ? " Each matched formulation is rated separately." : ""}</p>
      <div class="pawmark-widget__bundle-list">
        ${match.components.map(renderBundleComponent).join("")}
      </div>
      <p class="pawmark-widget__bundle-note">Scores and detail links apply to each matched component, not to the retailer bundle as a whole.</p>
    </div>
  `;
  document.body.appendChild(widget);
  wireWidgetControls(widget);
  globalThis.PawmarkSaveActions.wire(widget, match, sendPawmarkMessage);

  widget.querySelectorAll("[data-pawmark-submit-component]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.pawmarkSubmitComponent);
      const component = match.components[index];
      if (!component) return;
      submitMissingProduct(
        {
          ...context,
          productTitle: component.match.kind === "unresolved"
            ? component.match.label
            : component.rawLabel,
          detectedBrand: component.match.brandName
            || (component.match.kind === "brand" ? component.match.name : undefined)
            || match.brandName
            || context.detectedBrand,
          submissionNotes: [
            `Bundle listing title: ${context.productTitle}`,
            `Component type: ${component.match.productForm || component.productForm || component.rawLabel}`,
            component.match.kind === "unresolved" && component.match.evidence?.length
              ? `Extracted component evidence: ${component.match.evidence.join(" | ")}`
              : undefined,
          ].filter(Boolean).join("\n"),
        },
        widget,
        button,
      );
    });
  });

  widget.querySelectorAll("[data-pawmark-component-report]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.pawmarkComponentReport);
      const component = match.components[index];
      if (!component || component.match.kind !== "product") return;
      submitUserReport(
        component.match,
        {
          ...context,
          productTitle: component.rawLabel,
        },
        widget,
        button,
      );
    });
  });
}

function renderProductMatch(match, context) {
  const widget = createWidgetShell();
  const tone = getScoreTone(match.score);
  widget.innerHTML = `
    ${renderLauncher()}
    <div class="pawmark-widget__header">
      ${renderBrandLockup()}
      <div class="pawmark-widget__actions">
        <button type="button" data-pawmark-minimize aria-label="Minimize Kindvue">&#215;</button>
      </div>
    </div>
    <div class="pawmark-widget__body">
      <p class="pawmark-widget__eyebrow">Matched on ${escapeHtml(context.platformName)}</p>
      <h2>${escapeHtml(match.name)}</h2>
      <p class="pawmark-widget__match-meta">
        ${match.brandName ? escapeHtml(match.brandName) : escapeHtml(match.typeLabel)}${match.matchedVariant?.label ? ` &middot; ${escapeHtml(match.matchedVariant.label)}` : ""}
      </p>
      <div class="pawmark-widget__rating" data-score-tone="${tone.key}" aria-label="Kindness Meter score ${match.score} out of 100, ${globalThis.PawmarkUI.getScoreLabel(tone.status)}">
        <div class="pawmark-widget__score">
          <span>${match.score} <small>/ 100</small></span>
          <strong>${globalThis.PawmarkUI.getScoreLabel(tone.status)}</strong>
        </div>
        <div class="pawmark-widget__meter" aria-hidden="true">
          <span style="width: ${Math.max(0, Math.min(100, match.score))}%"></span>
        </div>
      </div>
      ${renderStatusIndicators(match)}
      ${renderCautions(match)}
      ${match.reason ? `<p class="pawmark-widget__reason">${escapeHtml(match.reason)}</p>` : ""}
      ${globalThis.PawmarkSaveActions.render(match, escapeHtml)}
      <button class="pawmark-widget__about" type="button" data-pawmark-about aria-controls="pawmark-rating-note" aria-expanded="false">
        <span aria-hidden="true">i</span> About this rating
      </button>
      <p class="pawmark-widget__assessment-note" id="pawmark-rating-note" data-pawmark-about-panel hidden>
        Kindvue ratings are informational assessments based on available evidence and are not certifications.
      </p>
      ${renderCurrentProductPurchaseState(match)}
      ${renderAlternatives(match.betterAlternatives, match.url)}
      <div class="pawmark-widget__footer-actions">
        <a class="pawmark-widget__link" href="${escapeHtml(getPawmarkWebUrl(match.url))}" target="_blank" rel="noopener noreferrer">
          More details
        </a>
        <button class="pawmark-widget__report" type="button" data-pawmark-report>Report</button>
      </div>
      <p class="pawmark-widget__report-status" data-pawmark-report-status></p>
      <p class="pawmark-widget__review-note">Reports are reviewed before Kindvue data is changed.</p>
    </div>
  `;
  document.body.appendChild(widget);
  wireWidgetControls(widget);
  wireImageFallbacks(widget);
  globalThis.PawmarkSaveActions.wire(widget, match, sendPawmarkMessage);
  widget.querySelector("[data-pawmark-report]")?.addEventListener("click", () => {
    submitUserReport(match, context, widget);
  });
}

async function fetchPawmarkMatch(context) {
  return sendPawmarkMessage({
    type: "PAWMARK_MATCH_PRODUCT",
    request: {
      platform: context.platform,
      page: {
        title: context.productTitle,
        url: context.pageUrl,
        imageUrl: context.productImageUrl || undefined,
        evidence: Array.isArray(context.pageEvidence) && context.pageEvidence.length > 0
          ? context.pageEvidence
          : undefined,
      },
      retailerIdentity: context.retailerProductId
        ? { productId: context.retailerProductId }
        : undefined,
      detectedBrand: context.detectedBrand || undefined,
    },
  });
}

function getNykaaIdentitySnapshot(context) {
  return {
    productId: context.retailerProductId,
    title: context.productTitle,
    brand: context.detectedBrand,
    sources: context.identitySources,
  };
}

function isSameText(left, right) {
  return optionalString(left)?.toLowerCase() === optionalString(right)?.toLowerCase();
}

function assessNykaaContext(adapter, context, reason) {
  const now = Date.now();
  const routeKey = getNykaaRouteKey(context.pageUrl);

  if (nykaaIdentityState.routeKey !== routeKey) {
    resetNykaaIdentityState(routeKey);
  }

  nykaaIdentityState.attempts += 1;
  const elapsedMs = now - nykaaIdentityState.startedAt;
  const mayUseFallbackIdentity = elapsedMs >= NYKAA_FALLBACK_WAIT_MS;
  const identity = getNykaaIdentitySnapshot(context);
  const readiness = adapter.getIdentityReadiness(identity, {
    allowMissingBrand: mayUseFallbackIdentity,
    allowPathProductId: mayUseFallbackIdentity,
  });
  const reasons = [...readiness.reasons];
  const previous = nykaaIdentityState.previousIdentity;
  const routeIdentityChanged = previous && (
    previous.productId !== identity.productId || previous.url !== context.pageUrl
  );

  if (
    routeIdentityChanged &&
    isSameText(previous.title, identity.title) &&
    elapsedMs < NYKAA_FALLBACK_WAIT_MS
  ) {
    reasons.push("title still matches the previous Nykaa product");
  }

  const candidateKey = adapter.getIdentityStabilityKey(identity);
  if (candidateKey !== nykaaIdentityState.candidateKey) {
    nykaaIdentityState.candidateKey = candidateKey;
    nykaaIdentityState.candidateObservedAt = now;
    nykaaIdentityState.stableObservations = 1;

    if (lastIdentityFingerprint && context.fingerprint !== lastIdentityFingerprint) {
      activeRequestId += 1;
      lastIdentityFingerprint = "";
    }
  } else if (now - nykaaIdentityState.candidateObservedAt >= NYKAA_STABILITY_DELAY_MS) {
    nykaaIdentityState.candidateObservedAt = now;
    nykaaIdentityState.stableObservations += 1;
  }

  if (elapsedMs < NYKAA_MIN_SETTLE_MS) {
    reasons.push("waiting for Nykaa hydration settle window");
  }
  if (nykaaIdentityState.stableObservations < 2) {
    reasons.push("waiting for a second stable identity observation");
  }

  const ready = readiness.ready && reasons.length === 0;
  debugLog("[Kindvue NYKAA IDENTITY]", {
    phase: ready ? "stable" : "stabilizing",
    reason,
    timestamp: new Date(now).toISOString(),
    currentUrl: window.location.href,
    productId: identity.productId || null,
    rawTitle: context.rawProductTitle || null,
    title: identity.title || null,
    brand: identity.brand || null,
    sources: identity.sources,
    fingerprint: context.fingerprint || null,
    matchRequestSent: false,
    ready,
    waitingFor: reasons,
    attempt: nykaaIdentityState.attempts,
    elapsedMs,
  });

  if (ready) {
    clearNykaaRetry();
    return true;
  }

  ensureNykaaLoading(context);
  if (
    nykaaIdentityState.attempts < NYKAA_MAX_RETRY_ATTEMPTS &&
    elapsedMs < NYKAA_MAX_WAIT_MS
  ) {
    scheduleNykaaIdentityRetry(reasons[0] || "identity stabilization");
  } else {
    debugLog("[Kindvue NYKAA IDENTITY]", {
      phase: "bounded wait complete",
      timestamp: new Date().toISOString(),
      currentUrl: window.location.href,
      matchRequestSent: false,
      waitingFor: reasons,
    });
  }

  return false;
}

async function refreshPawmark(reason = "page load") {
  if (!assistanceActive()) return;
  const platforms = globalThis.PawmarkPlatforms;
  const adapter = platforms?.getAdapter(window.location.href);
  const isPotentialNykaaProduct = adapter?.id === "nykaa" && adapter.isPotentialProductPage?.();

  if (!adapter || (!adapter.isProductPage() && !isPotentialNykaaProduct)) {
    activeRequestId += 1;
    lastIdentityFingerprint = "";
    lastRetailerIdentity = undefined;
    resetNykaaIdentityState();
    removeExistingWidget();
    return;
  }

  const context = platforms.extractContext(adapter);

  if (adapter.id === "nykaa" && !assessNykaaContext(adapter, context, reason)) {
    return;
  }

  if (!context.productTitle) {
    return;
  }

  const fingerprint = context.fingerprint;

  if (!fingerprint || fingerprint === lastIdentityFingerprint) {
    return;
  }

  const nextIdentity = {
    platform: context.platform,
    url: context.pageUrl,
    productId: context.retailerProductId,
    title: context.productTitle,
    brand: context.detectedBrand || undefined,
    fingerprint,
    sources: context.identitySources,
  };

  if (lastRetailerIdentity) {
    debugLog("[Kindvue RETAILER CHANGE]", {
      old: lastRetailerIdentity,
      new: nextIdentity,
      reason,
    });
  }

  lastIdentityFingerprint = fingerprint;
  lastRetailerIdentity = nextIdentity;
  const requestId = ++activeRequestId;
  debugLog("[Kindvue RETAILER IDENTITY]", nextIdentity);
  if (adapter.id === "nykaa") {
    debugLog("[Kindvue NYKAA MATCH REQUEST]", {
      timestamp: new Date().toISOString(),
      currentUrl: window.location.href,
      productId: context.retailerProductId || null,
      rawTitle: context.rawProductTitle || null,
      title: context.productTitle,
      brand: context.detectedBrand || null,
      sources: context.identitySources,
      fingerprint,
      matchRequestSent: true,
    });
  }
  renderLoading(context);

  let result;

  try {
    result = await fetchPawmarkMatch(context);

    if (!shouldAcceptMatchResponse(requestId, fingerprint)) {
      discardStaleResponse(requestId, fingerprint);
      return;
    }
  } catch (error) {
    if (!shouldAcceptMatchResponse(requestId, fingerprint)) {
      discardStaleResponse(requestId, fingerprint);
      return;
    }

    debugWarn("[Kindvue content] Match request failed", {
      code: error?.code || "REQUEST_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
    renderError(error?.code);
    return;
  }

  try {
    debugLog("[Kindvue content] Match response", result);
    const match = getMatchPayload(result);
    if (adapter.id === "nykaa") {
      debugLog("[Kindvue NYKAA MATCH RESPONSE]", {
        timestamp: new Date().toISOString(),
        currentUrl: window.location.href,
        fingerprint,
        responseType: optionalString(result?.type) || "none",
        confidence: safeNumber(result?.match?.confidence),
      });
    }

    if (!match || match.kind === "none" || match.confidence < MIN_CONFIDENCE_TO_SHOW_DETAILS) {
      renderNoMatch(context);
      return;
    }

    if (match.kind === "bundle") {
      renderBundleMatch(match, context);
      return;
    }

    if (match.kind === "brand") {
      renderBrandRecognition(match, context);
      return;
    }

    renderProductMatch(match, context);
  } catch (error) {
    debugWarn("[Kindvue content] Render/data-shape error", {
      code: "RENDER_DATA_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    renderError("RENDER_DATA_ERROR");
  }
}

function schedulePawmarkRefresh(reason, delay = DETECTION_DEBOUNCE_MS) {
  if (!assistanceActive()) return;
  pendingDetectionReason = reason;
  if (detectionTimer) return;

  detectionTimer = window.setTimeout(() => {
    detectionTimer = undefined;
    refreshPawmark(pendingDetectionReason);
  }, delay);
}

function installNavigationDetection() {
  let urlTimer, observing=false;
  const observer = new MutationObserver(mutations => {
    if(mutations.every(mutation=>{
      const target=mutation.target.nodeType===1?mutation.target:mutation.target.parentElement;
      return target?.closest('#'+WIDGET_ID)||mutation.type==='childList'&&[...mutation.addedNodes,...mutation.removedNodes].length&&[...mutation.addedNodes,...mutation.removedNodes].every(node=>node.nodeType===1&&node.id===WIDGET_ID);
    }))return;
    schedulePawmarkRefresh('page update');
  });
  function syncObserver(){
    if (!assistanceActive()) return;
    const adapter=globalThis.PawmarkPlatforms?.getAdapter(location.href);
    const product=adapter&&globalThis.PawmarkRetailerIdentity.isLikelyProductUrl(adapter.id,location.href);
    if(product&&!observing){observer.observe(document.documentElement,{attributeFilter:['aria-checked','class','data-asin','href','value'],attributes:true,characterData:true,childList:true,subtree:true});observing=true;}
    else if(!product&&observing){observer.disconnect();observing=false;}
  }
  const handleLocationChange = () => {
    if (!assistanceActive()) return;
    if(location.href===lastObservedUrl)return;
    globalThis.PawmarkShoppingMode?.refreshRoute();
    syncObserver();
    const adapter = globalThis.PawmarkPlatforms?.getAdapter(window.location.href);
    const nextNykaaRouteKey = adapter?.id === "nykaa" ? getNykaaRouteKey() : "";

    if (adapter?.id === "nykaa" && nextNykaaRouteKey !== nykaaIdentityState.routeKey) {
      activeRequestId += 1;
      lastIdentityFingerprint = "";
      resetNykaaIdentityState(nextNykaaRouteKey);
      if (adapter.isPotentialProductPage?.()) ensureNykaaLoading({ platformName: "Nykaa" });
    }

    lastObservedUrl = window.location.href;
    schedulePawmarkRefresh("navigation", 180);
  };
  window.addEventListener("popstate", handleLocationChange);
  window.addEventListener("pawmark:locationchange", handleLocationChange);
  
  window.navigation?.addEventListener('navigatesuccess',handleLocationChange);
  function stop(){
    observer.disconnect(); observing=false;
    clearInterval(urlTimer); urlTimer=undefined;
    clearTimeout(detectionTimer); detectionTimer=undefined;
    resetNykaaIdentityState(); activeRequestId++;
    lastIdentityFingerprint=''; lastRetailerIdentity=undefined;
    removeExistingWidget();
  }
  function resume(){
    if (!assistanceActive()) return;
    syncObserver();
    if(!urlTimer)urlTimer=window.setInterval(handleLocationChange,1000);
    lastObservedUrl=location.href;
    refreshPawmark('assistance enabled');
  }
  window.addEventListener('pagehide',()=>{pageSuspended=true;stop();});
  window.addEventListener('pageshow',()=>{pageSuspended=false;resume();});
  assistance.subscribe(()=>{if(assistanceActive())resume();else stop();});
}

function startPawmark() {
  installNavigationDetection();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startPawmark, { once: true });
} else {
  startPawmark();
}
