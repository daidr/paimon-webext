import type { ProtocolWithReturn } from 'webext-bridge'
import type { ICaptchaResponse, ISettingsMap } from '~/types'

declare module 'webext-bridge' {
  export interface ProtocolMap {
    // define message protocol types
    // see https://github.com/antfu/webext-bridge#type-safe-protocols
    // 'tab-prev': { title: string | undefined }
    // 'get-current-tab': ProtocolWithReturn<{ tabId: number }, { title?: string }>
    'set_selected_role': { uid: string }
    'set_role_status': { uid: string; status: boolean }
    'delete_role_request': ProtocolWithReturn<{ uid: string }, boolean>
    'request_cookie_read': ProtocolWithReturn<{ oversea: boolean }, number>
    'create_verification': ProtocolWithReturn<{ uid: string }, ICaptchaResponse | false>
    'get_selected_role': ProtocolWithReturn<{}, string>
    'finish_captcha': ProtocolWithReturn<{ geetest: ICaptchaRequest; uid: string; tabId: number }, boolean>
    'request_captcha': { verification: ICaptchaResponse; uid: string; tabId: number }
    'write_settings': ISettingsMap
    'read_settings': ProtocolWithReturn<{ }, ISettingsMap>
  }
}
