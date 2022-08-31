import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import type PkgType from '../package.json'
import { isDev, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = (await fs.readJSON(r('package.json'))) as typeof PkgType

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: '__MSG_pluginDesc__',
    default_locale: 'en_US',
    action: {
      default_icon: './assets/icon-48.png',
      default_popup: './dist/popup/index.html',
    },
    background: {
      service_worker: './dist/background/index.mjs',
    },
    options_ui: {
      page: './dist/options/index.html',
      open_in_tab: false,
    },
    icons: {
      16: './assets/icon-16.png',
      32: './assets/icon-32.png',
      48: './assets/icon-48.png',
      96: './assets/icon-96.png',
      128: './assets/icon-128.png',
    },
    permissions: ['storage', 'cookies', 'alarms', 'notifications', 'declarativeNetRequest'],
    host_permissions: ['*://*.mihoyo.com/', '*://*.hoyolab.com/'],
  }

  if (isDev) {
    // add dev-only features here
    manifest.permissions?.push('webNavigation')
  }

  return manifest
}
