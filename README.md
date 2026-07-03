# store.latexdo.org

Static extension and template catalog for LatexDo at `https://store.latexdo.org`.

The LatexDo app reads `extensions/catalog.json`, validates each manifest, and lets users install safe manifest-based packs. Store submissions can enable existing LatexDo feature flags, contribute Monaco LaTeX snippets, and publish project templates. They do not run arbitrary JavaScript inside the editor.

## Local Workflow

```sh
npm install
npm run build
npm run dev
```

Open `http://127.0.0.1:4176` after starting the dev server.

## Deploy

The Cloudflare Workers deployment is configured in `wrangler.jsonc`.

```sh
npm run build
npx wrangler deploy
```

`npm run deploy` runs the same sequence. GitHub Actions also deploys on pushes to `main` with `npx wrangler deploy`; configure these repository secrets first:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Repository Layout

- `index.html`, `style.css`, `app.js`: static store website.
- `extensions/catalog.json`: public catalog consumed by LatexDo.
- `extensions/schema.json`: catalog JSON schema for contributors.
- `extensions/<extension-id>/index.html`: detail page shells rendered from the catalog.
- `scripts/validate-catalog.mjs`: dependency-free catalog validator.
- `.github/workflows/validate-pr.yml`: PR verification bot.
- `.github/workflows/pr-bot.yml`: PR comment bot that asks for maintainer approval.
- `.github/workflows/deploy.yml`: Cloudflare Workers deploy using Wrangler.
- `wrangler.jsonc`: Worker route and static asset deployment config.

## Add An Extension

Read [CONTRIBUTING.md](CONTRIBUTING.md). In short:

1. Add a manifest entry to `extensions/catalog.json`.
2. Add a detail page folder under `extensions/<your-extension-id>/`.
3. Run `npm run build`.
4. Open a pull request.

GitHub Actions validates the PR. CODEOWNERS requires `@omarabedelkader` approval before merge; see [docs/branch-protection.md](docs/branch-protection.md).
