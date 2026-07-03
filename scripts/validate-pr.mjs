import { access, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const catalogPath = new URL("../extensions/catalog.json", import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const errors = [];
const warnings = [];

for (const extension of catalog.extensions || []) {
  await validateExtensionPage(extension);
  validateHomepage(extension);
  validateKindContributions(extension);
}

validateChangedFiles();

if (warnings.length) {
  console.warn(warnings.map((item) => `- ${item}`).join("\n"));
}

if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("PR policy validation passed.");

async function validateExtensionPage(extension) {
  const pagePath = new URL(
    `../extensions/${encodeURIComponent(extension.id)}/index.html`,
    import.meta.url,
  );
  try {
    await access(pagePath);
  } catch {
    errors.push(`${extension.id} must have extensions/${extension.id}/index.html`);
  }
}

function validateHomepage(extension) {
  if (
    extension.homepage !==
    `https://store.latexdo.org/extensions/${extension.id}/`
  ) {
    errors.push(
      `${extension.id}.homepage must be https://store.latexdo.org/extensions/${extension.id}/`,
    );
  }
}

function validateKindContributions(extension) {
  const templates = extension.contributes?.templates || [];
  const featureFlags = extension.contributes?.featureFlags || {};
  const snippets = extension.contributes?.snippets || [];

  if (extension.kind === "template" && templates.length === 0) {
    errors.push(`${extension.id} is kind=template but contributes no templates`);
  }
  if (extension.kind === "extension" && templates.length > 0) {
    warnings.push(`${extension.id} is kind=extension but also contributes templates`);
  }
  if (Object.keys(featureFlags).length > 0 || snippets.length > 0 || templates.length > 0) {
    return;
  }
  errors.push(`${extension.id} has no installable contributions`);
}

function validateChangedFiles() {
  const baseRef = process.env.GITHUB_BASE_REF;
  if (!baseRef) {
    return;
  }

  const changedFiles = listChangedFiles(baseRef);
  const allowed = [
    /^extensions\/catalog\.json$/,
    /^extensions\/[a-z0-9][a-z0-9.-]{2,80}\/index\.html$/,
    /^assets\/extensions\/[a-z0-9][a-z0-9.-]{2,80}\//,
    /^README\.md$/,
    /^CONTRIBUTING\.md$/,
  ];

  for (const file of changedFiles) {
    if (!allowed.some((pattern) => pattern.test(file))) {
      warnings.push(
        `${file} is outside the normal extension submission surface and needs owner review.`,
      );
    }
  }
}

function listChangedFiles(baseRef) {
  try {
    execFileSync("git", ["fetch", "--no-tags", "origin", baseRef], {
      stdio: "ignore",
    });
    return execFileSync("git", ["diff", "--name-only", `origin/${baseRef}...HEAD`], {
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    warnings.push("Could not inspect changed files for PR policy.");
    return [];
  }
}
