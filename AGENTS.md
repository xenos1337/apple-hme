# Apple Hide My Email — Repository Guide

This file is the working guide for AI agents and contributors. Keep it aligned with the repository when scripts, architecture, or release automation change.

## Project overview

Apple Hide My Email is an independent open-source browser extension for Chromium browsers and Firefox. It lets users create and manage Apple iCloud Hide My Email addresses and fill email fields from the browser.

This is a browser extension, not a conventional website or hosted backend. The popup and user guide are React pages bundled into the extension. The extension talks directly to Apple's iCloud services through `src/iCloudClient.ts`.

The project is not affiliated with Apple. It is maintained by Axvant UG (haftungsbeschränkt) and licensed under MIT; see `LICENSE` and the disclaimer in `README.md`.

## Technology

- Node.js 22 in CI; use the version in `.nvmrc` locally
- TypeScript and React 18
- Webpack 5
- Tailwind CSS, CSS, and SCSS
- Chrome Manifest V3
- Firefox Manifest V3 compatibility transformations
- ESLint and TypeScript for review gates
- GitHub Actions for CI, packaging, and GitHub Releases

Use `npm ci` for deterministic installs. Do not manually edit `package-lock.json`; let npm update it.

## Important files and directories

- `src/manifest.json`: base extension manifest. Webpack injects the version from `package.json`.
- `src/pages/Popup/`: extension popup React application.
- `src/pages/Userguide/`: bundled user-guide React application.
- `src/pages/Background/`: background service worker and extension orchestration.
- `src/pages/Content/`: content script and page integration.
- `src/iCloudClient.ts`: communication with iCloud Hide My Email.
- `src/storage.ts`: extension storage behavior.
- `src/hmeCache.ts`: Hide My Email data caching.
- `src/browserUtils.ts`: browser compatibility utilities.
- `src/rules.json`: declarative network request rules copied into the build.
- `src/assets/`: icons, images, and README media.
- `webpack.config.js`: browser bundle entries, manifest transformation, copied assets, and production optimization.
- `utils/build.js`: production Webpack build; `--firefox` enables Firefox output.
- `utils/webserver.js`: development server launcher.
- `utils/package-chrome.js`: creates Chrome `.crx` and `.zip` packages.
- `.github/workflows/tests.yaml`: checks, builds, artifacts, and releases.

Generated directories are `build/` and `artifacts/`. They must not be committed.

## Architecture and build behavior

Webpack produces these entry bundles:

- `popup.bundle.js`
- `background.bundle.js`
- `contentScript.bundle.js`
- `userguide.bundle.js`

It also creates `popup.html` and `userguide.html`, copies the icons, sign-in image, rules, and manifest into `build/`, and sets the manifest version from `package.json`.

For Firefox, Webpack transforms the Chrome service-worker declaration into a background script declaration and adds the Gecko extension ID `apple-hide-my-email@axvant.com` with Firefox 113 as the minimum supported version.

## Local setup

From the repository root:

```powershell
npm ci
npm run typecheck
npm run lint
```

### Chromium development

```powershell
npm run start
```

This creates and serves `build/`. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the repository's `build` directory. Reload the extension after relevant changes if hot reload does not cover them.

### Firefox development

```powershell
npm run start:firefox
npx web-ext run --source-dir build
```

## Available npm commands

- `npm run clean`: remove `build/`.
- `npm run start`: run the Chromium development build/server.
- `npm run start:firefox`: run the Firefox development build/server.
- `npm run build`: clean and create a production Chromium build.
- `npm run build:firefox`: clean and create a production Firefox build.
- `npm run package:chrome`: package an existing Chromium build into CRX and ZIP files.
- `npm run package:firefox`: package an existing Firefox build into an AMO-ready ZIP.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm run lint`: run ESLint.
- `npm run prettier`: rewrite supported files with Prettier.
- `npm run prettier:check`: check formatting without rewriting files.

## Build packages locally

Chrome:

```powershell
npm ci
npm run build
npm run package:chrome
```

Outputs are written to `artifacts/chrome/`:

- `apple-hide-my-email-v<version>-chrome.crx`
- `apple-hide-my-email-v<version>-chrome.zip`

Firefox:

```powershell
npm ci
npm run build:firefox
npm run package:firefox
```

The Firefox ZIP is written to `artifacts/firefox/`.

Chrome packaging creates a temporary signing key when none is supplied. That changes the extension ID. For stable signed builds, set `CHROME_EXTENSION_PRIVATE_KEY_PATH` locally to the existing PEM key. Never commit a private key.

## Before pushing a change

Use short branded branch names:

- `feat-<short-name>` for features
- `fix-<short-name>` for bug fixes
- `docs-<short-name>` for documentation
- `chore-<short-name>` for maintenance

Use short conventional commit messages such as `feat: add release assets`, `fix: unblock CI`, or `docs: add agent guide`. Keep pull request titles and descriptions equally short and readable.

Run:

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
npm run package:chrome
npm run build:firefox
npm run package:firefox
```

