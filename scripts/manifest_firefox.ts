import fs from 'fs-extra'
import { getManifest } from '../src/manifestFirefox'
import { log, r } from './utils'

export async function writeManifest() {
  await fs.writeJSON(r('extension_firefox/manifest.json'), await getManifest(), { spaces: 2 })
  log('PRE', 'write manifest.json(firefox)')
}

writeManifest()
