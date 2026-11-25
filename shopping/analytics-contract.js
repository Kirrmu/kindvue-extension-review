(function install(scope) {
  'use strict';
  const EVENTS = Object.freeze(['shopping_mode_loaded', 'shopping_mode_badge_impression', 'shopping_mode_badge_clicked', 'shopping_mode_filter_changed', 'shopping_mode_filter_reset', 'shopping_mode_mode_changed', 'shopping_mode_better_choice_shown', 'shopping_mode_better_choice_clicked', 'shopping_mode_request_shown', 'shopping_mode_request_submitted', 'shopping_mode_request_existing', 'shopping_mode_product_clicked']);
  function cleanEvent(event) {
    if (!event || !EVENTS.includes(event.eventType) || Object.keys(event).some(key => !['eventType','eventId','productId','alternativeProductId','context'].includes(key))) return null;
    if (typeof event.eventId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(event.eventId)) return null;
    for (const field of ['productId','alternativeProductId']) if (event[field] !== undefined && (typeof event[field] !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(event[field]))) return null;
    const value = event.context;
    if (!value || Object.keys(value).some(key => !['pageType','mode','activeFilterCount','filter','enabled','checkedCount','filteredCount','matchState','identityHash','passedFilters','hasBetterChoice'].includes(key))) return null;
    if (!['search','category','brand_listing','best_sellers','deals','other_supported_listing'].includes(value.pageType) || !['dim','hide'].includes(value.mode)) return null;
    for (const [key,max] of [['activeFilterCount',3],['checkedCount',512],['filteredCount',512]]) if ((key === 'activeFilterCount' || value[key] !== undefined) && (!Number.isInteger(value[key]) || value[key] < 0 || value[key] > max)) return null;
    if (value.filter !== undefined && !['score70','pawmarked','vegan','crueltyFree','filtering'].includes(value.filter)) return null;
    for (const key of ['enabled','passedFilters','hasBetterChoice']) if (value[key] !== undefined && typeof value[key] !== 'boolean') return null;
    if (value.matchState !== undefined && !['product','brand','none','bundle'].includes(value.matchState)) return null;
    if (value.identityHash !== undefined && (typeof value.identityHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.identityHash))) return null;
    const choice = event.eventType.includes('better_choice');
    if (choice !== Boolean(event.alternativeProductId) || choice && !event.productId) return null;
    if (['shopping_mode_badge_clicked','shopping_mode_product_clicked'].includes(event.eventType) && !event.productId) return null;
    return { ...event, context: { ...value } };
  }
  const api = Object.freeze({ EVENTS, cleanEvent });
  scope.PawmarkShoppingAnalyticsContract = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
