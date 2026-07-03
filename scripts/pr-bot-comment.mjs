const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const eventPath = process.env.GITHUB_EVENT_PATH;

if (!token || !repository || !eventPath) {
  console.log("Skipping PR bot comment outside GitHub Actions.");
  process.exit(0);
}

const event = await readJson(eventPath);
const pullRequest = event.pull_request;
if (!pullRequest) {
  console.log("Skipping PR bot comment because this event has no pull request.");
  process.exit(0);
}

const marker = "<!-- latexdo-store-pr-bot -->";
const body = `${marker}
## LatexDo Store Bot

Thanks for the submission. This PR is ready for automated verification.

Automated gates:
- Catalog JSON must validate.
- Extension/template manifests must match the public schema.
- Each catalog entry must have a detail page.
- Template packs must include valid LaTeX source.
- Store JavaScript must pass syntax checks.

Merge gate:
- Automated checks must be green.
- A LatexDo maintainer must review and approve the PR.
- After approval, the maintainer can merge. The bot does not auto-merge community submissions.

Maintainer checklist:
- Confirm the extension or template is useful for LatexDo users.
- Confirm the author/repository/homepage are acceptable.
- Confirm snippets and templates do not include unsafe or spam content.
`;

const [owner, repo] = repository.split("/");
const comments = await github(
  `/repos/${owner}/${repo}/issues/${pullRequest.number}/comments`,
);
const existing = comments.find((comment) => comment.body?.includes(marker));

if (existing) {
  await github(`/repos/${owner}/${repo}/issues/comments/${existing.id}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
} else {
  await github(`/repos/${owner}/${repo}/issues/${pullRequest.number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

console.log(`Updated store bot comment on PR #${pullRequest.number}.`);

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function readJson(path) {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(path, "utf8"));
}
