import { onMessage, sendMessage } from 'webext-bridge'
import {
  action,
  alarms,
  i18n,
  notifications,
  runtime,
  tabs,
} from 'webextension-polyfill'
import type { Notifications } from 'webextension-polyfill'
import type {
  IAlertSetting,
  IAlertStatus,
  ICaptchaRequest,
  IRoleDataItem,
  IUserData,
  IUserDataItem,
} from '~/types'
import {
  calcRoleDataLocally,
  createVerification,
  getGeetestChallenge,
  getRandomTimeOffset,
  getRoleDataByCookie,
  getRoleInfoByCookie,
  readDataFromStorage,
  verifyVerification,
  writeDataToStorage,
} from '~/utils/utils'
import { isFirefox } from '~/env'
import {
  clearHoYoLABCookie,
  clearMiHoYoCookie,
  getHoYoLABCookie,
  getMiHoYoCookie,
} from '~/utils/cookie'
import {
  initResponseRules,
  resetRules,
  setExtraHeaders,
} from '~/utils/networkHook'

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
  realmCurrency: runtime.getURL(
    '/assets/notifications/icon_realm_currency.png',
  ),
  transformer: runtime.getURL('/assets/notifications/icon_transformer.png'),
}

// 随机生成 10 位字符串作为通知 id
const randomNotificationId = () => {
  return Math.random().toString(36).slice(2, 10)
}

const getNotificationMap = async (): Promise<Record<string, IAlertStatus>> => {
  return JSON.parse(await readDataFromStorage('notificationMap', '{}'))
}

const getNotificationItem = async (
  uid: string,
): Promise<false | IAlertStatus> => {
  const map = await getNotificationMap()
  return map[uid] || false
}

