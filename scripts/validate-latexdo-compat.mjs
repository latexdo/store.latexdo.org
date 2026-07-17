import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const catalogPath = new URL("../extensions/catalog.json", import.meta.url);
const defaultLatexDoRoot = fileURLToPath(new URL("../../latexdo/", import.meta.url));
const latexDoRoot = process.env.LATEXDO_APP_ROOT || defaultLatexDoRoot;
const latexDoExtensionsModule = pathToFileURL(
  resolve(latexDoRoot, "src/extensions.ts"),
);
const errors = [];

let validateExtensionCatalog;
try {
  ({ validateExtensionCatalog } = await import(latexDoExtensionsModule.href));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    [
      `Could not load LatexDo extension validator from ${latexDoExtensionsModule.pathname}.`,
      "Set LATEXDO_APP_ROOT to a LatexDo application checkout before running store validation.",
      message,
    ].join("\n"),
  );
  process.exit(1);
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const normalizedCatalog = validateExtensionCatalog(catalog);

if (!normalizedCatalog) {
  errors.push("LatexDo rejected the store catalog root object.");
} else {
  validateCatalogCompatibility(catalog, normalizedCatalog);
}

if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(
  `Validated ${catalog.extensions.length} store extensions against the LatexDo application parser.`,
);

function validateCatalogCompatibility(rawCatalog, normalizedCatalog) {
  const normalizedById = new Map(
    normalizedCatalog.extensions.map((extension) => [extension.id, extension]),
  );

  if (normalizedCatalog.extensions.length !== rawCatalog.extensions.length) {
    errors.push(
      `LatexDo accepted ${normalizedCatalog.extensions.length} of ${rawCatalog.extensions.length} catalog entries.`,
    );
  }

  for (const extension of rawCatalog.extensions || []) {
    const normalized = normalizedById.get(extension.id);
    if (!normalized) {
      errors.push(`${extension.id || "(missing id)"} is rejected by LatexDo.`);
      continue;
    }

    validateContributionCompatibility(extension, normalized);
  }
}

function validateContributionCompatibility(extension, normalized) {
  const rawFeatureFlags = extension.contributes?.featureFlags || {};
  const normalizedFeatureFlags = normalized.contributes.featureFlags || {};
  for (const flag of Object.keys(rawFeatureFlags)) {
    if (!(flag in normalizedFeatureFlags)) {
      errors.push(
        `${extension.id}.contributes.featureFlags.${flag} is not supported by the LatexDo app.`,
      );
    }
  }

  const rawSnippets = extension.contributes?.snippets || [];
  const normalizedSnippets = normalized.contributes.snippets || [];
  if (rawSnippets.length !== normalizedSnippets.length) {
    errors.push(
      `${extension.id}.contributes.snippets contains entries LatexDo would drop.`,
    );
  }

  const rawTemplates = extension.contributes?.templates || [];
  const normalizedTemplates = normalized.contributes.templates || [];
  if (rawTemplates.length !== normalizedTemplates.length) {
    errors.push(
      `${extension.id}.contributes.templates contains entries LatexDo would drop.`,
    );
  }
}
