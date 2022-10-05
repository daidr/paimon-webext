import { onMessage } from 'webext-bridge'
import { cookies, storage, alarms, webRequest, Cookies, notifications, runtime, i18n, Notifications } from 'webextension-polyfill'
import { IRoleDataItem, IUserData, IUserDataItem, IAlertSetting, IAlertStatus } from '~/types'
import { getRoleDataByCookie, getRoleInfoByCookie } from '~/utils'

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
}

// 一分钟
const INTERVAL_TIME = 1

// 角色的默认提醒设定
const defaultAlertSetting: IAlertSetting = {
  resin: false,
  resinThreshold: 155,
  realmCurrency: false,
  transformer: false,
}

// 角色默认提醒状态
const defaultAlertStatus: IAlertStatus = {
  resin: '',
  realmCurrency: '',
  transformer: '',
}

// 通知图标路径
const notificationIconList = {
  resin: runtime.getURL('/assets/notifications/icon_resin.png'),
  realmCurrency: runtime.getURL('/assets/notifications/icon_realm_currency.png'),
  transformer: runtime.getURL('/assets/notifications/icon_transformer.png'),
}

// 随机生成 10 位字符串作为通知 id
const randomNotificationId = () => {
  return Math.random().toString(36).slice(2, 10)
}

// type: 0 resin; 1 realmCurrency; 2 transformer
const showNotification = (alertStatus: IAlertStatus, type: 0 | 1 | 2, scope: any) => {
  // @ts-ignore: update 方法在 firefox 中不存在
  const isFirefox = !notifications.update
  if (!isFirefox) {
    // chromium 系浏览器
    if (type === 0) {
      const notificationData: Notifications.CreateNotificationOptions = {
        type: 'basic',
        iconUrl: notificationIconList.resin,
        title: i18n.getMessage('options_Alert_Notify_Title'),
        message: i18n.getMessage('options_Alert_Notify_Resin', [scope.resin]),
        contextMessage: `${scope.name}(${scope.uid}) - ${i18n.getMessage(scope.server)}`,
      }

      if (alertStatus.resin === '') {
        // 创建通知
        alertStatus.resin = randomNotificationId()
        notifications.create(alertStatus.resin, notificationData)
      } else {
        // 更新通知
        notifications.update(alertStatus.resin, notificationData)
      }
    } else if (type === 1) {
      const notificationData: Notifications.CreateNotificationOptions = {
        type: 'basic',
        iconUrl: notificationIconList.realmCurrency,
        title: i18n.getMessage('options_Alert_Notify_Title'),
        message: i18n.getMessage('options_Alert_Notify_RealmCurrency'),
        contextMessage: `${scope.name}(${scope.uid}) - ${i18n.getMessage(scope.server)}`,
      }

      if (alertStatus.realmCurrency === '') {
        // 创建通知
        alertStatus.realmCurrency = randomNotificationId()
        notifications.create(alertStatus.realmCurrency, notificationData)
      }
    } else if (type === 2) {
      const notificationData: Notifications.CreateNotificationOptions = {
        type: 'basic',
        iconUrl: notificationIconList.transformer,
        title: i18n.getMessage('options_Alert_Notify_Title'),
        message: i18n.getMessage('options_Alert_Notify_Transformer'),
        contextMessage: `${scope.name}(${scope.uid}) - ${i18n.getMessage(scope.server)}`,
      }

      if (alertStatus.transformer === '') {
        // 创建通知
        alertStatus.transformer = randomNotificationId()
        notifications.create(alertStatus.transformer, notificationData)
      }
    }
  } else {
    // firefox 浏览器
    if (type === 0) {
      const notificationData: Notifications.CreateNotificationOptions = {
        type: 'basic',
        iconUrl: notificationIconList.resin,
        title: i18n.getMessage('options_Alert_Notify_Title'),
        message: i18n.getMessage('options_Alert_Notify_Resin_Firefox', [`${scope.name}(${scope.uid})`, scope.resin]),
      }

      if (alertStatus.resin === '') {
        // 创建通知
        alertStatus.resin = randomNotificationId()
        notifications.create(alertStatus.resin, notificationData)
      }
    } else if (type === 1) {
      const notificationData: Notifications.CreateNotificationOptions = {
        type: 'basic',
        iconUrl: notificationIconList.realmCurrency,
        title: i18n.getMessage('options_Alert_Notify_Title'),
        message: i18n.getMessage('options_Alert_Notify_RealmCurrency_Firefox', [`${scope.name}(${scope.uid})`]),
      }

      if (alertStatus.realmCurrency === '') {
        // 创建通知
        alertStatus.realmCurrency = randomNotificationId()
        notifications.create(alertStatus.realmCurrency, notificationData)
      }
    } else if (type === 2) {
      const notificationData: Notifications.CreateNotificationOptions = {
        type: 'basic',
        iconUrl: notificationIconList.transformer,
        title: i18n.getMessage('options_Alert_Notify_Title'),
        message: i18n.getMessage('options_Alert_Notify_Transformer_Firefox', [`${scope.name}(${scope.uid})`]),
      }

      if (alertStatus.transformer === '') {
        // 创建通知
        alertStatus.transformer = randomNotificationId()
        notifications.create(alertStatus.transformer, notificationData)
      }
    }
  }
}

