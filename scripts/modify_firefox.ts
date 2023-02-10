import { execSync } from 'child_process'
import fs from 'fs-extra'
import { log, r } from './utils'

log('PRE', 'copy extension to extension_firefox')

function writeFirefoxManifest() {
  execSync('npx esno ./scripts/manifest_firefox.ts', { stdio: 'inherit' })
}

fs.ensureDirSync(r('extension_firefox'))
fs.copySync(r('extension'), r('extension_firefox'))
writeFirefoxManifest()
