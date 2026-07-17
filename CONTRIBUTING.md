# Contributing Extensions And Templates

LatexDo store submissions are manifest-based. A contribution can turn on supported LatexDo features, add LaTeX snippets, or publish project templates. It cannot execute code in the editor.

Use `/builder/` on the store site to create the manifest and detail page without writing JSON by hand.

## Manifest Fields

Add your entry to `extensions/catalog.json`:

```json
{
  "schemaVersion": 1,
  "id": "community.my-pack",
  "kind": "extension",
  "name": "My Pack",
  "version": "1.0.0",
  "description": "A short user-facing summary.",
  "author": "Your name",
  "category": "writing",
  "tags": ["snippets"],
  "homepage": "https://store.latexdo.org/extensions/community.my-pack/",
  "repository": "https://github.com/example/my-pack",
  "contributes": {
    "featureFlags": {
      "notationManagerEnabled": true
    },
    "snippets": [
      {
        "label": "claim",
        "detail": "Claim paragraph",
        "documentation": "Adds a short claim paragraph.",
        "insertText": "\\\\paragraph{Claim.} ${0:Write the claim.}"
      }
    ]
  }
}
```

For a template pack, use `kind: "template"` and add `contributes.templates`:

```json
{
  "schemaVersion": 1,
  "id": "community.dissertation-template",
  "kind": "template",
  "name": "Dissertation Template",
  "version": "1.0.0",
  "description": "A starter dissertation project for LatexDo.",
  "author": "Your name",
  "category": "templates",
  "tags": ["thesis"],
  "homepage": "https://store.latexdo.org/extensions/community.dissertation-template/",
  "repository": "https://github.com/example/dissertation-template",
  "contributes": {
    "templates": [
      {
        "id": "dissertation",
        "name": "Dissertation",
        "summary": "A chapter-based dissertation starter.",
        "files": "main.tex",
        "mainTex": "\\\\documentclass{report}\\n\\\\begin{document}\\nStart here.\\n\\\\end{document}\\n"
      }
    ]
  }
}
```

## PR Flow

1. Fork the repository.
2. Generate your pack in `/builder/`.
3. Add your catalog entry to `extensions/catalog.json`.
4. Add `extensions/<your-extension-id>/index.html`.
5. Run `npm run ci:pr`.
6. Open a pull request with the store submission template.

The bot validates the catalog and comments with the merge checklist. A LatexDo maintainer must approve before merge.

## Allowed Categories

- `writing`
- `checking`
- `bibliography`
- `graphics`
- `templates`
- `workflow`

## Allowed Feature Flags

- `acronymManagerEnabled`
- `autoFixCommon`
- `checkAbstractWordCount`
- `checkCodeLink`
- `checkDatasetLink`
- `checkEmbeddedFonts`
- `checkEvaluationMetrics`
- `checkFigureReferences`
- `checkHardwareDetails`
- `checkHyperparameters`
- `checkLicenseMentioned`
- `checkPageCount`
- `checkRandomSeeds`
- `checkSectionsWithNoCitations`
- `checkTableReferences`
- `checkType3Fonts`
- `checkUncitedCitations`
- `checkUndefinedAcronym`
- `checkUnreferencedFigures`
- `citationAssistantEnabled`
- `conferenceCheckerEnabled`
- `detectBrokenLinks`
- `detectDuplicateReferences`
- `detectMissingCitations`
- `detectNotation`
- `detectNotationConflicts`
- `detectUndefinedNotation`
- `detectUnusedEntries`
- `errorDoctorEnabled`
- `explainErrors`
- `importMetadataSources`
- `notationManagerEnabled`
- `pdfComplianceEnabled`
- `projectBibliographyEnabled`
- `reproducibilityEnabled`
- `structureAssistantEnabled`
- `suggestCitationKeys`
- `suggestFixes`
- `tableGeneratorEnabled`
- `tikzConverterAutoOpen`
- `tikzConverterEnabled`
- `warnOldCitations`

## Rules

- Use a stable ID like `author.extension-name`.
- Every entry must pass the LatexDo application parser through `npm run build`.
- Keep snippets focused and safe to insert into LaTeX source.
- Keep templates complete enough to compile or edit immediately.
- Use HTTPS URLs for `homepage` and `repository`.
- Run `npm run ci:pr` before opening a PR.
- Do not include remote scripts, trackers, credential prompts, or obfuscated payloads.
