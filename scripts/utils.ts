import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { bgCyan, black } from 'kolorist'

export const port = parseInt(process.env.PORT || '') || 3303
const _dirname = fileURLToPath(new URL('.', import.meta.url))
export const r = (...args: string[]) => resolve(_dirname, '..', ...args)
export const isDev = process.env.NODE_ENV !== 'production'
export const isWin = process.platform === 'win32'

export function log(name: string, message: string) {
  // eslint-disable-next-line no-console
  console.log(black(bgCyan(` ${name} `)), message)
}
