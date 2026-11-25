(function install(scope) {
  "use strict";
  const MARKER = 'data-pawmark-better-choice';
  const CSS = `
    :host { all:initial!important; display:block!important; max-width:100%!important; margin:0 0 8px!important; container-type:inline-size!important; contain:layout style;  }
    * { box-sizing:border-box; }
    a { display:grid; grid-template-columns:44px minmax(0,1fr); gap:10px; padding:10px 0; border-block:1px solid var(--pawmark-border-subtle); background:var(--pawmark-surface); color:var(--pawmark-text); text-decoration:none; font:500 12px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; letter-spacing:0; transition:transform 120ms ease,opacity 120ms ease; animation:reveal 160ms ease-out; }
    a.text-only { grid-template-columns:minmax(0,1fr); }
    img { width:44px; height:60px; object-fit:contain; background:var(--pawmark-image-stage); border-radius:2px; }
    .copy { min-width:0; }.label { font-size:11px; font-weight:650; color:var(--pawmark-accent); }
    .name { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; margin:4px 0 6px; font-weight:600; }
    a { --rating-tone:var(--pawmark-good); }a[data-score-tone="pawmarked"] { --rating-tone:var(--pawmark-status-positive); }
    .rating { display:flex; align-items:baseline; flex-wrap:wrap; gap:4px; color:var(--pawmark-text-secondary); font-size:11px; }.rating strong { color:var(--rating-tone); font-size:20px; font-weight:700; font-variant-numeric:tabular-nums; }.rating .band { color:var(--rating-tone); }
    .action { display:flex; align-items:center; gap:5px; margin-top:6px; font-size:11px; color:var(--pawmark-accent); text-decoration:underline; text-underline-offset:3px; }.action svg { width:13px; height:13px; transform:rotate(-90deg); }
    a:hover { border-color:var(--pawmark-accent); }a:focus-visible { outline:2px solid var(--pawmark-accent); outline-offset:2px; }a:active { transform:translateY(1px); }
    @keyframes reveal { from { opacity:.3;transform:translateY(3px); } to { opacity:1;transform:none; } }
    @container(max-width:180px) { a { grid-template-columns:minmax(0,1fr); }img { display:none; } }
    @media(prefers-reduced-motion:reduce) { a { transition:none; animation:none; }a:active { transform:none; } }
    @media(forced-colors:active) { a[data-score-tone] { --rating-tone:LinkText; border-color:CanvasText; }.label,.rating { color:LinkText; } }
  `;
  function createController({ enabled = false, validate, send, onCapacity, onRender = () => {} }) {
    const records = new Map(), owners = new WeakMap();
    function remove(card) { const previous = records.get(card); records.delete(card); previous?.host.remove(); }
    function render(entry, alternative) {
      const card = entry.element;
      if (!scope.PawmarkAlternativesContract.eligible(entry) || !scope.PawmarkAlternativesContract.better(entry.matchResult.product, alternative) || !scope.PawmarkAlternativesContract.supportsListing(entry, alternative) || alternative.status !== scope.PawmarkUI.getScoreTone(alternative.score).status || !card.isConnected || !validate(entry)) { remove(card); return; }
      const anchor = card.querySelector('[data-pawmark-shopping-mode="badge"]');
      if (!anchor || anchor.getAttribute('data-pawmark-client-key') !== entry.key || anchor.closest('a,button')) { remove(card); return; }
      const signature = JSON.stringify(alternative), existing = records.get(card);
      if (existing?.identity === entry.identity && existing.signature === signature && existing.host.isConnected && anchor.nextSibling === existing.host) return;
      remove(card);
      for (const leftover of card.querySelectorAll(`[${MARKER}]`)) { owners.set(leftover, card); leftover.remove(); }
      const doc = card.ownerDocument, host = doc.createElement('pawmark-better-choice');
      host.setAttribute(MARKER, entry.matchResult.product.id);
      const shadow = host.attachShadow({ mode:'open' }), style = doc.createElement('style'); style.textContent = CSS;
      scope.PawmarkTheme?.mount(host);
      const link = doc.createElement('a'); link.className = 'text-only';
      link.dataset.scoreTone = scope.PawmarkUI.getScoreTone(alternative.score).key;
      link.href = scope.PawmarkConfig.getPawmarkUrl('/product/' + encodeURIComponent(alternative.slug)); link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Kinder Choice: ${alternative.brandName} ${alternative.name}. Kindness Meter score ${alternative.score}/100, ${scope.PawmarkUI.getScoreLabel(alternative.status)}. View alternative on Kindvue in a new tab.`);
      link.title = 'Similar purpose, higher Kindness Meter score. Selected for relevance, not affiliate commission.';
      for (const event of ['click','auxclick','keydown','keyup']) link.addEventListener(event, value => value.stopPropagation());
      try {
        const url = new URL(alternative.imageUrl);
        if (url.protocol === 'https:' && !url.username && !url.password) {
          const img = doc.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
          img.addEventListener('error', () => { img.remove(); link.classList.add('text-only'); }, { once:true });
          img.src = url.href; link.append(img); link.classList.remove('text-only');
        }
      } catch {  }
      const copy = doc.createElement('span'); copy.className = 'copy';
      for (const [className, text] of [['label','Kinder Choice'],['name',alternative.name],['rating',`${alternative.score} \u00b7 ${scope.PawmarkUI.getScoreLabel(alternative.status)}`],['action','View alternative']]) {
        const node = doc.createElement('span'); node.className = className; node.textContent = text;
        if (className === 'rating') { const score = doc.createElement('strong'); score.textContent = String(alternative.score); const band = doc.createElement('span'); band.className = 'band'; band.textContent = `\u00b7 ${scope.PawmarkUI.getScoreLabel(alternative.status)}`; node.replaceChildren(`${entry.matchResult.product.score} \u2192 `, score, ' ', band); }
        if (className === 'action') { const icon = doc.createElement('span'); icon.setAttribute('aria-hidden', 'true'); icon.innerHTML = scope.PawmarkSaveIcons.chevron; node.append(icon); }
        copy.append(node);
      }
      link.append(copy); shadow.append(style,link); records.set(card,{host,anchor,signature,identity:entry.identity}); owners.set(host,card); anchor.after(host);
      onRender(entry,alternative);
    }
    const queue = scope.PawmarkAlternativesQueue.createQueue({ send, apply:render, onCapacity });
    return Object.freeze({
      retryDeferred: (entries,capacity)=>{if(enabled)for(const entry of entries)if(capacity>0&&!queue.has(entry)&&scope.PawmarkAlternativesContract.eligible(entry)){queue.add(entry);capacity--; }},
      onPresentation: ({type,entry}) => {
        if (!enabled) return;
        if (type === 'validated') { if (!scope.PawmarkAlternativesContract.eligible(entry)) remove(entry.element); queue.add(entry); }
        else { remove(entry.element); queue.remove(entry); }
      },
      isOwnMutation: mutation => {
        if (owners.has(mutation.target)) return true;
        if (mutation.type !== 'childList') return false;
        const nodes = [...mutation.addedNodes,...mutation.removedNodes];
        return nodes.length > 0 && nodes.every(node => {
          if (!owners.has(node)) return false;
          const card = owners.get(node), record = records.get(card);
          return record?.host !== node || card.contains(node) && record.anchor.nextSibling === node;
        });
      },
      clear: () => { queue.clear(); for (const card of records.keys()) remove(card); }, getStats:queue.getStats,
    });
  }
  scope.PawmarkShoppingAlternatives = Object.freeze({ createController });
})(globalThis);
