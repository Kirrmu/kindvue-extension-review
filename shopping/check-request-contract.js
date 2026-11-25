(function install(scope) {
  'use strict';
  const MAX_BYTES = 4096;
  function cleanRequest(value) {
    if (!value || Object.keys(value).some(key => !['retailer','retailerProductId','productUrl','title','brand'].includes(key)) || value.retailer !== 'amazon_in') return null;
    const batch = scope.PawmarkBatchContract.cleanRequest({retailer:'amazon_in',items:[{clientKey:'request',title:value.title,brand:value.brand,productUrl:value.productUrl,retailerProductId:value.retailerProductId}]});
    const item = batch?.items[0];
    if (!item || item.title.length < 8 || /^(?:shop|browse|discover|sponsored|visit the)\b/i.test(item.title) || /\b(?:bundle|combo|kit|duo)\b/i.test(item.title)) return null;
    return {retailer:'amazon_in',retailerProductId:item.retailerProductId,productUrl:item.productUrl,title:item.title,brand:item.brand};
  }
  const identity = value => value.retailerProductId ? `amazon_in:${value.retailerProductId}` : `amazon_in:${value.productUrl}`;
  function eligible(entry) {
    if (entry?.matchState !== 'resolved' || entry.matchResult?.clientKey !== entry.key || !['none','brand'].includes(entry.matchResult.state)) return null;
    const {retailerProductId,productUrl,title,brand}=entry.identity;
    return cleanRequest({retailer:'amazon_in',retailerProductId,productUrl,title,brand});
  }
  const api = Object.freeze({MAX_BYTES,cleanRequest,identity,eligible});scope.PawmarkCheckRequestContract=api;
  if (typeof module === 'object' && module.exports) module.exports=api;
})(globalThis);
