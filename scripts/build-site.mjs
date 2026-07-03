import { cp, mkdir, rm } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
const files = [
  "CNAME",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "app.js",
  "index.html",
  "style.css",
];
const directories = ["assets", "extensions"];

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
