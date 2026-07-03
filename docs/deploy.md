# Deploy

The store deploys as Cloudflare Workers static assets.

## Local Deploy

```sh
npm run build
npx wrangler deploy
```

Or:

```sh
npm run deploy
```

`npm run build` validates the catalog and prepares `dist/`. Wrangler reads `wrangler.jsonc` and uploads `dist/`.

## GitHub Actions Deploy

`.github/workflows/deploy.yml` runs after merges to `main`.

Required repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Worker route is configured as `store.latexdo.org/*` under the `latexdo.org` zone.
