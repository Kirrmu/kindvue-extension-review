(function install(scope) {
  'use strict';
  function retryAfter(value, now=Date.now()) {
    if(!value)return 0;
    const seconds=Number(value), delay=Number.isFinite(seconds)?seconds*1000:Date.parse(value)-now;
    return Number.isFinite(delay)?Math.max(0,Math.min(86400000,delay)):0;
  }
  function createPolicy(now=Date.now) {
    let failures=0,until=0;
    return Object.freeze({
      success:()=>{failures=0;until=0;},
      failure:(error,attempt)=>{
        if(error?.retryable===false)return 0;
        failures++;
        const delay=Math.max(1000*2**Math.min(5,attempt-1),Math.min(86400000,Number(error?.retryAfterMs)||0),failures>=3?30000:0);
        until=Math.max(until,now()+delay);return until;
      },
      wait:()=>Math.max(0,until-now()),
      clear:()=>{failures=0;until=0;},
      stats:()=>({consecutiveFailures:failures,pausedUntil:until}),
    });
  }
  function deadline(send, request, setTimer=setTimeout, clearTimer=clearTimeout, milliseconds=10000) {
    return new Promise((resolve,reject)=>{
      const timer=setTimer(()=>reject(Object.assign(new Error('REQUEST_TIMEOUT'),{retryable:true})),milliseconds);
      try { Promise.resolve(send(request)).then(resolve,reject).finally(()=>clearTimer(timer)); }
      catch(error) { clearTimer(timer);reject(error); }
    });
  }
  const api=Object.freeze({retryAfter,createPolicy,deadline});scope.PawmarkShoppingNetwork=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
