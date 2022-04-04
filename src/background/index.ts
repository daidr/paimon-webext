// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { onMessage } from 'webext-bridge'
import { cookies, storage, alarms } from 'webextension-polyfill'
import { md5, randomIntFromInterval } from '~/utils.js'

const SERVER_LIST = ['cn_gf01', 'cn_qd01']
// 一分钟
const INTERVAL_TIME = 1

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

const refreshCookieAction = async() => {
  // eslint-disable-next-line no-console
  console.log('刷新cookie')
  return await getCookie()
}

const getData = async(force = false) => {
  if (
    !(await storage.local.get('hoyo_cookies'))?.hoyo_cookies
    || !(await storage.local.get('genshin_uid'))?.genshin_uid
    || !(await storage.local.get('genshin_server'))?.genshin_server
  ) {
    console.warn('未初始化')
    return false
  }

  const randomStr = randomIntFromInterval(100000, 200000)
  const timestamp = Math.floor(Date.now() / 1000)

  const role_id = (await storage.local.get('genshin_uid'))?.genshin_uid
  const server
    = SERVER_LIST[
      Number((await storage.local.get('genshin_server'))?.genshin_server)
    ]
  if (!SERVER_LIST.includes(server)) return false
  if (
    new Date().getTime()
      - (Number(
        (await storage.local.get('last_update_time'))?.last_update_time,
      ) || 0)
      < INTERVAL_TIME * 60 * 1000 - 100
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
    'Cookie': (await storage.local.get('hoyo_cookies'))?.hoyo_cookies,
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

onMessage('refresh_cookie', refreshCookieAction)
onMessage('force_refresh', forceRefreshAction)

onMessage('get_data', async({ data }) => {
  const { dataType } = data
  switch (dataType) {
    case 'genshin_data':
      return (await storage.local.get('genshin_data'))?.genshin_data
    case 'genshin_uid':
      return (await storage.local.get('genshin_uid'))?.genshin_uid
    case 'genshin_server':
      return (await storage.local.get('genshin_server'))?.genshin_server
    case 'hoyo_cookies':
      return (await storage.local.get('hoyo_cookies'))?.hoyo_cookies
    case 'error_msg':
      return (await storage.local.get('error_msg'))?.error_msg
    default:
      return undefined
  }
})

// 定时器，定时获取玩家数据
alarms.create('refresh_data', { periodInMinutes: INTERVAL_TIME })
alarms.onAlarm.addListener((alarmInfo) => {
  if (alarmInfo.name === 'refresh_data') getData()
});

(() => {
  setTimeout(() => {
    getData()
  }, 1000)
})()
