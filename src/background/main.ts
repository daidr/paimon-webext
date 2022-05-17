import { onMessage } from 'webext-bridge'
import { cookies, storage, alarms, webRequest, Cookies } from 'webextension-polyfill'

import { IRoleDataItem, IUserDataItem } from '~/types'
import { getRoleDataByCookie, getRoleInfoByCookie } from '~/utils'
// import { cookies, storage, alarms } from 'webextension-polyfill'

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
}

// 一分钟
const INTERVAL_TIME = 1

// 向storage写入数据
const writeDataToStorage = async function <T>(key: string, data: T) {
  await storage.local.set({ [key]: data })
}

const targetPages = [
  'https://api-os-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie*',
  'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie*',
  'https://bbs-api-os.mihoyo.com/game_record/app/genshin/api/dailyNote*',
  'https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/dailyNote*',
]

let currentCookie = ''

function rewriteCookieHeader(e: any) {
  let flag = false
  for (const header of e.requestHeaders) {
    if (header.name === 'Cookie' || header.name === 'cookie') {
      header.value = currentCookie
      flag = true
    }
  }
  if (!flag) {
    e.requestHeaders.push({
      name: 'Cookie',
      value: currentCookie,
    })
  }
  return { requestHeaders: e.requestHeaders }
}

webRequest.onBeforeSendHeaders.addListener(
  rewriteCookieHeader,
  { urls: targetPages },
  ['blocking', 'requestHeaders', chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean),
)

function removeSetCookieHeader(e: any) {
  for (const header of e.responseHeaders) {
    if (header.name === 'Set-Cookie' || header.name === 'set-cookie')
      header.value = ''
  }
  return { responseHeaders: e.responseHeaders }
}

webRequest.onHeadersReceived.addListener(
  removeSetCookieHeader,
  { urls: targetPages },
  ['blocking', 'responseHeaders', chrome.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS].filter(Boolean),
)

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

const clearMiHoYoCookie = async function () {
  const originCookieList: Cookies.Cookie[] = await cookies.getAll({ domain: 'mihoyo.com' })
  const cookieList: Cookies.RemoveDetailsType[] = originCookieList.map((cookie) => ({
    name: cookie.name,
    url: 'https://mihoyo.com',
  }))
  for (const cookie of cookieList)
    await cookies.remove(cookie)
}

const clearHoYoLABCookie = async function () {
  const originCookieList: Cookies.Cookie[] = await cookies.getAll({ domain: 'hoyolab.com' })
  const cookieList: Cookies.RemoveDetailsType[] = originCookieList.map((cookie) => ({
    name: cookie.name,
    url: 'https://hoyolab.com',
  }))

  for (const cookie of cookieList)
    await cookies.remove(cookie)
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

const refreshData = async function () {
  // 取出原始 roleList
  const originRoleList = await readDataFromStorage<IUserDataItem[]>('roleList', [])
  // 取出启用的 role
  const enabledRoleList = originRoleList.filter((item) => {
    return item.isEnabled
  })

  const setCookie = (cookie: string) => {
    currentCookie = cookie
  }

  // 遍历启用的 role
  for (const role of enabledRoleList) {
    const data = await getRoleDataByCookie(role.serverType === 'os', role.cookie, role.uid, role.serverRegion, setCookie)
    if (data) {
      // 更新 roleList
      const index = originRoleList.findIndex((item) => {
        return item.uid === role.uid
      })

      originRoleList.splice(index, 1, {
        ...role,
        data,
        isError: false,
        errorMessage: '',
        updateTimestamp: Date.now(),
      })
    } else {
      // 获取失败，写入错误信息
      role.isError = true
      role.errorMessage = '获取数据失败'
      role.updateTimestamp = Date.now()
    }
  }

  // 更新 roleList
  await writeDataToStorage('roleList', originRoleList)
}

// 定时器，定时获取玩家数据
alarms.create('refresh_data', { periodInMinutes: INTERVAL_TIME })
alarms.onAlarm.addListener((alarmInfo) => {
  if (alarmInfo.name === 'refresh_data') refreshData()
});

(() => {
  setTimeout(() => {
    refreshData()
  }, 1000)
})()

onMessage('get_role_list', async () => {
  return await readDataFromStorage<IUserDataItem[]>('roleList', [])
})

onMessage('get_selected_role', async () => {
  return await readDataFromStorage<string>('selectedRole', '')
})

onMessage('refresh_request', async () => {
  await refreshData()
  return true
})

onMessage<{ uid: string }, 'set_selected_role'>('set_selected_role', async ({ data: { uid } }) => {
  await writeDataToStorage('selectedRole', uid)
})

onMessage<{ uid: string; status: boolean }, 'set_role_status'>('set_role_status', async ({ data: { uid, status } }) => {
  const originRoleList = await readDataFromStorage<IUserDataItem[]>('roleList', [])
  const index = originRoleList.findIndex((item) => {
    return item.uid === uid
  })
  originRoleList[index].isEnabled = status
  await writeDataToStorage('roleList', originRoleList)
})

onMessage<{ uid: string }, 'delete_role_request'>('delete_role_request', async ({ data: { uid } }) => {
  // 取出原始 roleList
  const originRoleList = await readDataFromStorage<IUserDataItem[]>('roleList', [])
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

  const setCookie = (cookie: string) => {
    currentCookie = cookie
  }

  const result = await getRoleInfoByCookie(oversea, cookie, setCookie)

  if (result) {
    for (const item of result)
      await addNewRoleToList(oversea, item, cookie)

    await refreshData()

    // 清空 cookie
    if (oversea) {
      // 清空 hoyolab cookie
      await clearHoYoLABCookie()
    }
    else {
      // 清空 mihoyo cookie
      await clearMiHoYoCookie()
    }

    return result.length
  } else {
    return -1
  }
})
