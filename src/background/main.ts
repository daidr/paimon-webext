import { onMessage } from 'webext-bridge'
import { cookies, storage, alarms } from 'webextension-polyfill'

import { IRoleDataItem, IUserDataItem } from '~/types'
import { getRoleInfoByCookie } from '~/utils'
// import { cookies, storage, alarms } from 'webextension-polyfill'

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
}

// 向storage写入数据
const writeDataToStorage = async function <T>(key: string, data: T) {
  await storage.local.set({ [key]: data })
}

// 从storage读取数据
const readDataFromStorage = async function <T>(key: string, defaultVal: T): Promise<T> {
  const data = await storage.local.get(key)
  if (data[key])
    return data[key]
  else
    return defaultVal
}

// 获取国服cookie
const getMiHoYoCookie = async function () {
  let cookieString = ''
  const _cookies = await cookies.getAll({ domain: 'mihoyo.com' })
  if (_cookies.length !== 0) {
    cookieString = ''
    for (const cookie of _cookies)
      cookieString += `${cookie.name}=${encodeURIComponent(cookie.value)};`
    return cookieString
  }
  else {
    return ''
  }
}

// 获取海外cookie
const getHoYoLABCookie = async function () {
  let cookieString = ''
  const _cookies = await cookies.getAll({ domain: 'hoyolab.com' })
  if (_cookies.length !== 0) {
    cookieString = ''
    for (const cookie of _cookies)
      cookieString += `${cookie.name}=${encodeURIComponent(cookie.value)};`
    return cookieString
  }
  else {
    return ''
  }
}

const addNewRoleToList = async function (oversea: boolean, roleInfo: IRoleDataItem, cookie: string) {
  // 取出原始 roleList
  const originRoleList = await readDataFromStorage<IUserDataItem[]>('roleList', [])

  // 判断是否已经存在
  const isExist = originRoleList.some((item) => {
    return item.uid === roleInfo.game_uid
  })

  // 构造一个 roleItem
  const roleItem: IUserDataItem = {
    isEnabled: true,
    uid: roleInfo.game_uid,
    nickname: roleInfo.nickname,
    level: roleInfo.level,
    serverRegion: roleInfo.region,
    serverType: oversea ? 'os' : 'cn',
    cookie,
  }

  // 如果不存在，则添加
  if (!isExist) {
    originRoleList.push(roleItem)
  } else {
    // 如果存在，则更新
    const index = originRoleList.findIndex((item) => {
      return item.uid === roleInfo.game_uid
    })
    originRoleList.splice(index, 1, roleItem)
  }

  // 更新 roleList
  await writeDataToStorage('roleList', originRoleList)
}

onMessage('get_role_list', async () => {
  return await readDataFromStorage<IUserDataItem[]>('roleList', [])
})

onMessage<{ uid: string }, 'delete_role_request'>('delete_role_request', async ({ data: { uid } }) => {
  // 取出原始 roleList
  const originRoleList = await readDataFromStorage<IUserDataItem[]>('roleList', [])
  console.log(uid)
  // 删除 roleUid
  const newRoleList = originRoleList.filter((item) => {
    return item.uid !== uid
  })

  // 更新 roleList
  await writeDataToStorage('roleList', newRoleList)

  return true
})

onMessage<{ oversea: boolean }, 'request_cookie_read'>('request_cookie_read', async ({ data: { oversea } }) => {
  let cookie = ''
  // 根据服务器类型获取对应 cookie
  if (oversea)
    cookie = await getHoYoLABCookie()
  else
    cookie = await getMiHoYoCookie()
  // cookie 获取失败，返回 false
  if (cookie === '') return -1

  const result = await getRoleInfoByCookie(oversea, cookie)

  if (result) {
    console.log(result)
    for (const item of result)
      await addNewRoleToList(oversea, item, cookie)
    return result.length
  } else {
    return -1
  }
})
