// ui.js — small DOM helpers

export function populateItemSelect(selectEl, products) {
  if (!selectEl) return;

  // If it's not a <select>, just bail gracefully
  if (!(selectEl instanceof HTMLSelectElement)) {
    console.warn('[populateItemSelect] #item is not a <select>; skipping options.');
    return;
  }

  while (selectEl.options.length > 1) selectEl.remove(1);

  for (const p of products || []) {
    if (!p?.id) continue;
    const opt = document.createElement('option');
    opt.value = p.id;
    const label =
      p.price != null
        ? `${p.name ?? p.title ?? p.id} (${p.id}) — $${Number(p.price).toFixed(2)}`
        : `${p.name ?? p.title ?? p.id} (${p.id})`;
    opt.textContent = label;
    selectEl.appendChild(opt);
  }
}

export function showToast(el, msg, ok = true) {
  if (!el) return;
  el.textContent = msg;
  el.className = `mt-4 text-sm ${ok ? 'text-green-700' : 'text-red-700'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}
