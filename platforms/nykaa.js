(function registerNykaaAdapter(platforms, identityCore, lifecycle) {
  "use strict";

  const { utils } = platforms;
  const titleSelectors = [
    "[data-testid='product-name']",
    "[data-test='product-title']",
    "[class*='product-title'] h1",
    "h1",
  ];
  const brandSelectors = [
    "[data-testid='product-brand']",
    "[data-test='product-brand']",
    "[class*='product-brand']",
  ];

  function resolveProductIdentity() {
    const urlIdentity = identityCore.productIdFromUrl("nykaa", window.location.href);
    if (urlIdentity?.source === "URL skuId") return urlIdentity;

    const structured = utils.structuredSkuResult();
    const productId = identityCore.normalizeProductId("nykaa", structured.value);
    if (productId) return { productId, source: structured.source };

    return urlIdentity;
  }

  function getIdentity() {
    const productIdentity = resolveProductIdentity();
    const title = utils.resolveTitleResult(titleSelectors, "Nykaa");
    const brand = utils.resolveBrandResult(brandSelectors, title.value, {
      allowTitleInference: false,
      structuredFirst: true,
    });

    return {
      platform: "nykaa",
      productId: productIdentity?.productId,
      title: title.value,
      rawTitle: title.rawValue || title.value,
      brand: brand.value || undefined,
      url: identityCore.cleanProductUrl("nykaa", window.location.href, productIdentity?.productId),
      imageUrl: utils.resolveImage([
        "[data-testid='product-image'] img",
        "[class*='product-image'] img",
        "[class*='image-container'] img",
        "img[alt^='product']",
      ]),
      sources: {
        productIdFrom: productIdentity?.source,
        titleFrom: title.source,
        brandFrom: brand.source || undefined,
      },
    };
  }

  platforms.registerAdapter({
    id: "nykaa",
    bundleEvidenceSelectors: {
      about_item: ["[data-testid='product-highlights'] li", "[class*='product-highlight'] li"],
      feature_bullets: ["[class*='product-feature'] li", "[class*='benefit'] li"],
      product_description: ["[data-testid='product-description']", "[class*='product-description']"],
      product_detail: ["[class*='product-detail'] [class*='content']", "[class*='product-info'] li"],
    },
    matchesLocation: (value) => utils.matchesHostname(value, "nykaa.com"),
    isPotentialProductPage: () => Boolean(
      identityCore.productIdFromUrl("nykaa", window.location.href)?.productId &&
      /\/p\/[A-Z0-9_-]+(?:[/?]|$)/i.test(window.location.pathname)
    ),
    isProductPage: () => Boolean(
      resolveProductIdentity()?.productId &&
      /\/p\/[A-Z0-9_-]+(?:[/?]|$)/i.test(window.location.pathname) &&
      (utils.firstText(titleSelectors) || utils.getStructuredProduct()),
    ),
    getIdentity,
    getIdentityReadiness: (identity, options) => lifecycle.assessIdentity(identity, options),
    getIdentityStabilityKey: (identity) => lifecycle.createStabilityKey(identity),
    getPlatformName: () => "Nykaa",
  });
})(
  globalThis.PawmarkPlatforms,
  globalThis.PawmarkRetailerIdentity,
  globalThis.PawmarkNykaaLifecycle,
);
