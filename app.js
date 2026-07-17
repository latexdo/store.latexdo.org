const categoryLabels = {
  bibliography: "Bibliography",
  checking: "Checking",
  graphics: "Graphics",
  templates: "Templates",
  workflow: "Workflow",
  writing: "Writing",
};

const featureFlagOptions = [
  {
    group: "Bibliography",
    flags: [
      ["projectBibliographyEnabled", "Citation Manager"],
      ["citationAssistantEnabled", "Citation diagnostics"],
      ["detectMissingCitations", "Missing citations"],
      ["detectUnusedEntries", "Unused BibTeX entries"],
      ["detectDuplicateReferences", "Duplicate references"],
      ["detectBrokenLinks", "Broken reference links"],
      ["suggestCitationKeys", "Citation key suggestions"],
      ["importMetadataSources", "DOI and arXiv imports"],
      ["warnOldCitations", "Older citation warnings"],
      ["checkUncitedCitations", "Uncited bibliography checks"],
      ["checkSectionsWithNoCitations", "Section citation checks"],
    ],
  },
  {
    group: "Figures and tables",
    flags: [
      ["tableGeneratorEnabled", "Table Generator"],
      ["tikzConverterEnabled", "Figure to TikZ Converter"],
      ["tikzConverterAutoOpen", "Open converter from clipboard images"],
      ["checkFigureReferences", "Figure reference checks"],
      ["checkTableReferences", "Table reference checks"],
      ["checkUnreferencedFigures", "Unreferenced figure checks"],
    ],
  },
  {
    group: "Writing and notation",
    flags: [
      ["notationManagerEnabled", "Notation Manager"],
      ["detectNotation", "Notation detection"],
      ["detectNotationConflicts", "Notation conflict checks"],
      ["detectUndefinedNotation", "Undefined notation checks"],
      ["structureAssistantEnabled", "Structure assistant"],
      ["acronymManagerEnabled", "Acronym Manager"],
      ["checkUndefinedAcronym", "Undefined acronym checks"],
    ],
  },
  {
    group: "Submission and quality",
    flags: [
      ["conferenceCheckerEnabled", "Conference Checker"],
      ["pdfComplianceEnabled", "PDF compliance report"],
      ["errorDoctorEnabled", "LaTeX Error Doctor"],
      ["reproducibilityEnabled", "Reproducibility checklist"],
      ["checkEmbeddedFonts", "Embedded font checks"],
      ["checkPageCount", "Page count checks"],
      ["checkType3Fonts", "Type 3 font checks"],
      ["checkAbstractWordCount", "Abstract word count checks"],
      ["checkCodeLink", "Code availability checks"],
      ["checkDatasetLink", "Dataset availability checks"],
      ["checkLicenseMentioned", "License checks"],
      ["checkHyperparameters", "Hyperparameter checks"],
      ["checkHardwareDetails", "Hardware detail checks"],
      ["checkRandomSeeds", "Random seed checks"],
      ["checkEvaluationMetrics", "Evaluation metric checks"],
      ["explainErrors", "Error explanations"],
      ["suggestFixes", "Error fix suggestions"],
      ["autoFixCommon", "Common error auto-fixes"],
    ],
  },
];
const supportedFeatureFlags = new Set(
  featureFlagOptions.flatMap((group) => group.flags.map(([flag]) => flag)),
);

const state = {
  catalog: null,
  query: "",
  category: "all",
  builder: {
    kind: "extension",
    name: "",
    id: "",
    version: "1.0.0",
    description: "",
    author: "",
    category: "writing",
    tags: "",
    repository: "",
    idEdited: false,
    featureFlags: new Set(),
    snippets: [],
    templates: [],
  },
};

