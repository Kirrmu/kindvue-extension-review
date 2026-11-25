(function registerFlipkartAdapter(platforms, identityCore) {
  "use strict";

  const { utils } = platforms;
  const specificTitleSelectors = ["span.VU-ZEz", "span.B_NuCI", "h1.yhB1nd span"];
  const titleSelectors = [...specificTitleSelectors, "h1"];

  function resolveProductIdentity() {
    const urlIdentity = identityCore.productIdFromUrl("flipkart", window.location.href);
    if (urlIdentity) return urlIdentity;

    const structured = utils.structuredSkuResult();
    const productId = identityCore.normalizeProductId("flipkart", structured.value);
    return productId ? { productId, source: structured.source } : undefined;
  }

  function getIdentity() {
    const productIdentity = resolveProductIdentity();
    const title = utils.resolveTitleResult(titleSelectors, "Flipkart", { structuredFirst: true });
    const brand = utils.resolveBrandResult(
      ["[class*='brand-name']", "a[href*='/brand/']"],
      title.value,
      { allowTitleInference: false },
    );

    return {
      platform: "flipkart",
      productId: productIdentity?.productId,
      title: title.value,
      brand: brand.value || undefined,
      url: identityCore.cleanProductUrl("flipkart", window.location.href, productIdentity?.productId),
      imageUrl: utils.resolveImage([
        "img._396cs4",
        "img.DByuf4",
        "[class*='image-container'] img",
        "[class*='CXW8mj'] img",
      ]),
      sources: {
        productIdFrom: productIdentity?.source,
        titleFrom: title.source,
        brandFrom: brand.source || undefined,
      },
    };
  }

  platforms.registerAdapter({
    id: "flipkart",
    bundleEvidenceSelectors: {
      about_item: ["._2418kt li", "[class*='highlights'] li"],
      feature_bullets: ["[class*='product-features'] li", "[class*='specifications'] li"],
      product_description: ["._1mXcCf", "[class*='description']"],
      product_detail: ["._14cfVK", "[class*='product-detail']"],
    },
    matchesLocation: (value) => utils.matchesHostname(value, "flipkart.com"),
    isProductPage: () => Boolean(
      resolveProductIdentity()?.productId &&
      /\/p\//i.test(window.location.pathname) &&
      (utils.firstText(specificTitleSelectors) || utils.getStructuredProduct()),
    ),
    getIdentity,
    getPlatformName: () => "Flipkart",
  });
})(globalThis.PawmarkPlatforms, globalThis.PawmarkRetailerIdentity);
