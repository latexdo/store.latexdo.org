# store.latexdo.org

Static extension and template catalog for LatexDo at `https://store.latexdo.org`.

The LatexDo app reads `extensions/catalog.json`, validates each manifest, and lets users install safe manifest-based packs. Store submissions can enable existing LatexDo feature flags, contribute Monaco LaTeX snippets, and publish project templates. They do not run arbitrary JavaScript inside the editor.

Every store build validates `extensions/catalog.json` with the LatexDo application parser. If you keep the app checkout somewhere other than `../latexdo`, set `LATEXDO_APP_ROOT=/path/to/latexdo` before running validation.

## Local Workflow

```sh
npm install
npm run build
npm run dev
```

Open `http://127.0.0.1:4176` after starting the dev server.

## Deploy

Cloudflare deploys this repository through its GitHub integration. The Workers static assets deployment is configured in `wrangler.jsonc`.

```sh
npm run deploy
```

For local/manual deploys, Wrangler runs the build command from `wrangler.jsonc` before uploading `dist/`.

## Repository Layout

- `index.html`, `style.css`, `app.js`: static store website.
- `extensions/catalog.json`: public catalog consumed by LatexDo.
- `extensions/schema.json`: catalog JSON schema for contributors.
- `extensions/<extension-id>/index.html`: detail page shells rendered from the catalog.
- `scripts/validate-catalog.mjs`: dependency-free catalog validator.
- `scripts/validate-latexdo-compat.mjs`: validates the catalog with the LatexDo app parser.
- `.github/workflows/validate-pr.yml`: PR verification bot.
- `.github/workflows/pr-bot.yml`: PR comment bot that asks for maintainer approval.
- `wrangler.jsonc`: Worker route and static asset deployment config.

## Add An Extension

Read [CONTRIBUTING.md](CONTRIBUTING.md). In short:

1. Add a manifest entry to `extensions/catalog.json`.
2. Add a detail page folder under `extensions/<your-extension-id>/`.
3. Run `npm run build`.
4. Open a pull request.

GitHub Actions validates the PR. CODEOWNERS requires `@omarabedelkader` approval before merge; see [docs/branch-protection.md](docs/branch-protection.md).