const catalogGrid = document.querySelector("[data-catalog-grid]");
const detailRoot = document.querySelector("[data-extension-detail]");
const builderRoot = document.querySelector("[data-extension-builder]");
const searchInput = document.querySelector("[data-search]");
const categorySelect = document.querySelector("[data-category]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinksMenu = document.querySelector("[data-nav-links]");
const copyrightYear = document.querySelector("#copyright-year");

if (copyrightYear) {
  copyrightYear.textContent = String(new Date().getFullYear());
}

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
  try {
    const response = await fetch("/extensions/catalog.json", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Catalog request failed with HTTP ${response.status}.`);
    }

    state.catalog = await response.json();
  } catch (error) {
    if (!builderRoot) {
      throw error;
    }
    state.catalog = {
      schemaVersion: 1,
      product: "LatexDo",
      updatedAt: new Date().toISOString(),
      extensions: [],
    };
  }

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
  if (builderRoot) {
    renderBuilder();
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

function renderBuilder() {
  document.title = "Extension Builder - LatexDo Store";
  builderRoot.innerHTML = `
    <section class="builder-heading">
      <div>
        <h1>Extension Builder</h1>
        <p>Create a store-ready LatexDo manifest without TypeScript.</p>
      </div>
      <div class="builder-heading-actions">
        <a class="submit-link" href="/CONTRIBUTING.md">Submission guide</a>
        <a class="copy-button" href="/">Store catalog</a>
      </div>
    </section>

    <div class="builder-grid">
      <form class="builder-form" data-builder-form>
        <section class="builder-panel">
          <div class="builder-panel-heading">
            <h2>Identity</h2>
            <span data-builder-id-preview>extensions/community.pack/</span>
          </div>
          <div class="builder-two">
            ${renderBuilderField("name", "Name", "Research Writing Pack")}
            ${renderBuilderField("id", "Extension ID", "community.research-pack")}
          </div>
          <div class="builder-two">
            ${renderBuilderField("version", "Version", "1.0.0")}
            <label class="builder-field">
              <span>Kind</span>
              <select data-builder-field="kind">
                <option value="extension">Extension</option>
                <option value="template">Template</option>
              </select>
            </label>
          </div>
          <div class="builder-two">
            ${renderBuilderField("author", "Author", "Your name")}
            <label class="builder-field">
              <span>Category</span>
              <select data-builder-field="category">
                ${Object.entries(categoryLabels)
                  .map(
                    ([category, label]) =>
                      `<option value="${category}">${escapeHtml(label)}</option>`,
                  )
                  .join("")}
              </select>
            </label>
          </div>
          <label class="builder-field">
            <span>Description</span>
            <textarea data-builder-field="description" rows="3" placeholder="A concise summary users will see in the store."></textarea>
          </label>
          <div class="builder-two">
            ${renderBuilderField("tags", "Tags", "writing, snippets, research")}
            ${renderBuilderField("repository", "Repository URL", "https://github.com/you/pack")}
          </div>
        </section>

        <section class="builder-panel">
          <div class="builder-panel-heading">
            <h2>Feature Toggles</h2>
            <span data-builder-flag-count>0 selected</span>
          </div>
          <div class="flag-groups">
            ${featureFlagOptions.map(renderBuilderFlagGroup).join("")}
          </div>
        </section>

        <section class="builder-panel">
          <div class="builder-panel-heading">
            <h2>Snippets</h2>
            <button class="copy-button" type="button" data-builder-action="add-snippet">Add snippet</button>
          </div>
          <div class="builder-repeat-list" data-builder-snippets></div>
        </section>

        <section class="builder-panel">
          <div class="builder-panel-heading">
            <h2>Templates</h2>
            <button class="copy-button" type="button" data-builder-action="add-template">Add template</button>
          </div>
          <div class="builder-repeat-list" data-builder-templates></div>
        </section>
      </form>

      <aside class="builder-preview" aria-label="Generated extension">
        <div class="builder-preview-header">
          <div>
            <h2>Generated Manifest</h2>
            <span data-builder-status></span>
          </div>
          <div class="builder-actions">
            <button class="copy-button" type="button" data-builder-output="copy-manifest">Copy JSON</button>
            <button class="copy-button" type="button" data-builder-output="download-manifest">Download JSON</button>
            <button class="copy-button" type="button" data-builder-output="download-page">Download page</button>
          </div>
        </div>
        <div class="builder-errors" data-builder-errors></div>
        <pre class="builder-code" data-builder-json></pre>
      </aside>
    </div>
  `;

  const kindSelect = builderRoot.querySelector('[data-builder-field="kind"]');
  const categorySelectElement = builderRoot.querySelector(
    '[data-builder-field="category"]',
  );
  kindSelect.value = state.builder.kind;
  categorySelectElement.value = state.builder.category;

  renderBuilderRepeaters();
  attachBuilderEvents();
  updateBuilderPreview();
}

function renderBuilderField(key, label, placeholder) {
  return `
    <label class="builder-field">
      <span>${escapeHtml(label)}</span>
      <input data-builder-field="${key}" value="${escapeHtml(
        state.builder[key] || "",
      )}" placeholder="${escapeHtml(placeholder)}" />
    </label>
  `;
}

function renderBuilderFlagGroup(group) {
  return `
    <section class="flag-group">
      <h3>${escapeHtml(group.group)}</h3>
      <div class="flag-grid">
        ${group.flags
          .map(
            ([flag, label]) => `
              <label class="flag-option">
                <input type="checkbox" data-builder-flag="${escapeHtml(flag)}" />
                <span>${escapeHtml(label)}</span>
              </label>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function attachBuilderEvents() {
  const form = builderRoot.querySelector("[data-builder-form]");
  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const field = target.getAttribute("data-builder-field");
    if (field) {
      updateBuilderField(field, target.value);
      return;
    }

    const repeat = target.getAttribute("data-builder-repeat");
    if (repeat) {
      const index = Number(target.getAttribute("data-builder-index"));
      const key = target.getAttribute("data-builder-key");
      if (Number.isInteger(index) && key && state.builder[repeat]?.[index]) {
        state.builder[repeat][index][key] = target.value;
        updateBuilderPreview();
      }
    }
  });

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const flag = target.getAttribute("data-builder-flag");
    if (!flag) return;

    if (target.checked) {
      state.builder.featureFlags.add(flag);
    } else {
      state.builder.featureFlags.delete(flag);
    }
    updateBuilderPreview();
  });

  form.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const actionTarget = target.closest("[data-builder-action]");
    if (!(actionTarget instanceof HTMLElement)) return;

    const action = actionTarget.getAttribute("data-builder-action");
    handleBuilderAction(action, actionTarget);
  });

  builderRoot.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const outputTarget = target.closest("[data-builder-output]");
    if (!(outputTarget instanceof HTMLElement)) return;

    await handleBuilderOutput(outputTarget.getAttribute("data-builder-output"));
  });
}

function updateBuilderField(field, value) {
  if (field === "id") {
    state.builder.idEdited = true;
  }
  state.builder[field] = value;

  if (field === "name" && !state.builder.idEdited) {
    state.builder.id = value ? `community.${slugify(value)}` : "";
    const idInput = builderRoot.querySelector('[data-builder-field="id"]');
    if (idInput) idInput.value = state.builder.id;
  }

  updateBuilderPreview();
}

function handleBuilderAction(action, actionTarget) {
  switch (action) {
    case "add-snippet":
      state.builder.snippets.push(createSnippet());
      break;
    case "add-template":
      state.builder.templates.push(createTemplate());
      state.builder.kind = "template";
      state.builder.category = "templates";
      syncSelectValue("kind", state.builder.kind);
      syncSelectValue("category", state.builder.category);
      break;
    case "remove-snippet":
      state.builder.snippets.splice(Number(actionTarget.dataset.index), 1);
      break;
    case "remove-template":
      state.builder.templates.splice(Number(actionTarget.dataset.index), 1);
      break;
    default:
      return;
  }

  renderBuilderRepeaters();
  updateBuilderPreview();
}

function syncSelectValue(field, value) {
  const select = builderRoot.querySelector(`[data-builder-field="${field}"]`);
  if (select) select.value = value;
}

function renderBuilderRepeaters() {
  const snippetsRoot = builderRoot.querySelector("[data-builder-snippets]");
  const templatesRoot = builderRoot.querySelector("[data-builder-templates]");

  snippetsRoot.innerHTML = state.builder.snippets.length
    ? state.builder.snippets.map(renderSnippetEditor).join("")
    : `<div class="builder-empty">No snippets added.</div>`;

  templatesRoot.innerHTML = state.builder.templates.length
    ? state.builder.templates.map(renderTemplateEditor).join("")
    : `<div class="builder-empty">No templates added.</div>`;
}

function renderSnippetEditor(snippet, index) {
  return `
    <article class="builder-repeat-item">
      <div class="repeat-heading">
        <strong>Snippet ${index + 1}</strong>
        <button class="copy-button danger-button" type="button" data-builder-action="remove-snippet" data-index="${index}">Remove</button>
      </div>
      <div class="builder-two">
        ${renderRepeatInput("snippets", index, "label", "Label", snippet.label)}
        ${renderRepeatInput("snippets", index, "detail", "Detail", snippet.detail)}
      </div>
      ${renderRepeatInput(
        "snippets",
        index,
        "documentation",
        "Documentation",
        snippet.documentation,
      )}
      ${renderRepeatTextarea(
        "snippets",
        index,
        "insertText",
        "Insert text",
        snippet.insertText,
        4,
      )}
    </article>
  `;
}

function renderTemplateEditor(template, index) {
  return `
    <article class="builder-repeat-item">
      <div class="repeat-heading">
        <strong>Template ${index + 1}</strong>
        <button class="copy-button danger-button" type="button" data-builder-action="remove-template" data-index="${index}">Remove</button>
      </div>
      <div class="builder-two">
        ${renderRepeatInput("templates", index, "id", "Template ID", template.id)}
        ${renderRepeatInput("templates", index, "name", "Name", template.name)}
      </div>
      <div class="builder-two">
        ${renderRepeatInput("templates", index, "files", "Files", template.files)}
        ${renderRepeatInput("templates", index, "summary", "Summary", template.summary)}
      </div>
      ${renderRepeatTextarea(
        "templates",
        index,
        "mainTex",
        "main.tex",
        template.mainTex,
        8,
      )}
      ${renderRepeatTextarea(
        "templates",
        index,
        "bibTex",
        "Optional BibTeX",
        template.bibTex,
        4,
      )}
    </article>
  `;
}

function renderRepeatInput(repeat, index, key, label, value) {
  return `
    <label class="builder-field">
      <span>${escapeHtml(label)}</span>
      <input data-builder-repeat="${repeat}" data-builder-index="${index}" data-builder-key="${key}" value="${escapeHtml(value || "")}" />
    </label>
  `;
}

function renderRepeatTextarea(repeat, index, key, label, value, rows) {
  return `
    <label class="builder-field">
      <span>${escapeHtml(label)}</span>
      <textarea data-builder-repeat="${repeat}" data-builder-index="${index}" data-builder-key="${key}" rows="${rows}">${escapeHtml(value || "")}</textarea>
    </label>
  `;
}

function updateBuilderPreview() {
  const manifest = buildBuilderManifest();
  const validation = validateBuilderManifest(manifest);
  const manifestJson = JSON.stringify(manifest, null, 2);
  const status = builderRoot.querySelector("[data-builder-status]");
  const errors = builderRoot.querySelector("[data-builder-errors]");
  const json = builderRoot.querySelector("[data-builder-json]");
  const flagCount = builderRoot.querySelector("[data-builder-flag-count]");
  const idPreview = builderRoot.querySelector("[data-builder-id-preview]");

  flagCount.textContent = `${state.builder.featureFlags.size} selected`;
  idPreview.textContent = manifest.id
    ? `extensions/${manifest.id}/`
    : "extensions/community.pack/";
  json.textContent = manifestJson;
  status.textContent = validation.errors.length
    ? `${validation.errors.length} issue${validation.errors.length === 1 ? "" : "s"}`
    : "Ready";
  status.className = validation.errors.length ? "builder-status bad" : "builder-status ok";
  errors.innerHTML = validation.errors.length
    ? `<ul>${validation.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`
    : `<div class="builder-ready">Manifest and detail page are ready.</div>`;

  for (const button of builderRoot.querySelectorAll("[data-builder-output]")) {
    button.disabled = validation.errors.length > 0;
  }
}

function buildBuilderManifest() {
  const id = state.builder.id.trim();
  const manifest = {
    schemaVersion: 1,
    id,
    kind: state.builder.kind,
    name: state.builder.name.trim(),
    version: state.builder.version.trim() || "1.0.0",
    description: state.builder.description.trim(),
    author: state.builder.author.trim(),
    category: state.builder.category,
    tags: parseTags(state.builder.tags),
    homepage: id ? `https://store.latexdo.org/extensions/${id}/` : "",
    contributes: {},
  };

  const repository = state.builder.repository.trim();
  if (repository) {
    manifest.repository = repository;
  }

  if (state.builder.featureFlags.size) {
    manifest.contributes.featureFlags = Object.fromEntries(
      [...state.builder.featureFlags].sort().map((flag) => [flag, true]),
    );
  }

  const snippets = state.builder.snippets
    .map((snippet) => ({
      label: snippet.label.trim(),
      insertText: snippet.insertText,
      ...(snippet.detail.trim() ? { detail: snippet.detail.trim() } : {}),
      ...(snippet.documentation.trim()
        ? { documentation: snippet.documentation.trim() }
        : {}),
    }))
    .filter((snippet) => snippet.label || snippet.insertText);
  if (snippets.length) {
    manifest.contributes.snippets = snippets;
  }

  const templates = state.builder.templates
    .map((template) => ({
      id: template.id.trim(),
      name: template.name.trim(),
      summary: template.summary.trim(),
      files: template.files.trim(),
      mainTex: template.mainTex,
      ...(template.bibTex.trim() ? { bibTex: template.bibTex } : {}),
    }))
    .filter((template) => template.id || template.name || template.mainTex);
  if (templates.length) {
    manifest.contributes.templates = templates;
  }

  return manifest;
}

function validateBuilderManifest(manifest) {
  const errors = [];
  const existingIds = new Set((state.catalog?.extensions || []).map((item) => item.id));
  const idPattern = /^[a-z0-9][a-z0-9.-]{2,80}$/;
  const versionPattern = /^[0-9]+(?:\.[0-9]+){0,2}(?:[-+][a-z0-9.-]+)?$/i;

  if (!idPattern.test(manifest.id)) {
    errors.push("Extension ID must look like author.pack-name.");
  } else if (existingIds.has(manifest.id)) {
    errors.push("Extension ID already exists in the store catalog.");
  }
  if (manifest.name.length < 2) errors.push("Name must have at least 2 characters.");
  if (!versionPattern.test(manifest.version)) errors.push("Version must be semver-like.");
  if (manifest.description.length < 12) {
    errors.push("Description must have at least 12 characters.");
  }
  if (manifest.author.length < 2) errors.push("Author must have at least 2 characters.");
  if (!Object.hasOwn(categoryLabels, manifest.category)) {
    errors.push("Category must be one of the store categories.");
  }
  if (!manifest.tags.length) errors.push("Add at least one tag.");
  if (manifest.repository && !manifest.repository.startsWith("https://")) {
    errors.push("Repository URL must use https.");
  }

  const contributes = manifest.contributes;
  for (const flag of Object.keys(contributes.featureFlags || {})) {
    if (!supportedFeatureFlags.has(flag)) {
      errors.push(`${flag} is not supported by the LatexDo app.`);
    }
  }

  const contributionCount =
    Object.keys(contributes.featureFlags || {}).length +
    (contributes.snippets || []).length +
    (contributes.templates || []).length;
  if (!contributionCount) {
    errors.push("Add at least one feature toggle, snippet, or template.");
  }
  if (manifest.kind === "template" && !(contributes.templates || []).length) {
    errors.push("Template submissions must include at least one template.");
  }

  for (const [index, snippet] of (contributes.snippets || []).entries()) {
    if (snippet.label.length < 2) errors.push(`Snippet ${index + 1} needs a label.`);
    if (!snippet.insertText.trim()) {
      errors.push(`Snippet ${index + 1} needs insert text.`);
    }
  }

  for (const [index, template] of (contributes.templates || []).entries()) {
    if (!/^[a-z0-9][a-z0-9.-]{1,47}$/.test(template.id)) {
      errors.push(`Template ${index + 1} needs a valid template ID.`);
    }
    if (template.name.length < 2) errors.push(`Template ${index + 1} needs a name.`);
    if (template.summary.length < 12) {
      errors.push(`Template ${index + 1} needs a longer summary.`);
    }
    if (!template.mainTex.includes("\\begin{document}")) {
      errors.push(`Template ${index + 1} main.tex must include \\begin{document}.`);
    }
    if (!template.mainTex.includes("\\end{document}")) {
      errors.push(`Template ${index + 1} main.tex must include \\end{document}.`);
    }
  }

  return { errors };
}

async function handleBuilderOutput(action) {
  const manifest = buildBuilderManifest();
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;

  switch (action) {
    case "copy-manifest":
      await copyText(manifestJson);
      break;
    case "download-manifest":
      downloadText(`${manifest.id || "latexdo-extension"}.json`, manifestJson);
      break;
    case "download-page":
      downloadText("index.html", buildExtensionDetailPageHtml(), "text/html");
      break;
  }
}

function buildExtensionDetailPageHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LatexDo Store Extension</title>
    <link rel="icon" href="/assets/icon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <header class="site-header" data-header>
      <nav class="nav-shell" aria-label="Primary navigation">
        <a class="brand" href="https://latexdo.org" aria-label="LatexDo home">
          <img src="/assets/icon.svg" alt="" width="36" height="36" />
          <span>LatexDo</span>
        </a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-links" data-nav-toggle>
          <span></span>
          <span></span>
        </button>
        <div id="nav-links" class="nav-links" data-nav-links>
          <a href="https://latexdo.org/downloads/">Download</a>
          <a href="https://editor.latexdo.org">Editor</a>
          <a href="https://latexdo.org/cli/">CLI</a>
          <a href="https://latexdo.org/about/">About</a>
          <a href="https://docs.latexdo.org">Docs</a>
          <a href="https://store.latexdo.org">Store</a>
          <a href="/builder/">Builder</a>
          <a class="nav-donate-link" href="https://latexdo.org/donations/">Donate</a>
        </div>
      </nav>
    </header>
    <main><section class="extension-detail" data-extension-detail></section></main>
    <script src="/app.js" type="module"></script>
  </body>
</html>
`;
}

function createSnippet() {
  return {
    label: "claim",
    detail: "Claim paragraph",
    documentation: "Adds a short claim paragraph.",
    insertText: "\\paragraph{Claim.} ${0:Write the claim.}",
  };
}

function createTemplate() {
  return {
    id: "starter",
    name: "Starter Document",
    summary: "A minimal editable LaTeX starter document.",
    files: "main.tex",
    mainTex:
      "\\documentclass{article}\n\\begin{document}\nStart writing here.\n\\end{document}\n",
    bibTex: "",
  };
}

function parseTags(value) {
  return value
    .split(/[,;\n]/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function downloadText(filename, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
