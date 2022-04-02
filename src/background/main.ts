// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cookies } from 'webextension-polyfill'
import {
  storageCookies,
  storageGameServer,
  storageGameUid,
  storageErrorMessage,
  storageUserData,
  storageLastUpdateTime,
} from '~/logic/storage'
import { md5, randomIntFromInterval } from '~/utils.js'

const SERVER_LIST = ['cn_gf01', 'cn_qd01']
// 一分钟
const INTERVAL_TIME = 60 * 1000

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
}

browser.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log('Extension installed')
})

const getCookie = async function() {
  let cookieString = ''
  const _cookies = await cookies.getAll({ domain: 'mihoyo.com' })
  if (_cookies.length !== 0) {
    cookieString = ''
    for (const cookie of _cookies)
      cookieString += `${cookie.name}=${encodeURIComponent(cookie.value)};`

    storageCookies.value = cookieString
    return true
  }
  else {
    return false
  }
}

const refreshCookieAction = () => {
  // eslint-disable-next-line no-console
  console.log('刷新cookie')
  return getCookie()
}

const getData = (force = false) => {
  if (
    !storageCookies.value
    || !storageGameServer.value
    || !storageGameUid.value
  ) {
    console.warn('未初始化')
    return false
  }

  const randomStr = randomIntFromInterval(100000, 200000)
  const timestamp = Math.floor(Date.now() / 1000)

  const role_id = storageGameUid.value
  const server = SERVER_LIST[storageGameServer.value]
  if (!SERVER_LIST.includes(server)) return false
  if (
    new Date().getTime() - (Number(storageLastUpdateTime.value) || 0)
      < INTERVAL_TIME - 100
    && !force
  )
    return false

  storageLastUpdateTime.value = new Date().getTime()
  const sign = md5(
    `salt=xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs&t=${timestamp}&r=${randomStr}&b=&q=role_id=${role_id}&server=${server}`,
  )
  const headers = new Headers({
    'DS': `${timestamp},${randomStr},${sign}`,
    'x-rpc-app_version': '2.19.1',
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/2.11.1',
    'x-rpc-client_type': '5',
    'Referer': 'https://webstatic.mihoyo.com/',
    'Cookie': storageCookies.value,
  })
  const req = new Request(
    `https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/dailyNote?server=${server}&role_id=${role_id}`,
    {
      method: 'get',
      headers,
    },
  )

  fetch(req)
    .then(response => response.json())
    .then((data) => {
      if (data.retcode !== 0) {
        storageErrorMessage.value = '-2'
      }
      else {
        storageUserData.value = JSON.stringify(data.data)
        storageErrorMessage.value = ''
      }
    })
    .catch(() => {
      storageErrorMessage.value = '-1'
    })
}

const forceRefreshAction = () => {
  // eslint-disable-next-line no-console
  console.log('强制刷新信息')
  return getData(true)
}

// 定时器，定时获取玩家数据
setInterval(() => {
  getData()
}, INTERVAL_TIME);

(() => {
  setTimeout(() => {
    getData()
  }, 1000)
})()

Object.assign(window, { refreshCookieAction, forceRefreshAction })
