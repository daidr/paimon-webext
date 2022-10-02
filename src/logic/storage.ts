import { useStorageLocal } from '~/composables/useStorageLocal'
import type { IUserDataItem } from '~/types'

export const storageRoleList = useStorageLocal<IUserDataItem[]>('hoyo_RoleList', [], { listenToStorageChanges: true })
export const storageDefaultUid = useStorageLocal<number>('hoyo_DefaultUid', 0, { listenToStorageChanges: true })
