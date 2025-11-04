// js/pageInserts/footer.js
export async function loadFooter() {
  try {
    const container = document.createElement('div');

    const res = await fetch('/pageInserts/footer.html');
    if (!res.ok) throw new Error('Failed to load footer.html');

    container.innerHTML = await res.text();
    document.body.appendChild(container);

    const yearEl = container.querySelector('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  } catch (err) {
    console.error('[footer] Failed to load footer:', err);
  }
}
