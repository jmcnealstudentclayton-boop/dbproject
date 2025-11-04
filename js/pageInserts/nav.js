// js/pageInserts/nav.js

const REPO_NAME = "dbproject";

function getBasePath() {
  const path = window.location.pathname || "";
  // On GitHub Pages: /dbproject/...
  if (path.startsWith(`/${REPO_NAME}/`)) {
    return `/${REPO_NAME}`;
  }
  // Local dev (e.g. 127.0.0.1:5500) from project root
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

    // Fix all links based on PROJECT_BASE
    rewriteNavLinks(container);

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

function rewriteNavLinks(root) {
  const links = root.querySelectorAll("a[data-href]");
  links.forEach((a) => {
    const target = a.getAttribute("data-href");
    if (!target) return;
    // e.g. PROJECT_BASE="/dbproject" + "/pages/forms/f_googlesheet.html"
    a.setAttribute("href", `${PROJECT_BASE}${target}`);
  });
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
  } else if (path.endsWith("/index.html") || path === `/${REPO_NAME}/` || path === `/${REPO_NAME}`) {
    // Optional: highlight Google Sheets or nothing on home; you can tweak this
    section = null;
  }

  if (!section) return;

  const labels = root.querySelectorAll(
    `[data-section="${section}"] .nav-section-label`
  );

  labels.forEach((el) => {
    el.classList.add("text-blue-400", "font-semibold");
  });
}
