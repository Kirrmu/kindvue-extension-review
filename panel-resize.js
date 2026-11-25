(function (root) {
  "use strict";
  const KEY = "kindvuePanelSizeV1";
  let preferred;
  let revision = 0;

  function valid(size) {
    return size && Number.isFinite(size.width) && Number.isFinite(size.height)
      && size.width > 0 && size.height > 0;
  }

  function constrain(size, width, height) {
    const margin = width <= 520 ? 24 : 36;
    const maxWidth = Math.max(1, Math.min(560, width - margin));
    const maxHeight = Math.max(1, Math.min(860, height - margin));
    return {
      width: Math.round(Math.min(maxWidth, Math.max(Math.min(300, maxWidth), size.width))),
      height: Math.round(Math.min(maxHeight, Math.max(Math.min(320, maxHeight), size.height))),
    };
  }

  function mount(widget) {
    if (widget.dataset.pawmarkState === "loading") return;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "pawmark-widget__resize";
    handle.setAttribute("aria-label", "Resize Kindvue panel");
    handle.title = "Drag to resize. Arrow keys resize; Home resets.";
    widget.appendChild(handle);
    let drag;
    let disposed = false;
    let selected = preferred;

    function apply(size) {
      const next = constrain(size, innerWidth, innerHeight);
      widget.style.setProperty("--kindvue-panel-width", `${next.width}px`);
      widget.style.setProperty("--kindvue-panel-height", `${next.height}px`);
      widget.classList.add("pawmark-widget--sized");
      return next;
    }

    function save(size) {
      preferred = selected = size;
      revision += 1;
      
      try { root.chrome?.storage?.local.set({ [KEY]: size }).catch(() => {}); } catch {  }
    }

    function finish(event) {
      if (!drag || event.pointerId !== drag.id) return;
      drag = undefined;
      widget.classList.remove("pawmark-widget--resizing");
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      if (selected) save(selected);
    }

    handle.addEventListener("pointerdown", event => {
      if (event.button !== 0 || !event.isPrimary) return;
      event.preventDefault();
      const rect = widget.getBoundingClientRect();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
      handle.setPointerCapture(event.pointerId);
      handle.focus({ preventScroll: true });
      widget.classList.add("pawmark-widget--resizing");
    }, options);
    handle.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.id) return;
      selected = apply({ width: drag.width + drag.x - event.clientX, height: drag.height + drag.y - event.clientY });
    }, options);
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) handle.addEventListener(name, finish, options);
    handle.addEventListener("keydown", event => {
      if (event.key === "Home") {
        event.preventDefault();
        widget.classList.remove("pawmark-widget--sized");
        widget.style.removeProperty("--kindvue-panel-width");
        widget.style.removeProperty("--kindvue-panel-height");
        save(null);
        return;
      }
      const directions = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      const rect = widget.getBoundingClientRect();
      const step = event.shiftKey ? 40 : 16;
      save(apply({ width: rect.width + direction[0] * step, height: rect.height + direction[1] * step }));
    }, options);
    window.addEventListener("resize", () => { if (selected) apply(selected); }, options);

    if (valid(selected)) apply(selected);
    const startingRevision = revision;
    try {
      root.chrome?.storage?.local.get(KEY).then(result => {
        if (disposed || drag || startingRevision !== revision || selected !== undefined) return;
        if (valid(result[KEY])) {
          preferred = selected = constrain(result[KEY], 10000, 10000);
          apply(selected);
        }
      }).catch(() => {});
    } catch {  }

    return () => {
      disposed = true;
      controller.abort();
      if (drag && handle.hasPointerCapture(drag.id)) handle.releasePointerCapture(drag.id);
      widget.classList.remove("pawmark-widget--resizing");
      handle.remove();
    };
  }
  root.KindvuePanelResize = { mount, constrain, valid };
})(globalThis);
