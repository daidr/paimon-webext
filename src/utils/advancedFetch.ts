import { resetRules, updateRules } from './networkHook'

interface FetchGetBaseOptions {
  method: 'GET'
}

interface FetchPostBaseOptions {
  method: 'POST'
  body?: string
}

export type AdvancedHeaders = Record<string, string>

type FetchBaseOptions = FetchGetBaseOptions | FetchPostBaseOptions

type FetchOptions = FetchBaseOptions & {
  headers?: AdvancedHeaders
}

export const advancedFetch = async (url: string, fetchOptions: FetchOptions) => {
  if (fetchOptions.headers) {
    await updateRules(fetchOptions.headers)
  }
  return fetch(url, fetchOptions).then(res => {
    return res
  }).catch(err => {
    throw err
  }).finally(() => {
    if (fetchOptions.headers) {
      resetRules()
    }
  })
}
