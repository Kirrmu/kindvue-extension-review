(function install(scope) {
  'use strict';
  const MARKER = 'data-pawmark-check-request';
  const CSS = `
    :host { all:initial!important; display:block!important; max-width:100%!important; margin:0 0 8px!important; contain:layout style;  }
    * { box-sizing:border-box; }
    button { display:block; max-width:100%; min-height:34px; padding:7px 10px; border:1px solid var(--pawmark-border-subtle); border-radius:8px; background:var(--pawmark-surface); color:var(--pawmark-accent); font:600 11px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; letter-spacing:0; text-align:left; overflow-wrap:anywhere; cursor:pointer; transition:transform 120ms ease,opacity 120ms ease; }
    button:hover:not(:disabled) { background:var(--pawmark-secondary); border-color:var(--pawmark-accent); }
    button:active:not(:disabled) { transform:translateY(1px); }
    button:focus-visible { outline:2px solid var(--pawmark-accent); outline-offset:2px; }
    button:disabled { cursor:default; color:var(--pawmark-accent); background:var(--pawmark-secondary); }
    button[aria-busy="true"] { opacity:.65; }
    .success-icon { display:inline-block; width:13px; height:13px; margin-left:5px; vertical-align:middle; animation:confirmed 160ms ease-out; }.success-icon svg { width:13px;height:13px; }
    .message { display:block; max-width:100%; margin-top:6px; padding:4px 6px; border-radius:4px; background:var(--pawmark-surface); color:var(--pawmark-danger); font:400 11px/1.4 system-ui,sans-serif; overflow-wrap:anywhere; letter-spacing:0; }
    .message:empty { display:none; }
    @keyframes confirmed { from { opacity:0;transform:scale(.8); }to { opacity:1;transform:scale(1); } }
    @media(prefers-reduced-motion:reduce) { button { transition:none; }.success-icon { animation:none; }button:active:not(:disabled) { transform:none; } }
    @media(forced-colors:active) { button { border-color:ButtonText; } }
  `;
  function createController({ enabled=false, validate, send, now=Date.now, onOutcome=()=>{} }) {
    const records=new Map(), states=new Map(), owners=new WeakMap();
    let generation=0, inFlight=0;
    const pending=new Set(), MAX_HISTORY=200;
    function stateFor(record){
      const saved=states.get(record.key);
      if(saved&&saved.until<=now())states.delete(record.key);
      return pending.has(record.key)?'sending':states.get(record.key)?.state||record.state||'idle';
    }
    function remember(key,state){
      for(const [id,value] of states)if(value.until<=now())states.delete(id);
      states.delete(key);states.set(key,{state,until:now()+1800000});
      while(states.size>MAX_HISTORY)states.delete(states.keys().next().value);
    }
    const contract=scope.PawmarkCheckRequestContract;
    function remove(card) { const record=records.get(card); records.delete(card); record?.host.remove(); }
    function paint(record) {
      const state=stateFor(record);record.state=state;
      const text={idle:'Request Kindvue check',sending:'Sending request...',created:'Requested',linked_to_existing:'Already requested',already_exists:'Already requested',error:'Retry request'}[state];
      record.button.textContent=text;
      if(['created','linked_to_existing','already_exists'].includes(state)){
        const icon=record.button.ownerDocument.createElement('span');icon.className='success-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=scope.PawmarkSaveIcons.check;record.button.append(icon);
      }
      record.button.disabled=!['idle','error'].includes(state);
      record.button.setAttribute('aria-busy',String(state==='sending'));
      record.message.textContent=state==='error'?"Couldn't send request. Try again.":'';
      record.button.title=['created','linked_to_existing','already_exists'].includes(state)?"It's in the review queue.":'Request a review of the public product information.';
    }
    function refresh(key) {
      for(const [card,record] of records) {
        if(record.key!==key)continue;
        if(!card.isConnected||!contract.eligible(record.entry)||!validate(record.entry)){remove(card);continue;}
        paint(record);
      }
    }
    async function submit(event,record) {
      event.preventDefault();event.stopPropagation();
      if(!event.isTrusted||records.get(record.entry.element)!==record||!contract.eligible(record.entry)||!validate(record.entry)){return;}
      if(!['idle','error'].includes(stateFor(record)))return;
      if(inFlight>=2){remember(record.key,'error');refresh(record.key);return;}
      const current=generation;
      inFlight++;pending.add(record.key);refresh(record.key);
      try {
        const result=await scope.PawmarkShoppingNetwork.deadline(send,record.input,setTimeout,clearTimeout,15000);
        if(current!==generation)return;
        if(!['created','already_exists','linked_to_existing'].includes(result?.status))throw new Error('INVALID_RESPONSE');
        remember(record.key,result.status);
        onOutcome(record.entry,result.status);
      } catch { if(current!==generation)return;remember(record.key,'error'); }
      finally {inFlight--;if(current===generation)pending.delete(record.key);}
      refresh(record.key);
    }
    function render(entry) {
      const card=entry.element,input=contract.eligible(entry);
      if(!input||!card.isConnected){remove(card);return;}
      const anchor=card.querySelector('[data-pawmark-shopping-mode="badge"]');
      if(!anchor||anchor.getAttribute('data-pawmark-client-key')!==entry.key||anchor.closest('a,button')){remove(card);return;}
      const existing=records.get(card);
      if(existing?.entry.identity===entry.identity&&existing.host.isConnected&&anchor.nextSibling===existing.host){existing.entry=entry;paint(existing);return;}
      remove(card);
      for(const leftover of card.querySelectorAll(`[${MARKER}]`)){owners.set(leftover,card);leftover.remove();}
      const doc=card.ownerDocument,host=doc.createElement('pawmark-check-request');host.setAttribute(MARKER,'');
      const shadow=host.attachShadow({mode:'open'}),style=doc.createElement('style');style.textContent=CSS;
      scope.PawmarkTheme?.mount(host);
      const button=doc.createElement('button');button.type='button';
      const message=doc.createElement('span');message.className='message';
      const status=doc.createElement('div');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
      status.append(button,message);shadow.append(style,status);
      const record={host,anchor,entry,input,key:contract.identity(input),button,message};
      button.addEventListener('click',event=>void submit(event,record));
      for(const name of ['keydown','keyup','auxclick'])button.addEventListener(name,event=>event.stopPropagation());
      records.set(card,record);owners.set(host,card);paint(record);anchor.after(host);
    }
    return Object.freeze({
      onPresentation: ({type,entry})=>{if(!enabled)return;if(type==='validated')render(entry);else remove(entry.element);},
      isOwnMutation: mutation=>{
        if(owners.has(mutation.target))return true;
        if(mutation.type!=='childList')return false;
        const nodes=[...mutation.addedNodes,...mutation.removedNodes];
        return nodes.length>0&&nodes.every(node=>{if(!owners.has(node))return false;const card=owners.get(node),record=records.get(card);return record?.host!==node||card.contains(node)&&record.anchor.nextSibling===node;});
      },
      clear: ()=>{generation++;states.clear();pending.clear();for(const card of records.keys())remove(card);},
      getStats: ()=>({cards:records.size,requestedIdentities:states.size,inFlight,maxHistory:MAX_HISTORY}),
    });
  }
  scope.PawmarkShoppingCheckRequests=Object.freeze({createController});
})(globalThis);
