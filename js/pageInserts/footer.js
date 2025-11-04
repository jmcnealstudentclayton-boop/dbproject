// js/pageInserts/footer.js
const PROJECT_BASE = "/dbproject"; // <-- your GitHub Pages repo name

export async function loadFooter() {
  try {
    const container = document.createElement("div");

    // Use repo base path to load footer.html correctly on GitHub Pages
    const res = await fetch(`${PROJECT_BASE}/pageInserts/footer.html`);
    if (!res.ok) throw new Error("Failed to load footer.html");

    container.innerHTML = await res.text();
    document.body.appendChild(container);

    // Update year automatically
    const yearEl = container.querySelector("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  } catch (err) {
    console.error("[footer] Failed to load footer:", err);
  }
}
