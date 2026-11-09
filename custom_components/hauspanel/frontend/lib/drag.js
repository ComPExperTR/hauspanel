// Drag to reorder in edit mode (works with touch, mouse and pen).

/**
 * Make the children with [data-key] inside `box` sortable.
 * `handle` (optional selector) limits where a drag can start.
 */
export function sortable(box, { onDrop, handle, axis } = {}) {
  let drag = null;

  box.addEventListener("pointerdown", (e) => {
    if (!box.closest(".editing")) return;
    if (e.button !== 0) return;
    if (e.target.closest("button, input, select, .hp-slider")) return;
    const item = e.target.closest("[data-key]");
    if (!item || item.parentElement !== box) return;
    if (handle && !e.target.closest(handle)) return;
    drag = { item, startX: e.clientX, startY: e.clientY, active: false, id: e.pointerId };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });

  const move = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.active) {
      if (Math.hypot(dx, dy) < 6) return;
      drag.active = true;
      drag.item.classList.add("dragging");
      box.classList.add("sorting");
      try { drag.item.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    e.preventDefault();
    drag.item.style.transform = `translate(${axis === "y" ? 0 : dx}px, ${axis === "x" ? 0 : dy}px)`;
    // Find the sibling under the pointer and move our element next to it.
    drag.item.style.pointerEvents = "none";
    const under = (box.getRootNode().elementFromPoint ? box.getRootNode() : document).elementFromPoint(e.clientX, e.clientY);
    drag.item.style.pointerEvents = "";
    const target = under?.closest?.("[data-key]");
    let over = target;
    while (over && over.parentElement !== box) over = over.parentElement?.closest?.("[data-key]");
    if (!over || over === drag.item) return;
    const before = drag.item.getBoundingClientRect();
    // By order, not by the middle of the one under the finger: moving onto a later one puts this behind it,
    // onto an earlier one in front of it. Items of different widths (the chips) then don't flip back and forth.
    const items = [...box.children];
    const after = items.indexOf(over) > items.indexOf(drag.item);
    box.insertBefore(drag.item, after ? over.nextSibling : over);
    // Keep the element under the finger after it moved in the DOM.
    const now = drag.item.getBoundingClientRect();
    drag.startX += now.left - before.left;
    drag.startY += now.top - before.top;
    drag.item.style.transform = `translate(${axis === "y" ? 0 : e.clientX - drag.startX}px, ${axis === "x" ? 0 : e.clientY - drag.startY}px)`;
  };

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    const was = drag.active;
    drag.item.classList.remove("dragging");
    drag.item.style.transform = "";
    box.classList.remove("sorting");
    drag = null;
    if (was) {
      const keys = [...box.children].map((c) => c.dataset.key).filter(Boolean);
      onDrop?.(keys);
    }
  };
}
