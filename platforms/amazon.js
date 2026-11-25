(function registerAmazonAdapter(platforms, identityCore) {
  "use strict";

  const { utils } = platforms;
  const titleSelectors = ["#productTitle", "h1#title", "#title_feature_div h1"];

  function matchesLocation(value) {
    return utils.matchesHostname(value, "amazon.in");
  }

  function asinFromElement(element) {
    const holder = element?.matches?.("[data-asin]") ? element : element?.closest?.("[data-asin]");
    return identityCore.normalizeProductId("amazon", holder?.getAttribute("data-asin"));
  }

  function selectedVariationAsin() {
    const selectors = [
      "#twister [data-asin][aria-checked='true']",
      "#twister [data-asin] .a-button-selected",
      "#twister input:checked",
      ".inline-twister-swatch[data-asin] .a-button-selected",
      "[id^='inline-twister-row-'] [data-asin] input[aria-checked='true']",
      "#variation_style_name [data-asin] .a-button-selected",
      "#variation_color_name [data-asin] .a-button-selected",
      "#variation_size_name [data-asin] .a-button-selected",
    ];

    for (const selector of selectors) {
      const productId = asinFromElement(utils.query(selector));
      if (productId) return { productId, source: "DOM selected variation" };
    }

    return undefined;
  }

  function asinFromDom() {
    const inputSelectors = ["input#ASIN", "input[name='ASIN']", "input[name='asin']"];
    for (const selector of inputSelectors) {
      const input = utils.query(selector);
      const productId = identityCore.normalizeProductId("amazon", input?.value || input?.getAttribute("value"));
      if (productId) return { productId, source: `DOM ${selector}` };
    }

    const featureSelectors = [
      ["#title_feature_div", "data-csa-c-asin"],
      ["#averageCustomerReviews", "data-asin"],
      ["#all-offers-display-params", "data-asin"],
    ];
    for (const [selector, attribute] of featureSelectors) {
      const productId = identityCore.normalizeProductId(
        "amazon",
        utils.query(selector)?.getAttribute(attribute),
      );
      if (productId) return { productId, source: `DOM ${selector}[${attribute}]` };
    }

    return undefined;
  }

  function resolveProductIdentity() {
    return (
      selectedVariationAsin() ||
      identityCore.productIdFromUrl("amazon", window.location.href) ||
      asinFromDom() ||
      identityCore.productIdFromUrl(
        "amazon",
        utils.query('link[rel="canonical"]')?.getAttribute("href"),
      ) ||
      (() => {
        const structured = utils.structuredSkuResult();
        const productId = identityCore.normalizeProductId("amazon", structured.value);
        return productId ? { productId, source: structured.source } : undefined;
      })()
    );
  }

  function resolveBrand(title) {
    const byline = utils.firstTextResult(["#bylineInfo"]);
    const bylineBrand = utils.cleanBrand(byline.value);
    if (bylineBrand) return { value: bylineBrand, source: byline.source };

    const detailSelectors = [
      "tr.po-brand",
      "#productOverview_feature_div tr",
      "#productDetails_detailBullets_sections1 tr",
      "#prodDetails tr",
    ];
    for (const selector of detailSelectors) {
      for (const element of utils.queryAll(selector)) {
        const text = utils.normalizeText(element.textContent);
        if (!/\bbrand\b/i.test(text)) continue;

        const brand = utils.cleanBrand(text.replace(/.*\bbrand\b\s*[:\-]?\s*/i, ""));
        if (brand.length > 1 && brand.length < 60) {
          return { value: brand, source: `DOM ${selector}` };
        }
      }
    }

    return utils.resolveBrandResult([], title, { allowTitleInference: false });
  }

  function getIdentity() {
    const productIdentity = resolveProductIdentity();
    const title = utils.resolveTitleResult(titleSelectors, "Amazon");
    const brand = resolveBrand(title.value);

    return {
      platform: "amazon",
      productId: productIdentity?.productId,
      title: title.value,
      brand: brand.value || undefined,
      url: identityCore.cleanProductUrl("amazon", window.location.href, productIdentity?.productId),
      imageUrl: utils.resolveImage(["#landingImage", "#imgBlkFront", "#main-image", "#ebooksImgBlkFront"]),
      sources: {
        productIdFrom: productIdentity?.source,
        titleFrom: title.source,
        brandFrom: brand.source || undefined,
      },
    };
  }

  function isProductPage() {
    const identity = resolveProductIdentity();
    return Boolean(
      identity?.productId &&
      identityCore.isLikelyProductUrl("amazon", window.location.href) &&
      (utils.firstText(titleSelectors) || utils.getStructuredProduct()),
    );
  }

  platforms.registerAdapter({
    id: "amazon",
    bundleEvidenceSelectors: {
      about_item: ["#feature-bullets li .a-list-item", "#feature-bullets li"],
      feature_bullets: ["#productFactsDesktopExpander li", "#productFactsDesktopExpander .a-row"],
      product_description: ["#productDescription p", "#productDescription"],
      product_detail: ["#detailBullets_feature_div li", "#productDetails_techSpec_section_1 tr"],
    },
    getIdentity,
    getPlatformName: () => "Amazon",
    isProductPage,
    matchesLocation,
  });
})(globalThis.PawmarkPlatforms, globalThis.PawmarkRetailerIdentity);