const removeNotification = (alertStatus: IAlertStatus, type: 0 | 1 | 2) => {
  if (type === 0) {
    if (alertStatus.resin !== '') {
      notifications.clear(alertStatus.resin)
      alertStatus.resin = ''
    }
  } else if (type === 1) {
    if (alertStatus.realmCurrency !== '') {
      notifications.clear(alertStatus.realmCurrency)
      alertStatus.realmCurrency = ''
    }
  } else if (type === 2) {
    if (alertStatus.transformer !== '') {
      notifications.clear(alertStatus.transformer)
      alertStatus.transformer = ''
    }
  }
}

// 向storage写入数据
const writeDataToStorage = async function <T>(key: string, data: T) {
  await storage.local.set({ [key]: data })
}

const targetPages = [
  'https://api-os-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?asource=paimon*',
  'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?asource=paimon*',
  'https://bbs-api-os.hoyolab.com/game_record/app/genshin/api/dailyNote?asource=paimon*',
  'https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/dailyNote?asource=paimon*',
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
  // @ts-ignore
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
  // @ts-ignore
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
    enabledAlert: false,
    alertStatus: defaultAlertStatus,
    uid: roleInfo.game_uid,
    nickname: roleInfo.nickname,
    level: roleInfo.level,
    serverRegion: roleInfo.region,
    serverType: oversea ? 'os' : 'cn',
    cookie,
    data: {} as IUserData,
    updateTimestamp: Date.now(),
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

let alertSettings: IAlertSetting = defaultAlertSetting;

(async function () {
  alertSettings = await readDataFromStorage<IAlertSetting>('alertSetting', defaultAlertSetting)
})()

const doAlertCheck = async function (roleInfo: IUserDataItem) {
  if (!roleInfo.enabledAlert) return
  // 树脂检查
  if (alertSettings.resin) {
    if (roleInfo.data.current_resin >= alertSettings.resinThreshold) {
      showNotification(roleInfo.alertStatus, 0, {
        name: roleInfo.nickname,
        uid: roleInfo.uid,
        server: roleInfo.serverRegion,
        resin: roleInfo.data.current_resin,
      })
    } else {
      removeNotification(roleInfo.alertStatus, 0)
    }
  }
  // 洞天宝钱检查
  if (alertSettings.realmCurrency) {
    if (roleInfo.data.current_home_coin === roleInfo.data.max_home_coin && roleInfo.data.current_home_coin > 0) {
      showNotification(roleInfo.alertStatus, 1, {
        name: roleInfo.nickname,
        uid: roleInfo.uid,
        server: roleInfo.serverRegion,
      })
    } else {
      removeNotification(roleInfo.alertStatus, 1)
    }
  }
  // 参量质变仪检查
  if (alertSettings.transformer) {
    if (roleInfo.data.transformer.obtained && roleInfo.data.transformer.recovery_time.reached) {
      showNotification(roleInfo.alertStatus, 2, {
        name: roleInfo.nickname,
        uid: roleInfo.uid,
        server: roleInfo.serverRegion,
      })
    } else {
      removeNotification(roleInfo.alertStatus, 2)
    }
  }
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
      doAlertCheck(role)
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

// 传入 AlertStatus，对存在的通知进行清理
const clearNotifications = async function (alertStatus: IAlertStatus) {
  if (alertStatus.resin !== '') {
    await notifications.clear(alertStatus.resin)
    alertStatus.resin = ''
  }
  if (alertStatus.realmCurrency !== '') {
    await notifications.clear(alertStatus.realmCurrency)
    alertStatus.realmCurrency = ''
  }
  if (alertStatus.transformer !== '') {
    await notifications.clear(alertStatus.transformer)
    alertStatus.transformer = ''
  }
}

onMessage('get_alert_setting', async () => {
  return await readDataFromStorage<IAlertSetting>('alertSetting', defaultAlertSetting)
})

onMessage<{ resin: boolean; resinThreshold: number; transformer: boolean; realmCurrency: boolean }, 'set_alert_setting'>('set_alert_setting', async ({ data: alertSetting }) => {
  await writeDataToStorage('alertSetting', alertSetting)
})

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
  // 重置角色提醒状态
  clearNotifications(originRoleList[index].alertStatus)
  originRoleList[index].alertStatus = defaultAlertStatus
  await writeDataToStorage('roleList', originRoleList)
})

onMessage<{ uid: string; status: boolean }, 'set_role_alert_status'>('set_role_alert_status', async ({ data: { uid, status } }) => {
  const originRoleList = await readDataFromStorage<IUserDataItem[]>('roleList', [])
  const index = originRoleList.findIndex((item) => {
    return item.uid === uid
  })
  originRoleList[index].enabledAlert = status
  // 重置角色提醒状态
  clearNotifications(originRoleList[index].alertStatus)
  originRoleList[index].alertStatus = defaultAlertStatus
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
