// js/pageInserts/footer.js

const REPO_NAME = "dbproject";

function getBasePath() {
  const path = window.location.pathname || "";
  if (path.startsWith(`/${REPO_NAME}/`)) {
    return `/${REPO_NAME}`;
  }
  return "";
}

const PROJECT_BASE = getBasePath();

export async function loadFooter() {
  try {
    const container = document.createElement("div");

    const res = await fetch(`${PROJECT_BASE}/pageInserts/footer.html`);
    if (!res.ok) throw new Error("Failed to load footer.html");

    container.innerHTML = await res.text();
    document.body.appendChild(container);

    const yearEl = container.querySelector("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  } catch (err) {
    console.error("[footer] Failed to load footer:", err);
  }
}
