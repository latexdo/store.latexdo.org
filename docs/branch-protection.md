# Branch Protection

Configure the default branch on GitHub with these rules:

- Require a pull request before merging.
- Require approvals: `1`.
- Require review from Code Owners.
- Require status check: `Validate catalog and policy`.
- Dismiss stale approvals when new commits are pushed.
- Do not allow bypassing the above settings except for emergency admins.

With these settings, community contributors can open PRs, the bot verifies the catalog, and a LatexDo maintainer must approve before merge.

Current CODEOWNERS target: `@omarabedelkader`.
