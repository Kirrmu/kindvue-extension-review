(function registerMyntraAdapter(platforms, identityCore) {
  "use strict";

  const { utils } = platforms;
  const productNameSelectors = ["h1.pdp-name", ".pdp-name", "[class*='pdp-name']"];
  const brandSelectors = ["h1.pdp-title", ".pdp-title", "[class*='pdp-title']"];

  function productCodeFromDom() {
    for (const element of utils.queryAll("body *")) {
      const text = utils.normalizeText(element.textContent);
      if (!/^Product Code\s*:\s*\d{5,}$/i.test(text)) continue;

      const productId = identityCore.normalizeProductId("myntra", text.match(/(\d{5,})/)?.[1]);
      if (productId) return { productId, source: "DOM Product Code" };
    }

    return undefined;
  }

  function resolveProductIdentity() {
    return (
      identityCore.productIdFromUrl("myntra", window.location.href) ||
      productCodeFromDom() ||
      (() => {
        const structured = utils.structuredSkuResult();
        const productId = identityCore.normalizeProductId("myntra", structured.value);
        return productId ? { productId, source: structured.source } : undefined;
      })()
    );
  }

  function resolveTitleAndBrand() {
    const name = utils.resolveTitleResult(productNameSelectors, "Myntra");
    const brand = utils.resolveBrandResult(brandSelectors, name.value, { allowTitleInference: false });
    const title = brand.value && name.value && !name.value.toLowerCase().startsWith(brand.value.toLowerCase())
      ? `${brand.value} ${name.value}`
      : name.value;

    return {
      title: { value: title, source: name.source },
      brand,
    };
  }

  function getIdentity() {
    const productIdentity = resolveProductIdentity();
    const { title, brand } = resolveTitleAndBrand();

    return {
      platform: "myntra",
      productId: productIdentity?.productId,
      title: title.value,
      brand: brand.value || undefined,
      url: identityCore.cleanProductUrl("myntra", window.location.href, productIdentity?.productId),
      imageUrl: utils.resolveImage([
        ".image-grid-image",
        ".image-grid-container img",
        "[class*='image-grid'] img",
        "[class*='pdp-image'] img",
      ]),
      sources: {
        productIdFrom: productIdentity?.source,
        titleFrom: title.source,
        brandFrom: brand.source || undefined,
      },
    };
  }

  platforms.registerAdapter({
    id: "myntra",
    bundleEvidenceSelectors: {
      about_item: [".pdp-productDescriptors li", "[class*='productDescriptors'] li"],
      feature_bullets: [".index-tableContainer li", "[class*='productFeature'] li"],
      product_description: [".pdp-product-description-content", "[class*='product-description']"],
      product_detail: [".pdp-sizeFitDescContent", "[class*='productDetails']"],
    },
    matchesLocation: (value) => utils.matchesHostname(value, "myntra.com"),
    isProductPage: () => Boolean(
      resolveProductIdentity()?.productId &&
      (utils.firstText(productNameSelectors) || utils.getStructuredProduct()),
    ),
    getIdentity,
    getPlatformName: () => "Myntra",
  });
})(globalThis.PawmarkPlatforms, globalThis.PawmarkRetailerIdentity);
