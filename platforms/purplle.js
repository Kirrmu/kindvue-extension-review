(function registerPurplleAdapter(platforms) {
  "use strict";

  const { utils } = platforms;
  const titleSelectors = [
    "[data-testid='product-title']",
    "[class*='product-title']",
    ".pdp__product-name",
    ".product-name",
  ];

  platforms.registerAdapter({
    id: "purplle",
    bundleEvidenceSelectors: {
      about_item: ["[class*='highlight'] li", "[class*='benefit'] li"],
      feature_bullets: ["[class*='feature'] li"],
      product_description: ["[class*='product-description']", ".pdp__description"],
      product_detail: ["[class*='product-detail']", ".pdp__details"],
    },
    matchesLocation: (value) => utils.matchesHostname(value, "purplle.com"),
    isProductPage: () =>
      /\/product\//i.test(window.location.pathname) ||
      Boolean(utils.query("[data-testid='product-title'], .pdp__product-name")),
    getProductTitle: () => utils.resolveTitle(titleSelectors, "Purplle"),
    getBrandName: (title) =>
      utils.resolveBrand(
        ["[data-testid='product-brand']", "[class*='brand-name']", ".pdp__brand-name", "a[href*='/brand/']"],
        title,
      ),
    getProductUrl: utils.canonicalProductUrl,
    getProductImage: () =>
      utils.resolveImage([
        "[data-testid='product-image'] img",
        ".pdp__image img",
        "[class*='product-image'] img",
        "[class*='image-gallery'] img",
      ]),
    getPlatformName: () => "Purplle",
  });
})(globalThis.PawmarkPlatforms);
