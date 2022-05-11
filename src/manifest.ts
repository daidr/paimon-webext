import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import type PkgType from '../package.json'
import { isDev, port, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = (await fs.readJSON(r('package.json'))) as typeof PkgType

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 2,
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: '__MSG_pluginDesc__',
    default_locale: 'zh_CN',
    browser_action: {
      default_icon: './assets/icon-48.png',
      default_popup: './dist/popup/index.html',
    },
    background: {
      page: './dist/background/index.html',
      persistent: true,
    },
    options_ui: {
      page: './dist/options/index.html',
      open_in_tab: false,
      chrome_style: false,
    },
    icons: {
      16: './assets/icon-16.png',
      32: './assets/icon-32.png',
      48: './assets/icon-48.png',
      96: './assets/icon-96.png',
      128: './assets/icon-128.png',
    },
    permissions: ['storage', 'cookies', 'alarms', 'webRequest', 'webRequestBlocking', '*://*.mihoyo.com/', '*://*.hoyolab.com/'],
  }

  if (isDev) {
    manifest.permissions?.push('webNavigation')

    // this is required on dev for Vite script to load
    manifest.content_security_policy = `script-src \'self\' http://localhost:${port}; object-src \'self\'`
  }

  return manifest
}
