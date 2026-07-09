const categoryLabels = {
  bibliography: "Bibliography",
  checking: "Checking",
  graphics: "Graphics",
  templates: "Templates",
  workflow: "Workflow",
  writing: "Writing",
};

const state = {
  catalog: null,
  query: "",
  category: "all",
};

const catalogGrid = document.querySelector("[data-catalog-grid]");
const detailRoot = document.querySelector("[data-extension-detail]");
const searchInput = document.querySelector("[data-search]");
const categorySelect = document.querySelector("[data-category]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinksMenu = document.querySelector("[data-nav-links]");

if (navToggle && navLinksMenu) {
  navToggle.addEventListener("click", () => {
    const open = !navLinksMenu.classList.contains("open");
    navLinksMenu.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });

  navLinksMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      navLinksMenu.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

init().catch((error) => {
  renderError(error instanceof Error ? error.message : "Could not load catalog.");
});

async function init() {
  const response = await fetch("/extensions/catalog.json", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Catalog request failed with HTTP ${response.status}.`);
  }

  state.catalog = await response.json();
  const totalCount = document.querySelector("[data-total-count]");
  const categoryCount = document.querySelector("[data-category-count]");
  if (totalCount) {
    totalCount.textContent = String(state.catalog.extensions.length);
  }
  if (categoryCount) {
    categoryCount.textContent = String(
      new Set(state.catalog.extensions.map((extension) => extension.category)).size,
    );
  }
  const updatedAt = document.querySelector("[data-updated-at]");
  if (updatedAt) {
    updatedAt.textContent = `Catalog updated ${formatDate(state.catalog.updatedAt)}`;
  }

  if (detailRoot) {
    renderDetail();
    return;
  }

  hydrateFilters();
  renderCatalog();
}

function hydrateFilters() {
  const categories = [
    ...new Set(state.catalog.extensions.map((extension) => extension.category)),
  ].sort();
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = categoryLabels[category] || category;
    categorySelect.append(option);
  }

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    renderCatalog();
  });
  categorySelect.addEventListener("change", () => {
    state.category = categorySelect.value;
    renderCatalog();
  });
}

function renderCatalog() {
  const query = state.query.trim().toLowerCase();
  const extensions = state.catalog.extensions.filter((extension) => {
    const categoryMatches =
      state.category === "all" || extension.category === state.category;
    const queryMatches =
      !query ||
      [
        extension.name,
        extension.description,
        extension.author,
        extension.category,
        ...extension.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    return categoryMatches && queryMatches;
  });

  catalogGrid.replaceChildren();
  if (!extensions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No extensions match the current filter.";
    catalogGrid.append(empty);
    return;
  }

  for (const extension of extensions) {
    catalogGrid.append(renderCard(extension));
  }
}

function renderCard(extension) {
  const card = document.createElement("article");
  card.className = "extension-card";
  card.innerHTML = `
    <div class="card-top">
      <div class="extension-mark" aria-hidden="true">${escapeHtml(initials(extension.name))}</div>
      <div class="card-title">
        <strong>${escapeHtml(extension.name)}</strong>
        <span>${escapeHtml(kindLabel(extension.kind))} - ${escapeHtml(extension.author)} - v${escapeHtml(extension.version)}</span>
      </div>
      <span class="category-pill">${escapeHtml(categoryLabels[extension.category] || extension.category)}</span>
    </div>
    <p>${escapeHtml(extension.description)}</p>
    <div class="tag-list">${extension.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    <div class="summary-row">${summaryItems(extension).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    <div class="card-actions">
      <a href="/extensions/${encodeURIComponent(extension.id)}/">Details</a>
      <button class="copy-button" type="button" data-copy-id="${escapeHtml(extension.id)}">Copy ID</button>
      ${extension.repository ? `<a href="${escapeHtml(extension.repository)}">Repository</a>` : ""}
    </div>
  `;
  card.querySelector("[data-copy-id]").addEventListener("click", async () => {
    await copyText(extension.id);
  });
  return card;
}

function renderDetail() {
  const id = decodeURIComponent(
    window.location.pathname.split("/").filter(Boolean).at(-1) || "",
  );
  const extension = state.catalog.extensions.find((item) => item.id === id);
  if (!extension) {
    detailRoot.classList.add("error-state");
    detailRoot.textContent = "Extension not found in the public catalog.";
    return;
  }

  document.title = `${extension.name} - LatexDo Store`;
  detailRoot.innerHTML = `
    <div class="detail-heading">
      <div>
        <h1>${escapeHtml(extension.name)}</h1>
        <div class="detail-meta">
          <span>${escapeHtml(kindLabel(extension.kind))}</span>
          <span>${escapeHtml(extension.author)}</span>
          <span>v${escapeHtml(extension.version)}</span>
          <span>${escapeHtml(categoryLabels[extension.category] || extension.category)}</span>
        </div>
      </div>
      <button class="copy-button" type="button" data-copy-id="${escapeHtml(extension.id)}">Copy extension ID</button>
    </div>
    <p>${escapeHtml(extension.description)}</p>
    <div class="tag-list">${extension.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    <div class="detail-section">
      <h2>Contributions</h2>
      <div class="summary-row">${summaryItems(extension).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    ${renderFeatureFlags(extension)}
    ${renderSnippets(extension)}
    ${renderTemplates(extension)}
    <div class="card-actions">
      <a href="/extensions/catalog.json">Catalog JSON</a>
      ${extension.repository ? `<a href="${escapeHtml(extension.repository)}">Repository</a>` : ""}
      <a href="/">Back to catalog</a>
    </div>
  `;
  detailRoot.querySelector("[data-copy-id]").addEventListener("click", async () => {
    await copyText(extension.id);
  });
}

function renderFeatureFlags(extension) {
  const flags = Object.keys(extension.contributes.featureFlags || {});
  if (!flags.length) return "";
  return `
    <div class="detail-section">
      <h2>Feature flags</h2>
      <div class="tag-list">${flags.map((flag) => `<span>${escapeHtml(flag)}</span>`).join("")}</div>
    </div>
  `;
}

function renderSnippets(extension) {
  const snippets = extension.contributes.snippets || [];
  if (!snippets.length) return "";
  return `
    <div class="detail-section">
      <h2>Snippets</h2>
      <div class="snippet-list">
        ${snippets
          .map(
            (snippet) => `
              <article>
                <div class="summary-row"><span>${escapeHtml(snippet.label)}</span>${snippet.detail ? `<span>${escapeHtml(snippet.detail)}</span>` : ""}</div>
                <code>${escapeHtml(snippet.insertText)}</code>
              </article>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderTemplates(extension) {
  const templates = extension.contributes.templates || [];
  if (!templates.length) return "";
  return `
    <div class="detail-section">
      <h2>Templates</h2>
      <div class="snippet-list">
        ${templates
          .map(
            (template) => `
              <article>
                <div class="summary-row"><span>${escapeHtml(template.name)}</span><span>${escapeHtml(template.files)}</span></div>
                <p>${escapeHtml(template.summary)}</p>
                <code>${escapeHtml(template.mainTex)}</code>
              </article>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function summaryItems(extension) {
  const flags = Object.keys(extension.contributes.featureFlags || {}).length;
  const snippets = (extension.contributes.snippets || []).length;
  const templates = (extension.contributes.templates || []).length;
  return [
    flags ? `${flags} feature toggle${flags === 1 ? "" : "s"}` : "",
    snippets ? `${snippets} snippet${snippets === 1 ? "" : "s"}` : "",
    templates ? `${templates} template${templates === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
}

function kindLabel(kind) {
  return kind === "template" ? "Template" : "Extension";
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

async function copyText(text) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderError(message) {
  const target = catalogGrid || detailRoot || document.body;
  const error = document.createElement("div");
  error.className = "error-state";
  error.textContent = message;
  target.replaceChildren(error);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
