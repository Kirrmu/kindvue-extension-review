(function install(scope) {
  "use strict";
  const model = scope.PawmarkShoppingFilterModel;
  const ATTRIBUTE = "data-pawmark-shopping-filter", STORAGE_KEY = "pawmarkShoppingFiltersV1";
  const CSS = `
    :host { all: initial !important; display: block !important; position: static !important;
      width: 100% !important; max-width: 100% !important; grid-column: 1 / -1 !important;
      margin: 0 0 8px !important; box-sizing: border-box !important; container-type: inline-size !important; }
    :host([data-floating]) { position: fixed !important; top: var(--pawmark-top) !important;
      left: var(--pawmark-left) !important; width: var(--pawmark-width) !important;
      max-width: calc(100vw - 16px) !important; z-index: 200 !important; pointer-events: none !important; }
    :host([data-floating]) .bar { pointer-events: auto; box-shadow: var(--pawmark-shadow-compact); }
    :host([data-floating]) .bar { max-height: var(--pawmark-space); overflow-y: auto; overscroll-behavior: contain; }
    :host([data-floating]) .education { display: none; }
    * { box-sizing: border-box; }
    .bar { --forest: var(--pawmark-accent); --ink: var(--pawmark-text); --muted: var(--pawmark-secondary); --border: var(--pawmark-border-subtle);
      width: fit-content; max-width: 100%; background: var(--pawmark-surface); border: 1px solid var(--border);
      border-radius: 8px; padding: 0; color: var(--ink);
      font: 500 12px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; letter-spacing: 0; }
    .toolbar,.brand,.controls,.choices,.group,.utilities { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .toolbar { padding: 8px; gap: 14px; }
    .brand { gap: 8px; flex-shrink: 0; }
    .brand-copy { display: grid; gap: 1px; }
    .brand strong { font-family: var(--pawmark-font-brand, Georgia); font-size: 13px; font-weight: 700; }
    .mark { display: flex; color: var(--forest); flex: 0 0 24px; }.mark svg { width: 24px; height: 24px; }
    .compact-summary { font-size: 11px; font-weight: 500; color: var(--pawmark-text-secondary); font-variant-numeric: tabular-nums; }
    .active-status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .chevron svg { transition: transform 120ms ease; }
    .chevron[aria-expanded="true"] svg { transform: rotate(180deg); }
    .panel[hidden] { display: none; }
    .controls { gap: 10px; }.choices { gap: 4px; }.group { gap: 4px; }
    .utilities { gap: 2px; margin-left: auto; }
    button { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      min-height: 32px; padding: 5px 8px; border: 1px solid transparent; border-radius: 6px;
      background: var(--muted); color: var(--forest); font: inherit; font-weight: 650; letter-spacing: 0;
      cursor: pointer; max-width: 100%; overflow-wrap: anywhere; transition: background 120ms ease; }
    button svg { width: 15px; height: 15px; flex: 0 0 15px; }
    button[aria-pressed="true"] { background: var(--pawmark-strong); border-color: var(--forest); }
    button:hover:not(:disabled) { background: var(--pawmark-strong); }
    button:active:not(:disabled) { background: var(--pawmark-brand-strong); border-color: var(--pawmark-brand-border); }
    button:focus-visible { outline: 2px solid var(--forest); outline-offset: 2px; }
    .modes { gap: 0; background: var(--muted); padding: 2px; border-radius: 6px; }
    .modes button { background: transparent; padding: 4px 7px; }
    .modes button[aria-pressed="true"] { background: var(--pawmark-surface); border-color: var(--pawmark-border); }
    button:disabled { cursor: default; opacity: 1; color: var(--pawmark-text-muted); background: var(--muted); border-color: var(--border); }
    .icon-control { display: inline-grid; place-items: center; width: 32px; height: 32px; min-height: 32px; flex: 0 0 32px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--forest); }
    .icon-control svg { display: block; width: 16px; height: 16px; stroke-width: 2; }
    .icon-control[aria-checked="true"],.power { background: var(--muted); }
    .icon-control[aria-checked="false"] { border-style: dashed; border-color: var(--pawmark-border); }
    .icon-control:disabled { background: transparent; border-color: transparent; }
    .tooltip { position: fixed; inset: auto; margin: 0; border: 0; padding: 5px 8px; max-width: calc(100vw - 16px); border-radius: 4px; background: var(--pawmark-tooltip); color: var(--pawmark-on-tooltip); font: inherit; font-size: 11px; }
    .tooltip[hidden] { display: none; }
    .empty { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--border); padding: 8px; }
    .empty[hidden] { display: none; }.empty button { min-height: 30px; font-size: 11px; }
    .education,.help { border-top:1px solid var(--border); padding:12px; font-size:12px; line-height:1.5; }
    .education[hidden],.help[hidden] { display:none; }
    .education p,.help p { margin:0 0 8px; max-width:65ch; }
    .education strong { display:block; color:var(--forest); margin-bottom:4px; font-size:13px; }
    .education .topics { color:var(--pawmark-text-secondary); font-size:12px; }
    .feedback:empty { display: none; }.feedback { padding: 8px; color: var(--pawmark-danger); }
    @container (max-width: 850px) {
      .bar { width: 100%; }.toolbar { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; }
      .utilities { grid-column: 2; grid-row: 1; }.panel { grid-column: 1 / -1; grid-row: 2; }
      .controls,.choices { flex-wrap: wrap; }.controls { gap: 8px; }
    }
    @container (max-width: 360px) {
      .toolbar { padding: 7px; gap: 4px; }.brand { gap: 4px; }.utilities { gap: 0; }
      .choices { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); width: 100%; gap: 4px; }
      .choices .group { display: contents; }button { padding: 5px 7px; }
    }
    .bar:has(.panel[hidden]) { width: fit-content; }
    .bar:has(.panel[hidden]) .empty { display: none; }
    @media(prefers-reduced-motion: reduce) { button,.chevron svg { transition: none; } }
    @media(forced-colors: active) { button[aria-pressed="true"] { border: 2px solid Highlight; }.bar { border-color: CanvasText; } }
  `;
  function createController({ enabled = false, onSettingsChange = () => {}, onAction = () => {} } = {}) {
    const records = new Map(), owned = new WeakSet();
    let preferences = model.settings(), host, root, shadow, summaryScheduled = false, revision = 0, pendingWrites = 0, waiting=0, listening=false;
    let educationDismissed=true, interacted=false;
    let expanded=true, stopTheme, themeBusy=false;
    function paintTheme({ resolved, ready }) {
      if (!shadow) return;
      const button=shadow.querySelector('[data-theme-toggle]');
      const label=resolved==='dark'?'Use light mode':'Use dark mode';
      button.innerHTML=scope.PawmarkSaveIcons[resolved==='dark'?'sun':'moon'];
      button.setAttribute('aria-label',label);
      button.setAttribute('aria-description',`Current appearance: ${resolved}. Applies only to Kindvue.`);
      button.dataset.tooltip=label;
      button.disabled=!ready||themeBusy;
      if(tooltipButton===button)showTooltip(button);
    }
    let anchor, floating=false, layoutFrame=0, resizeObserver, headerObserver, tooltipButton;
    const HEADER_SELECTOR='#navbar,#nav-belt,#nav-main,#nav-subnav,.s-desktop-toolbar,[data-component-type="s-search-results-toolbar"],#s-sticky-filter-header';
    function moveHost(parent){
      
      const active=shadow?.activeElement;
      if(parent.moveBefore&&host.isConnected)parent.moveBefore(host,null);else parent.append(host);
      if(active&&shadow.activeElement!==active)active.focus({preventScroll:true});
    }
    function layout(){
      layoutFrame=0;
      if(!host||!anchor?.isConnected)return;
      const rect=anchor.getBoundingClientRect();
      let bottom=0;
      for(const header of document.querySelectorAll(HEADER_SELECTOR)){
        const box=header.getBoundingClientRect(),style=getComputedStyle(header);
        if(style.visibility==='hidden'||style.display==='none'||box.height===0)continue;
        if((['fixed','sticky'].includes(style.position)||header.id==='navbar'&&box.top<=0)&&box.bottom>0&&box.top<innerHeight/2)bottom=Math.max(bottom,box.bottom);
      }
      const top=Math.min(bottom+8,Math.max(8,innerHeight-80));
      const shouldFloat=rect.top<top&&scrollY>0;
      if(shouldFloat&&!floating){
        anchor.style.height=host.getBoundingClientRect().height+8+'px';
        if(expanded&&!shadow.activeElement&&!host.matches(':hover'))setExpanded(false);
        floating=true;host.setAttribute('data-floating','');moveHost(document.body);
      }else if(!shouldFloat&&floating){
        floating=false;host.removeAttribute('data-floating');moveHost(anchor);anchor.style.removeProperty('height');
      }
      if(floating){
        const width=Math.max(0,Math.min(rect.width,960,innerWidth-16));
        const left=Math.max(8,Math.min(rect.left,innerWidth-width-8));
        for(const [key,value] of Object.entries({top,left,width,space:Math.max(50,innerHeight-top-64)})){
          const name='--pawmark-'+key,px=Math.round(value)+'px';
          if(host.style.getPropertyValue(name)!==px)host.style.setProperty(name,px);
        }
      }
      positionTooltip();
    }
    function scheduleLayout(){if(!layoutFrame)layoutFrame=requestAnimationFrame(layout);}
    function watchLayout(){
      scope.addEventListener('scroll',scheduleLayout,{passive:true});scope.addEventListener('resize',scheduleLayout);
      resizeObserver=new ResizeObserver(scheduleLayout);resizeObserver.observe(anchor);resizeObserver.observe(host);
      headerObserver=new MutationObserver(scheduleLayout);
      for(const header of document.querySelectorAll(HEADER_SELECTOR)){
        resizeObserver.observe(header);headerObserver.observe(header,{attributes:true,attributeFilter:['class','style'],subtree:true});
      }
    }
    const EDUCATION_KEY='pawmarkShoppingEducationV1';
    function setExpanded(value){
      expanded=value===true;
      if(shadow){
        const panel=shadow.querySelector('.panel'),button=shadow.querySelector('[data-expand]');
        if(!expanded&&panel.contains(shadow.activeElement))button.focus();
        panel.hidden=!expanded;button.setAttribute('aria-expanded',String(expanded));
        button.dataset.tooltip=expanded?'Collapse':'Expand filters';
        button.setAttribute('aria-label',expanded?'Collapse Kindvue filters':'Expand Kindvue filters');
        if(!expanded){shadow.querySelector('.help').hidden=true;shadow.querySelector('[data-help]').setAttribute('aria-expanded','false');}
      }
    }
    function dismissEducation(){
      interacted=true;educationDismissed=true;
      if(shadow)shadow.querySelector('.education').hidden=true;
      scope.chrome?.storage?.local.set({[EDUCATION_KEY]:true}).catch(()=>{});
    }
    function storageChanged(changes,area){
      if(area==='local'&&changes[EDUCATION_KEY]?.newValue===true){educationDismissed=true;if(shadow)shadow.querySelector('.education').hidden=true;}
      if(!pendingWrites&&area==='local'&&changes[STORAGE_KEY]&&JSON.stringify(model.settings(changes[STORAGE_KEY].newValue))!==JSON.stringify(preferences))change(changes[STORAGE_KEY].newValue,false);
    }
    function listen(active){
      if(!scope.chrome?.storage?.local||active===listening)return;
      listening=active;
      if(!active){scope.chrome.storage.onChanged.removeListener(storageChanged);return;}
      scope.chrome.storage.onChanged.addListener(storageChanged);
      const initialRevision=revision;
      scope.chrome.storage.local.get([STORAGE_KEY,EDUCATION_KEY]).then(value=>{
        if(!listening||revision!==initialRevision)return;
        change(value[STORAGE_KEY],false);
        educationDismissed=interacted||value[EDUCATION_KEY]===true||Boolean(value[STORAGE_KEY])||scope.PawmarkConfig.SHOPPING_MODE_ONBOARDING===false;
        if(shadow)shadow.querySelector('.education').hidden=educationDismissed;
      }).catch(()=>{});
    }
    function restore(card) { if (records.has(card)) card.removeAttribute(ATTRIBUTE); }
    function apply(entry) {
      const decision = model.evaluate(entry, preferences);
      const state = decision.state === "FAIL" ? preferences.mode : null;
      if (state) { if (entry.element.getAttribute(ATTRIBUTE) !== state) entry.element.setAttribute(ATTRIBUTE, state); }
      else restore(entry.element);
    }
    function summary() {
      summaryScheduled = false;
      if (!shadow) return;
      let checked = 0, pass = 0, insufficient = 0, pending = 0, unavailable = 0;
      for (const [card, entry] of records) {
        if (!card.isConnected) { records.delete(card); continue; }
        if (entry.matchState === "failed") { unavailable++; continue; }
        if (entry.matchState !== "resolved") { pending++; continue; }
        checked++;
        const decision = model.evaluate(entry, preferences);
        if (decision.state === "PASS") pass++;
        if (decision.reason === "evidence") insufficient++;
      }
      let text = !preferences.enabled ? `Filtering off \u00b7 ${checked} checked` : model.active(preferences) ? `${pass} of ${checked} checked match` : `${checked} checked`;
      if (insufficient) text += ` \u00b7 ${insufficient} lack product evidence`;
      if (pending) text += ` \u00b7 ${pending} pending`;
      if (unavailable) text += ` \u00b7 ${unavailable} unavailable`;
      if(waiting)text+=` \u00b7 ${waiting} waiting`;
      const compact=shadow.querySelector('.compact-summary');
      compact.textContent=`${checked} checked${model.active(preferences)&&checked>0&&pass===0?' \u00b7 0 match':''}${unavailable?' \u00b7 unavailable':''}`;
      compact.title=text;compact.setAttribute('aria-label',text);
      const active=analyticsContext().activeFilterCount;
      shadow.querySelector('.active-status').textContent=!preferences.enabled?'Filtering off':active?`${active} ${active===1?'filter':'filters'} \u00b7 ${preferences.mode==='hide'?'Hide':'Dim'}`:'';
      const empty = shadow.querySelector('.empty');
      empty.hidden = !(model.active(preferences) && checked > 0 && pass === 0);
      shadow.querySelector('.empty-message').textContent = `No checked products here match your Kindvue filters.${insufficient ? ' Some products are not checked yet.' : ''}`;
    }
    function scheduleSummary() { if (!summaryScheduled) { summaryScheduled = true; queueMicrotask(summary); } }
    function updateControls() {
      if (!shadow) return;
      for (const button of shadow.querySelectorAll('[data-score]')) button.setAttribute('aria-pressed', String(preferences.score === button.dataset.score));
      for (const button of shadow.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', String(preferences[button.dataset.filter]));
      for (const button of shadow.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(preferences.mode === button.dataset.mode));
      const master = shadow.querySelector('[role="switch"]'); master.setAttribute('aria-checked', String(preferences.enabled));
      master.dataset.tooltip=preferences.enabled?'Turn filtering off':'Turn filtering on';
      for (const button of shadow.querySelectorAll('[data-score], [data-filter]')) button.disabled = !preferences.enabled;
      shadow.querySelector('.reset').disabled = preferences.score === 'all' && !preferences.vegan && !preferences.crueltyFree;
    }
    function change(value, persist = true) {
      const previous=preferences;
      preferences = model.settings(value); revision++;
      for (const [card, entry] of records) {
        if (!card.isConnected) { records.delete(card); continue; }
        apply(entry);
      }
      updateControls(); scheduleSummary(); onSettingsChange();
      if(persist){
        dismissEducation();
        const context=analyticsContext();
        if(previous.mode!==preferences.mode)onAction('mode_changed',context);
        else if(previous.enabled!==preferences.enabled)onAction('filter_changed',{...context,filter:'filtering',enabled:preferences.enabled});
        else for(const key of ['score','vegan','crueltyFree'])if(previous[key]!==preferences[key])onAction('filter_changed',{...context,filter:key==='score'?(preferences.score==='85'||previous.score==='85'?'pawmarked':'score70'):key,enabled:key==='score'?preferences.score!=='all':preferences[key]});
      }
      if (persist && scope.chrome?.storage?.local) {
        
        pendingWrites++;
        scope.chrome.storage.local.set({ [STORAGE_KEY]: preferences }).catch(() => {}).finally(() => { pendingWrites--; });
      }
    }
    function analyticsContext(){
      let checkedCount=0,filteredCount=0;
      for(const entry of records.values())if(entry.matchState==='resolved'){checkedCount++;if(model.evaluate(entry,preferences).state==='FAIL')filteredCount++;}
      return {mode:preferences.mode,activeFilterCount:preferences.enabled?Number(preferences.score!=='all')+Number(preferences.vegan)+Number(preferences.crueltyFree):0,checkedCount,filteredCount};
    }
    function clear() {
      hideTooltip();
      stopTheme?.();stopTheme=undefined;
      listen(false);
      scope.removeEventListener('scroll',scheduleLayout);scope.removeEventListener('resize',scheduleLayout);
      resizeObserver?.disconnect();headerObserver?.disconnect();resizeObserver=undefined;headerObserver=undefined;cancelAnimationFrame(layoutFrame);layoutFrame=0;floating=false;
      for (const card of records.keys()) restore(card);
      records.clear();
      const previous = host; host = undefined; shadow = undefined; root = undefined; previous?.remove();
      anchor?.remove();anchor=undefined;
    }
    function setRoots(roots) {
      if (!enabled) return;
      const next = roots.find(node => node.isConnected && !node.closest('a, button'));
      if (!next) { clear(); return; }
      listen(true);
      for(const parent of new Set([...roots.map(node=>node.parentElement),anchor,document.body].filter(Boolean)))for(const clone of parent.querySelectorAll(':scope > [data-pawmark-shopping-toolbar], :scope > [data-pawmark-shopping-anchor]')){
        if(clone!==host&&clone!==anchor){owned.add(clone);clone.remove();}
      }
      for (const [card] of records) if (!roots.some(candidate => candidate.contains(card))) { restore(card); records.delete(card); }
      if (host?.isConnected && root === next && anchor?.nextSibling === next) return;
      if (!host) {
        anchor=document.createElement('pawmark-shopping-anchor');owned.add(anchor);anchor.setAttribute('data-pawmark-shopping-anchor','');
        anchor.style.cssText='display:block;width:100%;max-width:100%;grid-column:1 / -1;box-sizing:border-box;';
        host = document.createElement('pawmark-shopping-toolbar'); owned.add(host);
        host.setAttribute('data-pawmark-shopping-toolbar', ''); shadow = host.attachShadow({ mode: 'open' });
        scope.PawmarkTheme?.mount(host);
        const style = document.createElement('style'); style.textContent = CSS; shadow.append(style);
        const bar = document.createElement('section'); bar.className = 'bar'; bar.setAttribute('aria-label', 'Kindvue Shopping Mode');
        bar.innerHTML = `<div class="toolbar"><div class="brand"><span class="mark" aria-hidden="true">${scope.PawmarkShoppingBadges.getBrandMark()}</span><div class="brand-copy"><strong>Kindvue</strong><span class="compact-summary summary" role="status" aria-live="polite"></span></div><span class="active-status" role="status" aria-live="polite"></span></div>
          <div class="panel" id="pawmark-shopping-panel"><div class="controls"><div class="choices"><div class="group" role="group" aria-label="Score tier"><button type="button" data-score="70" aria-pressed="false">70+</button><button type="button" data-score="85" aria-pressed="false">Kindvue Pick</button></div>
          <button type="button" data-filter="vegan" aria-pressed="false">Vegan</button><button type="button" data-filter="crueltyFree" aria-pressed="false">Cruelty-free</button></div>
          <div class="group modes" role="group" aria-label="Filtered product display"><button type="button" data-mode="dim" aria-pressed="true">Dim</button><button type="button" data-mode="hide" aria-pressed="false">Hide</button></div>
          <button type="button" class="icon-control master" role="switch" aria-label="Shopping Mode filtering" aria-description="Only controls filtering; product annotations remain visible." data-tooltip="Turn filtering off" aria-checked="true">${scope.PawmarkSaveIcons.filters}</button></div></div>
          <div class="utilities"><button type="button" class="icon-control reset" data-reset data-tooltip="Reset filters" aria-label="Reset filters">${scope.PawmarkSaveIcons.reset}</button>
          <button type="button" class="icon-control help-button" data-help aria-label="How Kindvue Shopping Mode works" data-tooltip="Shopping Mode help" aria-expanded="false" aria-controls="pawmark-shopping-help">${scope.PawmarkSaveIcons.help}</button>
          <button type="button" class="icon-control" data-theme-toggle aria-label="Use dark mode" data-tooltip="Use dark mode" disabled>${scope.PawmarkSaveIcons.moon}</button>
          <button type="button" class="icon-control power" data-power data-tooltip="Turn Shopping Mode off" aria-label="Turn Shopping Mode off">${scope.PawmarkSaveIcons.visibility}</button>
          <button type="button" class="icon-control chevron" data-expand aria-label="Collapse Kindvue filters" data-tooltip="Collapse" aria-expanded="true" aria-controls="pawmark-shopping-panel">${scope.PawmarkSaveIcons.chevron}</button></div></div>
          <div class="help" id="pawmark-shopping-help" role="region" aria-label="Shopping Mode help" hidden><p>Vegan and cruelty-free evidence, at product level. Higher Kindness Meter scores indicate stronger evidence under Kindvue's methodology. Products not checked yet won't pass active filters.</p><p>Dim keeps filtered products visible. Hide removes them from view. Kinder Choice offers one similar, higher-scoring product.</p></div>
          <div class="empty" hidden><span class="empty-message"></span><button type="button" data-reset>Reset filters</button></div>
          <div class="feedback" role="status"></div><span class="tooltip" role="tooltip" id="kindvue-toolbar-tooltip" popover="manual" hidden></span>
          <div class="education" role="region" aria-label="Welcome to Shopping Mode" hidden><strong>Shop normally. Kindvue checks products for you.</strong><p class="topics">Kindness Meter scores &middot; Vegan &amp; cruelty-free evidence &middot; Kinder Choice</p><p>Public product details go to Kindvue for matching. Extension activity is not used for Brand Intelligence.</p><button type="button" data-dismiss>Got it</button></div>`;
        bar.addEventListener('click', event => {
          const button = event.target.closest('button'); if (!button || button.disabled || !event.isTrusted) return;
          event.stopPropagation();
          hideTooltip();
          if(button.hasAttribute('data-theme-toggle')){
            themeBusy=true;button.disabled=true;
            shadow.querySelector('.feedback').textContent='';
            scope.PawmarkTheme.setPreference(scope.PawmarkTheme.snapshot().resolved==='dark'?'light':'dark')
              .catch(()=>{if(shadow)shadow.querySelector('.feedback').textContent="Appearance couldn't be saved. Try again.";})
              .finally(()=>{themeBusy=false;paintTheme(scope.PawmarkTheme.snapshot());});return;
          }
          if(button.hasAttribute('data-power')){
            button.disabled=true;
            scope.KindvueAssistance.setShoppingEnabled(false).catch(()=>{if(!shadow)return;button.disabled=false;shadow.querySelector('.feedback').textContent="Couldn't turn Shopping Mode off. Try again.";});return;
          }
          if(button.hasAttribute('data-expand')){setExpanded(!expanded);dismissEducation();return;}
          if(button.hasAttribute('data-help')){const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));shadow.querySelector('.help').hidden=!open;dismissEducation();return;}
          if(button.hasAttribute('data-dismiss')){dismissEducation();setExpanded(false);shadow.querySelector('[data-expand]').focus();return;}
          if (button.dataset.score) change({ ...preferences, score: preferences.score === button.dataset.score ? 'all' : button.dataset.score });
          else if (button.dataset.filter) change({ ...preferences, [button.dataset.filter]: !preferences[button.dataset.filter] });
          else if (button.dataset.mode) change({ ...preferences, mode: button.dataset.mode });
          else if (button.hasAttribute('data-reset')) {change({ ...preferences, score: 'all', vegan: false, crueltyFree: false });onAction('filter_reset',analyticsContext());}
          else if (button.getAttribute('role') === 'switch') change({ ...preferences, enabled: !preferences.enabled });
        });
        bar.addEventListener('keydown',event=>{if(event.key!=='Escape')return;hideTooltip();if(!shadow.querySelector('.help').hidden){shadow.querySelector('.help').hidden=true;const button=shadow.querySelector('[data-help]');button.setAttribute('aria-expanded','false');button.focus();hideTooltip();}else if(expanded){setExpanded(false);shadow.querySelector('[data-expand]').focus();hideTooltip();}event.stopPropagation();});
        bar.addEventListener('focusin',event=>showTooltip(event.target.closest('[data-tooltip]')));
        bar.addEventListener('focusout',hideTooltip);
        bar.addEventListener('pointerover',event=>{const button=event.target.closest('[data-tooltip]');if(button)showTooltip(button);});
        bar.addEventListener('pointerout',event=>{
          if(tooltipButton?.contains(event.relatedTarget)||shadow.querySelector('.tooltip').contains(event.relatedTarget))return;
          const focused=shadow.activeElement?.closest('[data-tooltip]');if(focused)showTooltip(focused);else hideTooltip();
        });
        shadow.append(bar);
        stopTheme=scope.PawmarkTheme?.subscribe(paintTheme);
        shadow.querySelector('.education').hidden=educationDismissed;
        shadow.querySelector('[data-score="70"]').title='Kindness Meter score of at least 70';
        shadow.querySelector('[data-score="85"]').title='Kindness Meter score of at least 85';
        setExpanded(expanded);
      }
      root = next;next.before(anchor);
      if(!floating)anchor.append(host);
      if(scope.KindvueShoppingControl?.takeFocus())shadow.querySelector('[data-power]').focus({preventScroll:true});
      if(!resizeObserver)watchLayout();
      updateControls();scheduleSummary();scheduleLayout();
    }
    function hideTooltip(){
      tooltipButton=undefined;
      if(!shadow)return;
      const tip=shadow.querySelector('.tooltip');
      if(tip.matches(':popover-open'))tip.hidePopover();
      tip.hidden=true;
      for(const button of shadow.querySelectorAll('[aria-describedby="kindvue-toolbar-tooltip"]'))button.removeAttribute('aria-describedby');
    }
    function showTooltip(button){
      hideTooltip();if(!button||button.disabled)return;
      const tip=shadow.querySelector('.tooltip');tip.textContent=button.dataset.tooltip;tip.hidden=false;
      tooltipButton=button;
      
      tip.showPopover();
      button.setAttribute('aria-describedby',tip.id);
      positionTooltip();
    }
    function positionTooltip(){
      if(!tooltipButton||!shadow)return;
      const button=tooltipButton,tip=shadow.querySelector('.tooltip');
      if(!button.checkVisibility()){hideTooltip();return;}
      const rect=button.getBoundingClientRect(),box=tip.getBoundingClientRect();
      tip.style.left=Math.max(8,Math.min(innerWidth-box.width-8,rect.left+rect.width/2-box.width/2))+'px';
      tip.style.top=(rect.bottom+box.height+8<innerHeight?rect.bottom+5:Math.max(8,rect.top-box.height-5))+'px';
    }
    return Object.freeze({ setRoots, restore, analyticsContext, dismissEducation, passes:entry=>model.evaluate(entry,preferences).state==='PASS',
      setWaiting: count=>{waiting=count;scheduleSummary();},
      retainEntry: entry => Boolean(enabled && model.active(preferences) && entry?.matchState === 'resolved' && entry.element.getAttribute(ATTRIBUTE)==='hide'),
      onPresentation: ({ type, entry }) => {
        if (!enabled) return;
        if (type !== 'validated') { restore(entry.element); records.delete(entry.element); }
        else { records.set(entry.element, entry); apply(entry); }
        scheduleSummary();
      },
      isOwnMutation: mutation => owned.has(mutation.target) || mutation.type === 'childList' &&
        [...mutation.addedNodes, ...mutation.removedNodes].length > 0 && [...mutation.addedNodes, ...mutation.removedNodes].every(node => owned.has(node)),
    });
  }
  scope.PawmarkShoppingFilters = Object.freeze({ createController });
})(globalThis);
