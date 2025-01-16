import fs from 'node:fs';
import deepmerge from 'deepmerge';

const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

const isFirefox = process.env.__FIREFOX__ === 'true';

/**
 * If you want to disable the sidePanel, you can delete withSidePanel function and remove the sidePanel HoC on the manifest declaration.
 *
 * ```js
 * const manifest = { // remove `withSidePanel()`
 * ```
 */
function withSidePanel(manifest) {
  // Firefox does not support sidePanel
  if (isFirefox) {
    return manifest;
  }
  return deepmerge(manifest, {
    side_panel: {
      default_path: 'side-panel/index.html',
    },
    permissions: ['sidePanel'],
  });
}

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */
const manifest = withSidePanel({
  manifest_version: 3,
  default_locale: 'en',
  /**
   * if you want to support multiple languages, you can use the following reference
   * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
   */
  name: 'Savvy',
  version: packageJson.version,
  description: 'Create, Share, and Run Worfklows from your browser & CLI',
  host_permissions: ['http://localhost:8765/*', 'https://www.example.com/*'],
  permissions: ['storage', 'scripting', 'tabs', 'history'],
  background: {
    service_worker: 'background.iife.js',
    type: 'module',
  },
  action: {
    default_icon: 'icon-34.png',
  },
  chrome_url_overrides: {
    //newtab: 'new-tab/index.html',
  },
  icons: {
    128: 'icon-128.png',
    64: 'icon-64.png',
    48: 'icon-48.png',
    34: 'icon-34.png',
  },
  content_scripts: [
    {
      matches: ['https://www.example.com/*'],
      js: ['content/index.iife.js'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png'],
      matches: ['*://*/*'],
    },
  ],
});

export default manifest;