const setNotificationItem = async (
  uid: string,
  item: IAlertStatus,
): Promise<void> => {
  const map = await getNotificationMap()
  map[uid] = item
  await writeDataToStorage('notificationMap', JSON.stringify(map))
}
// type: 0 resin; 1 realmCurrency; 2 transformer
const showNotification = async (
  alertStatus: IAlertStatus,
  type: 0 | 1 | 2,
  scope: any,
) => {
  if (!isFirefox) {
    // chromium 系浏览器
    if (type === 0) {
      const notificationData: Notifications.CreateNotificationOptions = {
        type: 'basic',
        iconUrl: notificationIconList.resin,
        title: i18n.getMessage('options_Alert_Notify_Title'),
        message: i18n.getMessage('options_Alert_Notify_Resin', [scope.resin]),
        contextMessage: `${scope.name}(${scope.uid}) - ${i18n.getMessage(
          scope.server,
        )}`,
      }

      if (alertStatus.resin === '') {
        // 创建通知
        alertStatus.resin = randomNotificationId()
        notifications.create(alertStatus.resin, notificationData)
      } else {
        // 更新通知
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ret = await notifications.update(
          alertStatus.resin,
          notificationData,
        )

        // if (!_ret) {
        //   alertStatus.resin = randomNotificationId()
        //   notifications.create(alertStatus.resin, notificationData)
        // }
      }
    } else if (type === 1) {
      const notificationData: Notifications.CreateNotificationOptions = {
        type: 'basic',
        iconUrl: notificationIconList.realmCurrency,
        title: i18n.getMessage('options_Alert_Notify_Title'),
        message: i18n.getMessage('options_Alert_Notify_RealmCurrency'),
        contextMessage: `${scope.name}(${scope.uid}) - ${i18n.getMessage(
          scope.server,
        )}`,
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
        contextMessage: `${scope.name}(${scope.uid}) - ${i18n.getMessage(
          scope.server,
        )}`,
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
        message: i18n.getMessage('options_Alert_Notify_Resin_Firefox', [
          `${scope.name}(${scope.uid})`,
          scope.resin,
        ]),
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
        message: i18n.getMessage('options_Alert_Notify_RealmCurrency_Firefox', [
          `${scope.name}(${scope.uid})`,
        ]),
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
        message: i18n.getMessage('options_Alert_Notify_Transformer_Firefox', [
          `${scope.name}(${scope.uid})`,
        ]),
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

// selected uid
let selectedUid = ''

initResponseRules()

const getSelectedUid = async () => {
  return await readDataFromStorage<string>('selectedRole', '')
}

const getRefreshInterval = async () => {
  return await readDataFromStorage<number>('refreshInterval', 30)
}

const setRefreshInterval = async (interval: number) => {
  await writeDataToStorage('refreshInterval', interval)
}

const getBadgeVisibility = async () => {
  return await readDataFromStorage<boolean>('badgeVisibility', true)
}

const setBadgeVisibility = async (visibility: boolean) => {
  await writeDataToStorage('badgeVisibility', visibility)
}

const addNewRoleToList = async function (
  oversea: boolean,
  roleInfo: IRoleDataItem,
  cookie: string,
) {
  // 取出原始 roleList
  const originRoleList = await readDataFromStorage<IUserDataItem[]>(
    'roleList',
    [],
  )

  // 判断是否已经存在
  const isExist = originRoleList.some((item) => {
    return item.uid === roleInfo.game_uid
  })

  // 构造一个 roleItem
  const roleItem: IUserDataItem = {
    isEnabled: true,
    enabledAlert: false,
    uid: roleInfo.game_uid,
    nickname: roleInfo.nickname,
    level: roleInfo.level,
    serverRegion: roleInfo.region,
    serverType: oversea ? 'os' : 'cn',
    cookie,
    data: {} as IUserData,
    updateTimestamp: -1,
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
  alertSettings = await readDataFromStorage<IAlertSetting>(
    'alertSetting',
    defaultAlertSetting,
  )
})()

const doAlertCheck = async function (roleInfo: IUserDataItem) {
  if (!roleInfo.enabledAlert)
    return

  const _notificationStatus: IAlertStatus
    = (await getNotificationItem(roleInfo.uid))
    || (JSON.parse(JSON.stringify(defaultAlertStatus)) as IAlertStatus)

  // 树脂检查
  if (alertSettings.resin) {
    if (roleInfo.data.current_resin >= alertSettings.resinThreshold) {
      showNotification(_notificationStatus, 0, {
        name: roleInfo.nickname,
        uid: roleInfo.uid,
        server: roleInfo.serverRegion,
        resin: roleInfo.data.current_resin,
      })
    } else {
      removeNotification(_notificationStatus, 0)
    }
  }
  // 洞天宝钱检查
  if (alertSettings.realmCurrency) {
    if (
      roleInfo.data.current_home_coin === roleInfo.data.max_home_coin
      && roleInfo.data.current_home_coin > 0
    ) {
      showNotification(_notificationStatus, 1, {
        name: roleInfo.nickname,
        uid: roleInfo.uid,
        server: roleInfo.serverRegion,
      })
    } else {
      removeNotification(_notificationStatus, 1)
    }
  }
  // 参量质变仪检查
  if (alertSettings.transformer) {
    if (
      roleInfo.data.transformer.obtained
      && roleInfo.data.transformer.recovery_time.reached
    ) {
      showNotification(_notificationStatus, 2, {
        name: roleInfo.nickname,
        uid: roleInfo.uid,
        server: roleInfo.serverRegion,
      })
    } else {
      removeNotification(_notificationStatus, 2)
    }
  }

  // 保存通知状态
  await setNotificationItem(roleInfo.uid, _notificationStatus)
}

const getLatestUpdatedTime = function (role: IUserDataItem) {
  return role.updateTimestamp
}

const refreshData = async function (
  uiOnly = false,
  fromPopup = false,
  forceRefresh = false,
) {
  // 取出刷新时间间隔 (原始数据为分钟，这里转换为毫秒)
  // 如果 fromPopup 为 true，则间隔时间设置为 2 分钟
  let refreshInterval = fromPopup
    ? 60 * 1000
    : (await getRefreshInterval()) * 60 * 1000 * 2

  // 如果刷新间隔大于二十分钟，则进行扰动
  if (refreshInterval > 20 * 60 * 1000)
    refreshInterval = refreshInterval + getRandomTimeOffset()

  // 是否显示 badge
  const badgeVisibility = await getBadgeVisibility()

  // 取出原始 roleList
  const originRoleList = await readDataFromStorage<IUserDataItem[]>(
    'roleList',
    [],
  )
  // 取出启用的 role
  const enabledRoleList = originRoleList.filter((item) => {
    return item.isEnabled
  })

  // 如果当前还没有 selectedUid 则获取一个
  let _selectedUid = selectedUid || (await getSelectedUid())

  if (enabledRoleList.length > 0) {
    // 查看选中uid是否已经启用
    if (!enabledRoleList.find((item) => item.uid === _selectedUid)) {
      // 未启用则选中第一个
      _selectedUid = enabledRoleList[0]?.uid
    }
  }

  let hasUpdatedBadge = false
  // 遍历启用的 role
  for (const role of enabledRoleList) {
    // 如果当前时间 - 上次更新时间 < 刷新时间间隔 或 uiOnly==true，则使用缓存
    const useCache
      = (getLatestUpdatedTime(role)
        && Date.now() - getLatestUpdatedTime(role) < refreshInterval)
      || uiOnly
    const data
      = useCache && !forceRefresh
        ? role.data
        : await getRoleDataByCookie(
          role.serverType === 'os',
          role.cookie,
          role.uid,
          role.serverRegion,
          setExtraHeaders,
          resetRules,
        )

    if (Number.isInteger(data)) {
      // error code
      switch (data) {
        case 1034: {
          // risk control

          // 尝试自动解决
          // const __ret = await autoGeetestChallenge(role.uid)
          // if (__ret)
          //   return

          // 获取失败，写入错误信息
          role.isError = true
          role.errorMessage = '触发风控'
          // role.updateTimestamp = Date.now()
          break
        }
      }
    } else if (data && typeof data === 'object') {
      // 更新 roleList
      const roleIndex = originRoleList.findIndex((item) => {
        return item.uid === role.uid
      })

      const _newItem = {
        ...role,
        data,
        isError: false,
        errorMessage: '',
        updateTimestamp: useCache ? role.updateTimestamp : Date.now(),
      }

      originRoleList.splice(roleIndex, 1, _newItem)

      const _copyItem = calcRoleDataLocally(_newItem)

      !uiOnly && (await doAlertCheck(_copyItem))

      if (!badgeVisibility && !hasUpdatedBadge) {
        // 如果设置不显示 badge，则不更新
        action.setBadgeText({ text: '' })
        hasUpdatedBadge = true
      }

      if (!hasUpdatedBadge) {
        let shouldUpdateBadge = false
        if (_selectedUid && _selectedUid === _copyItem.uid)
          shouldUpdateBadge = true // 更新 _selectedUid 当前的 resin 数据到 badge

        if (shouldUpdateBadge && _copyItem?.data?.current_resin) {
          action.setBadgeText({ text: `${_copyItem.data.current_resin}` })
          action.setBadgeBackgroundColor({ color: '#6F9FDF' })
          hasUpdatedBadge = true
        }
      }
    } else {
      // 获取失败，写入错误信息
      role.isError = true
      role.errorMessage = '获取数据失败'
      // role.updateTimestamp = Date.now()
    }
  }

  // 更新 roleList
  !uiOnly && (await writeDataToStorage('roleList', originRoleList))
  !uiOnly && refreshData(true)
}

// 定时器，定时获取玩家数据
const initAlarm = async (interval_time = INTERVAL_TIME) => {
  await alarms.clear('refresh_data')
  alarms.create('refresh_data', { periodInMinutes: interval_time })
}

initAlarm()

alarms.onAlarm.addListener((alarmInfo) => {
  if (alarmInfo.name === 'refresh_data')
    refreshData()
})

refreshData()

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
  return await readDataFromStorage<IAlertSetting>(
    'alertSetting',
    defaultAlertSetting,
  )
})

onMessage<
  {
    resin: boolean
    resinThreshold: number
    transformer: boolean
    realmCurrency: boolean
  },
  'set_alert_setting'
>('set_alert_setting', async ({ data: alertSetting }) => {
  await writeDataToStorage('alertSetting', alertSetting)
})

onMessage('get_role_list', async () => {
  return await readDataFromStorage<IUserDataItem[]>('roleList', [])
})

onMessage('get_selected_role', async () => {
  return await getSelectedUid()
})

onMessage('refresh_request', async () => {
  await refreshData(false, true, false)
  return true
})

onMessage('refresh_request_force', async () => {
  await refreshData(false, true, true)
  return true
})

onMessage<{ uid: string }, 'set_selected_role'>(
  'set_selected_role',
  async ({ data: { uid } }) => {
    selectedUid = uid // update cache
    await writeDataToStorage('selectedRole', uid)
    refreshData(true)
  },
)

onMessage<{ uid: string; status: boolean }, 'set_role_status'>(
  'set_role_status',
  async ({ data: { uid, status } }) => {
    const originRoleList = await readDataFromStorage<IUserDataItem[]>(
      'roleList',
      [],
    )
    const index = originRoleList.findIndex((item) => {
      return item.uid === uid
    })
    const _notificationStatus: IAlertStatus
      = (await getNotificationItem(uid))
      || (JSON.parse(JSON.stringify(defaultAlertStatus)) as IAlertStatus)

    originRoleList[index].isEnabled = status
    // 重置角色提醒状态
    clearNotifications(_notificationStatus)
    await writeDataToStorage('roleList', originRoleList)
    await setNotificationItem(uid, _notificationStatus)
    // 刷新一次数据（仅刷新ui，例如badge/notification）
    refreshData(true)
  },
)

onMessage<{ uid: string; status: boolean }, 'set_role_alert_status'>(
  'set_role_alert_status',
  async ({ data: { uid, status } }) => {
    const originRoleList = await readDataFromStorage<IUserDataItem[]>(
      'roleList',
      [],
    )
    const index = originRoleList.findIndex((item) => {
      return item.uid === uid
    })
    const _notificationStatus: IAlertStatus
      = (await getNotificationItem(uid))
      || (JSON.parse(JSON.stringify(defaultAlertStatus)) as IAlertStatus)

    originRoleList[index].enabledAlert = status
    // 重置角色提醒状态
    clearNotifications(_notificationStatus)
    await writeDataToStorage('roleList', originRoleList)
    await setNotificationItem(uid, _notificationStatus)
  },
)

onMessage<{ uid: string }, 'delete_role_request'>(
  'delete_role_request',
  async ({ data: { uid } }) => {
    // 取出原始 roleList
    const originRoleList = await readDataFromStorage<IUserDataItem[]>(
      'roleList',
      [],
    )
    // 删除 roleUid
    const newRoleList = originRoleList.filter((item) => {
      return item.uid !== uid
    })

    // 更新 roleList
    await writeDataToStorage('roleList', newRoleList)

    return true
  },
)

onMessage<{ oversea: boolean }, 'request_cookie_read'>(
  'request_cookie_read',
  async ({ data: { oversea } }) => {
    let cookie = ''
    // 根据服务器类型获取对应 cookie
    if (oversea)
      cookie = await getHoYoLABCookie()
    else cookie = await getMiHoYoCookie()
    // cookie 获取失败，返回 false
    if (cookie === '')
      return -1

    const result = await getRoleInfoByCookie(
      oversea,
      cookie,
      setExtraHeaders,
      resetRules,
    )

    if (result) {
      for (const item of result) await addNewRoleToList(oversea, item, cookie)
      await refreshData()

      // 清空 cookie
      if (oversea) {
        // 清空 hoyolab cookie
        await clearHoYoLABCookie()
      } else {
        // 清空 mihoyo cookie
        await clearMiHoYoCookie()
      }
      return result.length
    } else {
      return -1
    }
  },
)

onMessage<{ uid: string }, 'create_verification'>(
  'create_verification',
  async ({ data: { uid } }) => {
    return await _createVerification(uid)
  },
)

async function _createVerification(uid: string) {
  const originRoleList = await readDataFromStorage<IUserDataItem[]>(
    'roleList',
    [],
  )
  const index = originRoleList.findIndex((item) => {
    return item.uid === uid
  })
  const cookie = originRoleList[index].cookie
  const oversea = originRoleList[index].serverType === 'os'

  return await createVerification(oversea, cookie, setExtraHeaders, resetRules)
}

onMessage<{ uid: string }, 'request_captcha_bg'>(
  'request_captcha_bg',
  async ({ data: { uid } }) => {
    // open captcha tab
    const curtab = await tabs.create({
      url: 'https://paimon-webext.daidr.me/captcha.html',
    })

    // wait for curtab loaded
    await new Promise((resolve, reject) => {
      const check = async () => {
        if (curtab.id === undefined) {
          reject(new Error('tab id is undefined'))
          return
        }

        const tab = await tabs.get(curtab.id)
        if (tab.status === 'complete')
          resolve(true)
        else setTimeout(check, 100)
      }
      check()
    })

    console.log('tab loaded')

    // send message to captcha tab
    const originRoleList = await readDataFromStorage<IUserDataItem[]>(
      'roleList',
      [],
    )
    const index = originRoleList.findIndex((item) => {
      return item.uid === uid
    })
    const cookie = originRoleList[index].cookie
    const oversea = originRoleList[index].serverType === 'os'

    const verification = await createVerification(
      oversea,
      cookie,
      setExtraHeaders,
      resetRules,
    )
    if (verification && curtab.id)
      await sendMessage(
        'request_captcha',
        { verification, uid, tabId: curtab.id },
        { tabId: curtab.id, context: 'content-script' },
      )
  },
)

onMessage('finish_captcha', async ({ data: { tabId, uid, geetest } }) => {
  const _ret = await _verifyVerification(uid, geetest)
  tabs.remove(tabId)

  return _ret
})

async function _verifyVerification(uid: string, geetest: ICaptchaRequest) {
  const originRoleList = await readDataFromStorage<IUserDataItem[]>(
    'roleList',
    [],
  )
  const index = originRoleList.findIndex((item) => {
    return item.uid === uid
  })

  const cookie = originRoleList[index].cookie
  const oversea = originRoleList[index].serverType === 'os'

  const result = await verifyVerification(
    oversea,
    cookie,
    geetest,
    setExtraHeaders,
    resetRules,
  )

  getRoleInfoByCookie(oversea, cookie, setExtraHeaders, resetRules)
  refreshData(false, false, true)
  return result
}

onMessage('read_settings', async () => {
  const settings = {
    refreshInterval: await getRefreshInterval(),
    badgeVisibility: await getBadgeVisibility(),
  }
  return settings
})

onMessage(
  'write_settings',
  async ({ data: { refreshInterval, badgeVisibility } }) => {
    await setRefreshInterval(refreshInterval)
    await setBadgeVisibility(badgeVisibility)
    await refreshData()
  },
)

async function autoGeetestChallenge(uid: string) {
  const originRoleList = await readDataFromStorage<IUserDataItem[]>(
    'roleList',
    [],
  )
  const index = originRoleList.findIndex((item) => {
    return item.uid === uid
  })
  const oversea = originRoleList[index].serverType === 'os'

  const challenge = await _createVerification(uid)
  if (challenge) {
    const _validate = await getGeetestChallenge(
      oversea,
      challenge.challenge,
      challenge.gt,
      setExtraHeaders,
      resetRules,
    )
    if (_validate) {
      const _ret = await _verifyVerification(uid, {
        geetest_challenge: challenge.challenge,
        geetest_validate: _validate,
        geetest_seccode: `${_validate}|jordan`,
      })
      return _ret
    }
  }
  return false
}
