// js/pageInserts/nav.js

// Detect base path depending on environment (local vs GitHub Pages)
const REPO_NAME = "dbproject";

function getBasePath() {
  const path = window.location.pathname || "";
  // On GitHub Pages: /dbproject/...
  if (path.startsWith(`/${REPO_NAME}/`)) {
    return `/${REPO_NAME}`;
  }
  // Local dev (e.g. 127.0.0.1:5500) usually serves from project root
  return "";
}

const PROJECT_BASE = getBasePath();

export async function loadNav() {
  try {
    const container = document.createElement("div");

    const res = await fetch(`${PROJECT_BASE}/pageInserts/nav.html`);
    if (!res.ok) throw new Error("Failed to load nav.html");

    container.innerHTML = await res.text();
    document.body.prepend(container);

    // Mobile toggle
    const toggle = container.querySelector("#navToggle");
    const mobile = container.querySelector("#mobileNav");
    if (toggle && mobile) {
      toggle.addEventListener("click", () => {
        mobile.classList.toggle("hidden");
      });
    }

    // Highlight active section
    highlightActiveSection(container);
  } catch (err) {
    console.error("[nav] Failed to load nav:", err);
  }
}

function highlightActiveSection(root) {
  const path = window.location.pathname || "";

  let section = null;
  if (path.includes("/f_googlesheet") || path.includes("/hiw/googlesheet")) {
    section = "google-sheets";
  } else if (path.includes("/f_sql") || path.includes("/hiw/sql")) {
    section = "sql";
  } else if (path.includes("/f_superbase") || path.includes("/hiw/superbase")) {
    section = "supabase";
  }

  if (!section) return;

  const labels = root.querySelectorAll(
    `[data-section="${section}"] .nav-section-label`
  );

  labels.forEach((el) => {
    el.classList.add("text-blue-400", "font-semibold");
  });
}
