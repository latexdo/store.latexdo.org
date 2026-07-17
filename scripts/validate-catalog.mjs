import { readFile } from "node:fs/promises";

const catalogPath = new URL("../extensions/catalog.json", import.meta.url);
const idPattern = /^[a-z0-9][a-z0-9.-]{2,80}$/;
const versionPattern = /^[0-9]+(?:\.[0-9]+){0,2}(?:[-+][a-z0-9.-]+)?$/i;
const categories = new Set([
  "bibliography",
  "checking",
  "graphics",
  "templates",
  "workflow",
  "writing",
]);
const kinds = new Set(["extension", "template"]);
const templateIdPattern = /^[a-z0-9][a-z0-9.-]{1,47}$/;
const featureFlags = new Set([
  "acronymManagerEnabled",
  "autoFixCommon",
  "checkAbstractWordCount",
  "checkCodeLink",
  "checkDatasetLink",
  "checkEmbeddedFonts",
  "checkEvaluationMetrics",
  "checkFigureReferences",
  "checkHardwareDetails",
  "checkHyperparameters",
  "checkLicenseMentioned",
  "checkPageCount",
  "checkRandomSeeds",
  "checkSectionsWithNoCitations",
  "checkTableReferences",
  "checkType3Fonts",
  "checkUncitedCitations",
  "checkUndefinedAcronym",
  "checkUnreferencedFigures",
  "citationAssistantEnabled",
  "conferenceCheckerEnabled",
  "detectBrokenLinks",
  "detectDuplicateReferences",
  "detectMissingCitations",
  "detectNotation",
  "detectNotationConflicts",
  "detectUndefinedNotation",
  "detectUnusedEntries",
  "errorDoctorEnabled",
  "explainErrors",
  "importMetadataSources",
  "notationManagerEnabled",
  "pdfComplianceEnabled",
  "projectBibliographyEnabled",
  "reproducibilityEnabled",
  "structureAssistantEnabled",
  "suggestCitationKeys",
  "suggestFixes",
  "tableGeneratorEnabled",
  "tikzConverterAutoOpen",
  "tikzConverterEnabled",
  "warnOldCitations",
]);

const errors = [];
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

if (catalog.schemaVersion !== 1) error("catalog.schemaVersion must be 1");
if (catalog.product !== "LatexDo") error('catalog.product must be "LatexDo"');
if (!Array.isArray(catalog.extensions)) error("catalog.extensions must be an array");
if (Number.isNaN(new Date(catalog.updatedAt).getTime())) {
  error("catalog.updatedAt must be an ISO date");
}

const ids = new Set();
for (const [index, extension] of (catalog.extensions || []).entries()) {
  const base = `extensions[${index}]`;
  requireString(extension.id, `${base}.id`, 3, 80);
  if (!idPattern.test(extension.id || "")) error(`${base}.id is invalid`);
  if (ids.has(extension.id)) error(`${base}.id duplicates ${extension.id}`);
  ids.add(extension.id);

  if (!kinds.has(extension.kind)) error(`${base}.kind must be extension or template`);
  requireString(extension.name, `${base}.name`, 2, 80);
  requireString(extension.version, `${base}.version`, 1, 40);
  if (!versionPattern.test(extension.version || "")) {
    error(`${base}.version must be semver-like`);
  }
  requireString(extension.description, `${base}.description`, 12, 260);
  requireString(extension.author, `${base}.author`, 2, 80);
  if (!categories.has(extension.category)) error(`${base}.category is invalid`);
  if (!Array.isArray(extension.tags) || extension.tags.length > 8) {
    error(`${base}.tags must be an array with at most 8 items`);
  }
  for (const tag of extension.tags || []) {
    requireString(tag, `${base}.tags[]`, 1, 28);
  }
  optionalHttps(extension.homepage, `${base}.homepage`);
  optionalHttps(extension.repository, `${base}.repository`);

  if (!extension.contributes || typeof extension.contributes !== "object") {
    error(`${base}.contributes is required`);
    continue;
  }

  const flags = extension.contributes.featureFlags || {};
  const snippets = extension.contributes.snippets || [];
  const templates = extension.contributes.templates || [];
  if (!Object.keys(flags).length && !snippets.length && !templates.length) {
    error(`${base}.contributes must include featureFlags, snippets, or templates`);
  }

  for (const [flag, value] of Object.entries(flags)) {
    if (!featureFlags.has(flag)) error(`${base}.contributes.featureFlags.${flag} is not allowed`);
    if (typeof value !== "boolean") error(`${base}.contributes.featureFlags.${flag} must be boolean`);
  }

  if (!Array.isArray(snippets) || snippets.length > 40) {
    error(`${base}.contributes.snippets must be an array with at most 40 items`);
  }
  for (const [snippetIndex, snippet] of (snippets || []).entries()) {
    const snippetBase = `${base}.contributes.snippets[${snippetIndex}]`;
    requireString(snippet.label, `${snippetBase}.label`, 2, 48);
    requireString(snippet.insertText, `${snippetBase}.insertText`, 1, 4000);
    if (snippet.detail !== undefined) {
      requireString(snippet.detail, `${snippetBase}.detail`, 1, 120);
    }
    if (snippet.documentation !== undefined) {
      requireString(snippet.documentation, `${snippetBase}.documentation`, 1, 500);
    }
  }

  if (!Array.isArray(templates) || templates.length > 12) {
    error(`${base}.contributes.templates must be an array with at most 12 items`);
  }
  for (const [templateIndex, template] of (templates || []).entries()) {
    const templateBase = `${base}.contributes.templates[${templateIndex}]`;
    requireString(template.id, `${templateBase}.id`, 2, 48);
    if (!templateIdPattern.test(template.id || "")) {
      error(`${templateBase}.id is invalid`);
    }
    requireString(template.name, `${templateBase}.name`, 2, 80);
    requireString(template.summary, `${templateBase}.summary`, 12, 220);
    requireString(template.files, `${templateBase}.files`, 3, 120);
    requireString(template.mainTex, `${templateBase}.mainTex`, 20, 12000);
    if (!/\\begin\{document\}/.test(template.mainTex || "")) {
      error(`${templateBase}.mainTex must contain \\begin{document}`);
    }
    if (!/\\end\{document\}/.test(template.mainTex || "")) {
      error(`${templateBase}.mainTex must contain \\end{document}`);
    }
    if (template.bibTex !== undefined) {
      requireString(template.bibTex, `${templateBase}.bibTex`, 1, 8000);
    }
  }
}

if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Validated ${catalog.extensions.length} LatexDo extensions.`);

function requireString(value, label, minLength, maxLength) {
  if (
    typeof value !== "string" ||
    value.trim().length < minLength ||
    value.length > maxLength
  ) {
    error(`${label} must be a string from ${minLength} to ${maxLength} characters`);
  }
}

function optionalHttps(value, label) {
  if (value === undefined) return;
  requireString(value, label, 8, 300);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") error(`${label} must use https`);
  } catch {
    error(`${label} must be a valid URL`);
  }
}

function error(message) {
  errors.push(message);
}
