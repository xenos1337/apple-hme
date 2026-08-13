const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const version = require('../package.json').version;
const buildDir = path.resolve('build');
const artifactsDir = path.resolve('artifacts', 'chrome');
const configuredKeyPath = process.env.CHROME_EXTENSION_PRIVATE_KEY_PATH
  ? path.resolve(process.env.CHROME_EXTENSION_PRIVATE_KEY_PATH)
  : null;
const keyPath = configuredKeyPath && fs.existsSync(configuredKeyPath)
  ? configuredKeyPath
  : path.join(os.tmpdir(), `apple-hide-my-email-${process.pid}.pem`);
const crxPath = path.join(
  artifactsDir,
  `apple-hide-my-email-v${version}-chrome.crx`
);
const zipPath = path.join(
  artifactsDir,
  `apple-hide-my-email-v${version}-chrome.zip`
);

if (!fs.existsSync(path.join(buildDir, 'manifest.json'))) {
  throw new Error('The build directory does not contain manifest.json. Run a production build first.');
}

fs.mkdirSync(artifactsDir, { recursive: true });

if (keyPath !== configuredKeyPath) {
  fs.rmSync(keyPath, { force: true });
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    '--yes',
    'crx3@2.0.0',
    '-p',
    keyPath,
    '-o',
    crxPath,
    '-z',
    zipPath,
    buildDir,
  ],
  { stdio: 'inherit', shell: process.platform === 'win32' }
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

if (!fs.statSync(crxPath).size || !fs.statSync(zipPath).size) {
  throw new Error('Chrome packaging did not produce valid CRX and ZIP artifacts.');
}

if (keyPath !== configuredKeyPath) {
  fs.rmSync(keyPath, { force: true });
}
