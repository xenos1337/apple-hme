# Apple Hide My Email

An independent, open-source browser extension for using Apple's Hide My
Email service in Chromium-based browsers and Firefox.

Built and maintained for the public by
[Axvant UG (haftungsbeschränkt)](https://axvant.com/). Source code and issue
tracking are available in this repository.

## Disclaimer

Apple Hide My Email is an independent project. It is not affiliated with,
endorsed by, sponsored by, maintained by, or otherwise connected to Apple Inc.
Apple and iCloud are trademarks of Apple Inc.

The software is provided as-is, without warranty. Use it at your own risk.
Axvant assumes no liability beyond what applicable law requires. See the
[MIT license](LICENSE) and [Axvant imprint](https://axvant.com/imprint).

This project is based on Dimitrios Dedoussis's MIT-licensed
`icloud-hide-my-email-browser-extension`; the original copyright notice is
preserved in [LICENSE](LICENSE).

<p align="center">
<img src="./src/assets/img/demo-popup.gif" alt="Extension popup demo" width="400" height="auto"/>
</p>

<p align="center">
<img src="./src/assets/img/demo-content.gif" alt="Extension content demo" width="600" height="auto"/>
</p>

## Features

- Simple pop-up UI for generating and reserving new Hide My Email addresses
- Ability to manage existing Hide My Email addresses (including deactivation, reactivation, and deletion)
- Autofilling on any HTML input element that is relevant to email
- Quick configuration of Hide My Email settings, such as the Forward-To address, through the Options page of the extension

## Options

### Address autofilling

The extension can be configured to show a context menu item when right-clicking
on input fields.

Page access is granted only after an explicit extension or context-menu action.
The autofill content script is injected on demand using the browser's
`activeTab` permission instead of running on every website.

<p align="center">
<img src="./src/assets/img/readme-context-menu-autofilling.png" alt="Context menu item when right-clicking on input fields" width="400" height="auto"/>
</p>

You can enable/disable any of the autofilling mechanisms through the Options page of the extension.

## Development

The extension is written in TypeScript. Its popup and options pages use React
and Tailwind CSS.

### Prerequisites

- Node.js 18 or newer (`.nvmrc` selects Node.js 18; CI uses Node.js 22)
- npm
- Chrome, another Chromium browser, or Firefox

If you use nvm, install and select the expected Node.js version before
installing dependencies:

```console
nvm install
nvm use
npm ci
```

Run all commands from the repository root.

### Develop in Chrome

Start the development server:

```console
npm run start
```

The server watches the source files and writes the extension to `build/`. Load
that directory as an unpacked extension from `chrome://extensions`. See
Chrome's [development guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
for browser-specific instructions.

Refresh the extension from the extensions page after changing background
scripts, the manifest, or other files that Chrome does not reload itself.

### Develop in Firefox

Start the Firefox development build:

```console
npm run start:firefox
```

In another terminal, launch the generated extension with `web-ext`:

```console
npx --yes web-ext@8.3.0 run --source-dir build
```

### Run the checks

Before opening a pull request, run the code and formatting checks:

```console
npm run typecheck
npm run lint
npm run prettier:check
```

To apply the repository's formatting rules, run `npm run prettier`.

### Build packages

Create a production build and package it for the target browser:

```console
# Chrome
npm run build
npm run package:chrome

# Firefox
npm run build:firefox
npm run package:firefox
```

Chrome packages are written to `artifacts/chrome/`. This directory contains a
Web Store-ready `.zip` and a developer-installable `.crx`. Firefox packages are
written to `artifacts/firefox/` as an AMO-ready `.zip`.

The Chrome packager creates a temporary signing key by default. Set
`CHROME_EXTENSION_PRIVATE_KEY_PATH` to an existing PEM private key when you
need the local `.crx` to keep the same extension ID.

### CI/CD

GitHub Actions checks every push and every pull request targeting `main`. It
runs the TypeScript and ESLint checks, reviews dependency changes on pull
requests, builds both browser packages, and keeps the artifacts for 30 days.

### Publish a release

1. Update the version in `package.json`, for example to `1.3.1`.
2. Commit and push the version change.
3. Create and push a matching tag:

   ```console
   git tag v1.3.1
   git push origin v1.3.1
   ```

The tag workflow verifies that the tag matches the version in `package.json`,
creates a GitHub release with generated notes, and attaches the Chrome and
Firefox packages.

Chrome release packages use a temporary signing key unless the repository
secret `CHROME_EXTENSION_PRIVATE_KEY` contains the extension's PEM private key.
Use the same key for every release to keep the Chrome extension ID stable.

## Roadmap

- [ ] Allow users to edit the label and note of an existing Hide My Email address
- [ ] Publish releases automatically to the Chrome Web Store and Firefox Add-ons
- [ ] Configure Dependabot for npm and GitHub Actions updates
