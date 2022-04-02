// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cookies, storage } from 'webextension-polyfill'
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
    await storage.local.set({ hoyo_cookies: cookieString })
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

const getData = async(force = false) => {
  if (
    !(await storage.local.get('hoyo_cookies')).hoyo_cookies
    || !(await storage.local.get('genshin_uid')).genshin_uid
    || !(await storage.local.get('genshin_server')).genshin_server
  ) {
    console.warn('未初始化')
    return false
  }

  const randomStr = randomIntFromInterval(100000, 200000)
  const timestamp = Math.floor(Date.now() / 1000)

  const role_id = (await storage.local.get('genshin_uid')).genshin_uid
  const server = SERVER_LIST[Number((await storage.local.get('genshin_server')).genshin_server)]
  if (!SERVER_LIST.includes(server)) return false
  if (
    new Date().getTime() - (Number((await storage.local.get('last_update_time')).last_update_time) || 0)
      < INTERVAL_TIME - 100
    && !force
  )
    return false
  await storage.local.set({ last_update_time: new Date().getTime() })
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
    'Cookie': (await storage.local.get('hoyo_cookies')).hoyo_cookies,
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
        storage.local.set({ error_msg: '-2' })
      }
      else {
        storage.local.set({ genshin_data: JSON.stringify(data.data) })
        storage.local.set({ error_msg: '' })
      }
    })
    .catch((e) => {
      console.error(e)
      storage.local.set({ error_msg: '-1' })
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
