import { useStorageLocal } from '~/composables/useStorageLocal'

export const storageCookies = useStorageLocal('hoyo_cookies', '', { listenToStorageChanges: true })
export const storageGameUid = useStorageLocal('genshin_uid', '', { listenToStorageChanges: true })
export const storageGameServer = useStorageLocal('genshin_server', '0', { listenToStorageChanges: true })
export const storageErrorMessage = useStorageLocal('error_msg', '', { listenToStorageChanges: true })
export const storageUserData = useStorageLocal('genshin_data', '', { listenToStorageChanges: true })
export const storageLastUpdateTime = useStorageLocal('last_update_time', '', { listenToStorageChanges: true })
