# CLAUDE.md — working in this fork

This repository is Adam's **personal fork** of Fluvy (`acosta290/fluvy`), a Home Assistant theme and card library.
It runs on his own Home Assistant through HACS, which installs the `fluvy.zip` attached to a GitHub release of
**this fork** (`adro21/fluvy`). The owner is not a developer: do the work end to end, never ask him to run commands,
and explain in plain language.

## Hard rules

- Work only in this fork (`origin`). Never push to, open pull requests against, or create anything in
  `acosta290/fluvy`. Pass the fork explicitly to every `gh` command (`--repo adro21/fluvy`, or the owner/name read
  from the `origin` remote): in a fork, `gh` can default to the parent repository.
- No new network calls, analytics or runtime dependencies in the code.
- Don't change the Python in `custom_components/fluvy` unless the change needs it.
- Follow the project's own conventions (`CONTRIBUTING.md`): tests beside the code, a key in **every** language
  catalogue (`packages/core/src/i18n/locales/*.json`), docs, and a line in `CHANGELOG.md` under *Unreleased*.
  Commit messages are imperative and name the area; sign commits with `git commit -s`.

## Set-up (what worked)

- Node from `.nvmrc` (24; 25 works) and the pnpm that `package.json` names in `packageManager` (11.x). A newer
  pnpm 10 switches itself to that version on `pnpm -v` in the repo.
- `pnpm install`, `pnpm build`, then `pnpm check` — all three must pass **before** touching anything.
- `pnpm check` runs prettier, eslint, tsc, every package's vitest, the i18n check, the docs check and the release
  invariants. Run `pnpm prettier --write <changed files>` before it.
- `docs/cards.md` tables are generated: change a card's keys or its catalogue description (`packages/cards/src/index.ts`),
  then run `pnpm docs:cards`; the check fails if the file is not what the code says.
- A card option is: a field in the card's config interface → its name in `static keys` (the type refuses a key the
  interface lacks and vice versa) → a field in `getConfigForm()` → a word under `"editor"` in all 8 catalogues
  (`editor.<key>` is picked up automatically). `packages/cards/src/shared/editors.test.ts` enforces all of it.
- Known flake: `packages/cards/src/panel/panel.test.ts` ("shows the screensaver…") waits a fixed 80 ms for a lazy
  import and can fail when every package tests at once. Rerun `pnpm check`; it is not a real failure.

## Release procedure (what worked on 2026-10-07 for 1.5.1)

1. Make the change, commit it (`git commit -s`).
2. `node tools/release/version.mjs X.Y.Z` — bumps every package.json, the integration's manifest and turns the
   *Unreleased* changelog section into `[X.Y.Z] — date`. Commit as `Release X.Y.Z` (`git commit -s -am`).
3. `pnpm build && pnpm check && node tools/release/check.mjs --tag vX.Y.Z` — all must pass.
4. `git push origin main`. **Do not push a tag.**
5. Build the zip exactly as `.github/workflows/release.yml` does, and check the manifest is at its root:
   ```sh
   (cd custom_components/fluvy && zip -r -X ../../fluvy.zip . -x '__pycache__/*' -x '*/__pycache__/*')
   unzip -l fluvy.zip | grep -q ' manifest.json$'
   ```
6. Release notes: the `[X.Y.Z]` section of `CHANGELOG.md` (the workflow's `awk` extracts it) into `notes.md`.
7. Create the release through the API, targeting the pushed commit; this also creates the tag server-side:
   ```sh
   gh release create vX.Y.Z fluvy.zip --repo adro21/fluvy --target <commit sha> --title vX.Y.Z --notes-file notes.md
   ```
   It must be a normal published release (no `--draft`, no `--prerelease`).
8. Verify: `gh api repos/adro21/fluvy/releases/tags/vX.Y.Z` shows `draft: false`, `prerelease: false` and an asset
   named `fluvy.zip` with `state: uploaded`.
9. Actions are enabled on the fork, so the tag created in step 7 also runs the *Release* workflow, which rebuilds the
   same zip and re-attaches it to the same release. That is harmless; confirm with `gh run list --repo adro21/fluvy`
   that it ended green and the asset is still listed.

Fallback if the API refuses the release or the upload: on github.com, in the fork, *Releases → Draft a new release*,
tag `vX.Y.Z` targeting `main`, publish; the *Release* workflow builds and attaches `fluvy.zip`.

## After a release (owner's side)

In HACS, open Fluvy, click *Update* (or *Redownload* and pick the version), then restart Home Assistant and
hard-refresh the browser. The fork is registered in HACS as a custom repository of type *Integration*.
