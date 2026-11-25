(function install(scope) {
  'use strict';
  
  
  const noop = () => {};
  function createController() {
    return Object.freeze({
      sync: noop, remove: noop, track: noop, productEvent: noop, stop: noop, start: noop,
      stats: () => ({ observed: 0, pending: 0, deduped: 0, inFlight: false }),
    });
  }
  scope.PawmarkShoppingAnalytics = Object.freeze({ createController });
})(globalThis);