Then inspect the change and commit only intended files:

```powershell
git status
git diff
git add <files>
git commit -m "fix: unblock CI"
git push origin feat-<short-name>
```

Do not commit `build/`, `artifacts/`, secrets, signing keys, or local environment files.

## CI behavior

The `CI` workflow runs on every branch push, pull requests targeting `main`, version tags matching `v*`, and published GitHub releases.

The jobs run in this order:

1. `review`: installs dependencies, runs the TypeScript check and ESLint. Pull requests also attempt a non-blocking dependency review, because GitHub does not support that action when the repository's Dependency Graph is disabled.
2. `build`: independently builds and packages Chrome and Firefox, then stores their packages as GitHub Actions artifacts for 30 days.
3. `release`: for version tags/releases only, downloads both browser artifact sets and attaches them to the GitHub Release.

CI uses Node.js 22. The release version check requires the tag to equal `v` plus the version in `package.json`.

## Exact release workflow

The recommended path is a tag-driven release. Start on an up-to-date `main` with a clean working tree.

### 1. Update the version

Choose exactly one semantic-version bump:

```powershell
npm version patch --no-git-tag-version
```

Use `minor` or `major` instead of `patch` when appropriate. This updates both `package.json` and `package-lock.json`.

### 2. Validate the release candidate

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
npm run package:chrome
npm run build:firefox
npm run package:firefox
```

### 3. Commit and push the version

Replace `1.3.1` below with the exact new version:

```powershell
git add package.json package-lock.json
git commit -m "Release v1.3.1"
git push origin main
```

### 4. Create and push the matching tag

```powershell
git tag v1.3.1
git push origin v1.3.1
```

The tag must exactly match `v${package.json.version}`. For example, package version `1.3.1` requires tag `v1.3.1`.

The tag workflow then checks the code, builds both browser variants, creates the GitHub Release with generated notes, and attaches the Chrome CRX, Chrome ZIP, and Firefox ZIP.

### Alternative: publish from the GitHub Releases UI

In GitHub, open **Releases → Draft a new release**, choose or create the matching `v<version>` tag, and publish it. The `release.published` event checks out that tag, performs the same review and browser builds, and uploads the packages to the existing release. Reruns overwrite same-named assets via `--clobber`.

Do not use both methods for the same new version unless rerunning intentionally. A pushed version tag normally creates the release automatically.

## Release secrets and store publishing

The optional repository secret `CHROME_EXTENSION_PRIVATE_KEY` should contain the PEM private key used for Chrome packaging. Configure it under **GitHub repository Settings → Secrets and variables → Actions**. Without it, CI still produces packages, but the generated CRX uses a temporary key and therefore does not retain a stable extension ID.

GitHub Releases do not automatically submit builds to browser stores. Store submission remains manual:

- Upload the Chrome ZIP to the Chrome Web Store developer console.
- Upload the Firefox ZIP to the Mozilla Add-ons developer hub.

## Versioning rules

- `package.json` is the source of truth for the extension version.
- Webpack copies that version into the generated manifest.
- Release tags use the same value prefixed with `v`.
- Always commit `package.json` and `package-lock.json` together after a version bump.
- Do not hand-edit only `src/manifest.json` to change the release version.

## Contribution guidelines for agents

- Preserve Chrome and Firefox compatibility when changing manifest, background, or browser API behavior.
- Prefer shared logic plus narrowly scoped browser adaptations.
- Do not alter user-visible behavior beyond the requested scope.
- Do not expose Apple session data, extension storage contents, tokens, cookies, or private signing material.
- Keep changes small and inspect existing patterns before introducing dependencies or abstractions.
- Update this guide and `README.md` when commands, release behavior, architecture, or setup requirements change.
- Verify changes with at least `npm run typecheck` and `npm run lint`; run the affected browser build for build or runtime changes.

## Common problems

- **Release version check fails:** the tag and `package.json` version differ. Correct the version/tag; do not bypass the check.
- **Release has no assets:** inspect the `CI` workflow. Both matrix builds and their artifact uploads must succeed before the release job starts.
- **Chrome extension ID changes:** the build did not use the persistent Chrome PEM signing key.
- **Firefox behaves differently:** confirm the build used `npm run build:firefox`; a normal Chrome build does not apply Firefox's manifest transformation.
- **Stale output:** run `npm run clean`, then rebuild.
- **Dependency mismatch:** remove no lockfile data manually; run `npm ci` from the committed lockfile or use the appropriate `npm install` command when deliberately updating dependencies.
