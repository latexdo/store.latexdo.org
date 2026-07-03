# Deploy

The store deploys as Cloudflare Workers static assets.

## Local Deploy

```sh
npm run deploy
```

Wrangler runs `npm run build` from `wrangler.jsonc` and uploads `dist/`.

```sh
npm run build
npx wrangler deploy
```

The second form is equivalent when dependencies are installed.

## Cloudflare Git Deploy

Cloudflare deploys the store from the connected GitHub repository. GitHub Actions does not run the production deploy and does not need Cloudflare API secrets.

The Worker route is configured as `store.latexdo.org/*` under the `latexdo.org` zone.
