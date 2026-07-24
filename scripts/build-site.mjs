import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
const dist = process.env.LATEXDO_STORE_DIST_DIR
  ? directoryUrl(process.env.LATEXDO_STORE_DIST_DIR)
  : new URL("../dist/", import.meta.url);

function directoryUrl(value) {
  return pathToFileURL(`${path.resolve(value)}${path.sep}`);
}

const files = [
  "CNAME",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "app.js",
  "index.html",
  "style.css",
];
const directories = ["assets", "builder", "extensions"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of files) {
  await cp(new URL(file, root), new URL(file, dist));
}

for (const directory of directories) {
  await cp(new URL(`${directory}/`, root), new URL(`${directory}/`, dist), {
    recursive: true,
  });
}

console.log("Prepared dist/ for Wrangler deploy.");
