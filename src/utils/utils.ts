import { storage } from 'webextension-polyfill'
import type { ICaptchaRequest, ICaptchaResponse, IRoleDataItem, IUserData, IUserDataItem, serverRegions } from '../types'
import { md5 } from './md5'
import type { AdvancedHeaders } from './advancedFetch'
import { advancedFetch } from './advancedFetch'

function randomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// 向storage写入数据
export const writeDataToStorage = async function <T>(key: string, data: T) {
  await storage.local.set({ [key]: data })
}

export const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i)

// 从storage读取数据
export const readDataFromStorage = async function <T>(key: string, defaultVal: T): Promise<T> {
  const data = await storage.local.get(key)
  if (data[key] !== undefined)
    return data[key]
  else
    return defaultVal
}

function uuid() {
  return crypto.randomUUID()
}

export function generateSeed(length = 16) {
  const characters = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * characters.length)]
  }
  return result
}

const latestDeviceMetaRandom = 'CMuZH62qyhKEAWR'
const deviceIdNeedUpdate = async () => {
  const deviceId = await readDataFromStorage('deviceId', '')
  if (deviceId === '') {
    return true
  }
  const prevRandom = await readDataFromStorage('deviceIdRandom', '')
  if (prevRandom !== latestDeviceMetaRandom) {
    return true
  }
  return false
}

// 随机生成的 deviceId
export const getDeviceId = async () => {
  // 首先尝试从 storage 中读取 deviceId
  let deviceId = await readDataFromStorage('deviceId', '')

  // 如果 storage 中没有 deviceId，则生成一个新的 deviceId
  if (deviceId === '' || (await deviceIdNeedUpdate())) {
    deviceId = uuid()
    await writeDataToStorage('deviceId', deviceId)
    await writeDataToStorage('deviceIdRandom', latestDeviceMetaRandom)
  }

  return deviceId
}

function getTime(time: number) {
  const hh = ~~(time / 3600)
  const mm = ~~((time % 3600) / 60)

  // return `${hh}小时${mm}分钟`
  return {
    hour: hh,
    minute: mm,
  }
}

function getClock(time: number) {
  const timeNow = Date.now()
  const now = new Date(timeNow)
  const hoursNow = now.getHours()
  const minutesNow = now.getMinutes() * 60 * 1000
  const secondsNow = now.getSeconds() * 1000
  const timeRecovery = new Date(timeNow + time * 1000)

  const tillTomorrow = (24 - hoursNow) * 3600 * 1000
  const tomorrow = new Date(timeNow + tillTomorrow - minutesNow - secondsNow)

  let str = ''
  if (timeRecovery < tomorrow)
    str = 'today'
  else str = 'tomorrow'

  return {
    day: str as 'today' | 'tomorrow',
    hour: timeRecovery.getHours().toString().padStart(2, '0'),
    minute: timeRecovery.getMinutes().toString().padStart(2, '0'),
  }
}

function stringifyParams(params: Record<string, string>) {
  // 字典序处理
  const keys = Object.keys(params)
  keys.sort()
  const values: string[] = []
  keys.forEach(key => {
    values.push(`${key}=${params[key]}`)
  })

  // 转字符串
  const paramsStr = values.join('&')
  return paramsStr
}

function getDS(oversea: boolean, params: Record<string, string>, body: object) {
  const timestamp = Math.floor(Date.now() / 1000)
  const randomStr = randomIntFromInterval(100000, 200000)
  const bodyStr = (body && Object.keys(body).length > 0) ? JSON.stringify(body) : ''
  const paramStr = (params && Object.keys(params).length > 0) ? stringifyParams(params) : ''
  const salt = oversea ? 'okr4obncj8bw5a65hbnn5oo6ixjc3l9w' : 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
  const text = `salt=${salt}&t=${timestamp}&r=${randomStr}&b=${bodyStr}&q=${paramStr}`
  const sign = md5(text)
  return `${timestamp},${randomStr},${sign}`
}

const MIYOUSHE_VERSION = '2.50.1'

const HEADER_TEMPLATE_CN: Record<string, string> = {
  'x-rpc-app_version': MIYOUSHE_VERSION,
  'User-Agent': `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${MIYOUSHE_VERSION}`,
  'x-rpc-client_type': '5',
  'x-rpc-sys_version': '17.1',
  'x-rpc-tool_version': 'v4.2.2-ys',
  'x-rpc-device_name': 'iPhone',
  'Origin': 'https://webstatic.mihoyo.com',
  'X-Requested-With': 'com.mihoyo.hyperion',
  'x-rpc-page': 'v4.2.2-ys_#/ys/daily',
  'Referer': 'https://webstatic.mihoyo.com/',
  'sec-fetch-dest': 'empty',
  'sec-fetch-site': 'same-site',
}

const HEADER_TEMPLATE_OS: Record<string, string> = {
  'x-rpc-app_version': '2.22.0',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBSOversea/2.22.0',
  'x-rpc-client_type': '2',
  'Origin': 'https://act.hoyolab.com',
  'X-Requested-With': 'com.mihoyo.hoyolab',
  'Referer': 'https://act.hoyolab.com',
}

async function getHeader(
  oversea: boolean,
  params: Record<string, string>,
  body: object,
  ds: boolean,
) {
  const client = oversea ? HEADER_TEMPLATE_OS : HEADER_TEMPLATE_CN
  const headers = { ...client }

  if (ds) {
    const dsStr = getDS(oversea, params, body)
    headers.DS = dsStr
  }

  headers['x-rpc-device_id'] = (await getDeviceId()).toUpperCase()
  return headers
}

async function getRoleInfoByCookie(oversea: boolean, cookie: string): Promise<IRoleDataItem[] | false> {
  // 根据 oversea 参数选择对应 api 地址
  const url = oversea
    ? 'https://api-os-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_global'
    : 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookieToken?game_biz=hk4e_cn'

  // 生成 header
  const headers = await getHeader(oversea, {}, {}, false)

  headers.Cookie = cookie

  // 发送请求
  const _ret = await advancedFetch(url, {
    method: 'GET',
    headers,
  })
    .then(response => {
      return response.json()
    })
    .then((data) => {
      if (data.retcode === 0)
        return data.data.list
      else
        return false
    })
    .catch(() => {
      return false
    })
  return _ret
}

async function getRoleDataByCookie(oversea: boolean, cookie: string, role_id: string, serverRegion: serverRegions): Promise<IUserData | false | number> {
  // 根据 oversea 参数选择对应 api 地址
  const url = new URL(oversea ? 'https://bbs-api-os.hoyolab.com/game_record/app/genshin/api/dailyNote' : 'https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/dailyNote')

  // 补全 url query
  const params = {
    role_id,
    server: serverRegion,
  }

  for (const [key, value] of Object.entries(params))
    url.searchParams.append(key, value)

  // 生成 header
  const headers = await getHeader(oversea, params, {}, true)

  if (!oversea) {
    // 为 header 追加 fp
    cookie = await appendDeviceFp(headers, role_id, cookie)
    await appendChallenge(headers, role_id)
  }

  headers.Cookie = cookie

  // 发送请求
  const _ret = await advancedFetch(url.toString(), {
    method: 'GET',
    headers,
  })
    .then(async (response) => {
      const headers = response.headers
      await writeDataToStorage(
        `traceId_${role_id}`,
        headers.get('x-trace-id') || '',
      )
      return response.json()
    })
    .then((data) => {
      if (data.retcode === 0) {
        return data.data
      } else if ([1034].includes(data.retcode)) {
        // risk control
        return 1034
      } else {
        writeDataToStorage(`deviceFp_${role_id}_request`, true)
        return false
      }
    })
    .catch(() => {
      return false
    })
  return _ret
}

async function createVerification(
  oversea: boolean,
  cookie: string,
  uid: string,
): Promise<ICaptchaResponse | false> {
  // 根据 oversea 参数选择对应 api 地址
  const url = new URL(
    oversea
      ? 'https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/createVerification'
      : 'https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/createVerification',
  )

  // 补全 url query
  const params = {
    is_high: 'true',
  }

  for (const [key, value] of Object.entries(params))
    url.searchParams.append(key, value)

  // 生成 header
  const headers = await getHeader(oversea, params, {}, true)

  // 为 header 追加 cookie
  headers.Cookie = cookie

  // 为 header 追加 x-rpc-challenge_path
  headers['x-rpc-challenge_path']
    = 'https://api-takumi-record.mihoyo.com/game_record/genshin/api/dailyNote'

  const traceId = await readDataFromStorage(`traceId_${uid}`, '')

  if (traceId !== '') {
    headers['x-rpc-challenge_trace'] = traceId
  }

  if (!oversea) {
    // 为 header 追加 fp
    cookie = await appendDeviceFp(headers, uid, cookie)
  }

  // 发送请求
  const _ret = await advancedFetch(url.toString(), {
    method: 'GET',
    headers,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.retcode === 0)
        return data.data
      else return false
    })
    .catch(() => {
      return false
    })
  return _ret
}

async function verifyVerification(
  oversea: boolean,
  cookie: string,
  geetest: ICaptchaRequest,
  uid: string,
): Promise<boolean> {
  // 根据 oversea 参数选择对应 api 地址
  const url = new URL(
    oversea
      ? 'https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/verifyVerification'
      : 'https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/verifyVerification',
  )

  // 生成 header
  const headers = await getHeader(oversea, {}, geetest, true)

  // 为 header 追加 cookie
  headers.Cookie = cookie

  // 为 header 追加 x-rpc-challenge_path
  headers['x-rpc-challenge_path']
    = 'https://api-takumi-record.mihoyo.com/game_record/genshin/api/dailyNote'
  // headers['x-rpc-challenge_game'] = '5'

  const traceId = await readDataFromStorage(`traceId_${uid}`, '')

  if (traceId !== '') {
    headers['x-rpc-challenge_trace'] = traceId
  }

  // 发送请求
  const _ret = await advancedFetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(geetest),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.retcode === 0) {
        writeDataToStorage(`challenge_${uid}`, data.data.challenge)
        return data.data
      } else {
        return false
      }
    })
    .catch(() => {
      return false
    })
  return _ret
}

export async function getUserFullInfo(cookie: string): Promise<any> {
  const url = 'https://bbs-api.mihoyo.com/user/wapi/getUserFullInfo?gids=2'
  const headers = {
    Cookie: cookie,
    Accept: 'application/json, text/plain, */*',
    Connection: 'keep-alive',
    Host: 'bbs-api.mihoyo.com',
    Origin: 'https://m.bbs.mihoyo.com',
    Referer: ' https://m.bbs.mihoyo.com/',
  }
  let res = await advancedFetch(url, {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    return false
  }
  res = await res.json()
  return res
}

const calcRoleDataLocally = (role: IUserDataItem): IUserDataItem => {
  const _role = JSON.parse(JSON.stringify(role))

  const updateTimestamp = _role.updateTimestamp
  const curTimestamp = Date.now()

  const maxResin = _role.data.max_resin
  const curResin = _role.data.current_resin

  // 树脂每 8 分钟恢复 1 点
  _role.data.current_resin = Math.min(maxResin, curResin + Math.floor((curTimestamp - updateTimestamp) / 1000 / 60 / 8))

  // 更新树脂恢复时间 秒
  _role.data.resin_recover_time = _role.data.resin_recovery_time - Math.floor((curTimestamp - updateTimestamp) / 1000)

  if (_role.data.expeditions && _role.data.expeditions.length > 0) {
    for (const expedition of _role.data.expeditions) {
      if (expedition.status === 'Ongoing') {
        // 单位为 秒
        const remainTime = Number(expedition.remained_time)
        expedition.remained_time = Math.max(0, remainTime - Math.floor((curTimestamp - updateTimestamp) / 1000)).toString()
        if (expedition.remained_time === '0')
          expedition.status = 'Finished'
      }
    }
  }

  return _role
}

async function getGeetestChallenge(oversea: boolean, challenge: string, gt: string): Promise<string | false> {
  const url = `https://apiv6.geetest.com/ajax.php?pt=3&client_type=web_mobile&lang=zh-cn&challenge=${challenge}&gt=${gt}`

  // 为 header 追加 cookie
  const headers = await getHeader(oversea, {}, {}, false)

  // 发送请求
  const _ret = await advancedFetch(url, {
    method: 'GET',
    headers,
  })
    .then(response => {
      const data = response.text()
      return data
    })
    .then(text => {
      const bracketLeft = text.indexOf('{')
      const bracketRight = text.lastIndexOf('}')
      return JSON.parse(text.substring(bracketLeft, bracketRight + 1))
    })
    .then((data) => {
      if (data.status === 'success') {
        if (data.data.result === 'success' && data.data.validate) {
          return data.data.validate
        } else {
          return false
        }
      }
      else { return false }
    })
    .catch(() => {
      return false
    })
  return _ret
}

export const randomStr = (length: number) => {
  let str = ''
  for (let i = 0; i < length; i++) {
    str += Math.floor(Math.random() * 10)
  }
  return str
}

export const generateDeviceFp = async (cookie: string, uid: string) => {
  const seed = uuid()
  const time = `${Date.now()}`
  const deviceId = await getDeviceId()
  const oldDeviceFp = await readDataFromStorage(`deviceFp_${uid}`, '')
  const model = randomStr(6)
  const ext_fields = JSON.stringify({
    cpuType: 'arm64-v8a',
    romCapacity: '512',
    productName: model,
    romRemain: '256',
    manufacturer: 'Xiaomi',
    appMemory: '512',
    hostname: 'dg02-pool03-kvm87',
    screenSize: '1080x1920',
    osVersion: '13',
    aaid: '',
    vendor: '中国移动',
    accelerometer: 'true',
    buildTags: 'release-keys',
    model,
    brand: 'Xiaomi',
    oaid: '',
    hardware: 'qcom',
    deviceType: 'OP5913L1',
    devId: 'unknown',
    serialNumber: 'unknown',
    buildTime: '1588876800000',
    buildUser: 'root',
    ramCapacity: '2048',
    magnetometer: 'true',
    display: `OP5913L1-user ${model} 10 QKQ1.190825.002 V12.0.1.0.QFJCNXM release-keys`,
    ramRemain: '1024',
    deviceInfo: 'unknown',
    gyroscope: 'true',
    vaid: '',
    buildType: 'user',
    sdkVersion: '29',
    board: 'sdm660',
  })
  const body = {
    seed_id: seed,
    device_id: deviceId.toUpperCase(),
    bbs_device_id: deviceId,
    platform: '2',
    seed_time: time,
    ext_fields,
    app_name: 'bbs_cn',
    device_fp: generateSeed(13),
  }

  const url = 'https://public-data-api.mihoyo.com/device-fp/api/getFp'

  // 生成 header
  const headers = await getHeader(false, {}, body, false)
  // 为 header 追加 cookie
  {
    const seed = await readDataFromStorage(`deviceFp_seed_${uid}`, '')
    const time = await readDataFromStorage(`deviceFp_time_${uid}`, '')

    headers.Cookie = `DEVICEFP_SEED_ID=${seed};DEVICEFP_SEED_TIME=${time};DEVICEFP=${oldDeviceFp};${cookie};`
  }

  // 发送请求
  const _ret = await advancedFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
    .then((response) => {
      return response.json()
    })
    .then((data) => {
      if (data.data.code === 200) {
        return [seed, time, data.data.device_fp]
      } else {
        console.error(new Error(`generateDeviceFp failed: ${data.data.msg}`))
        return [seed, time, generateSeed(13)]
      }
    })
    .catch((e) => {
      console.error(e)
      return [seed, time, generateSeed(13)]
    })
  return _ret
}

async function appendDeviceFp(
  headers: AdvancedHeaders,
  uid: string,
  cookie: string,
) {
  const deviceFpRefreshRequest = await readDataFromStorage(
    `deviceFp_${uid}_request`,
    false,
  )

  let deviceFp = await readDataFromStorage(`deviceFp_${uid}`, '')
  let seed = await readDataFromStorage(`deviceFp_seed_${uid}`, '')
  let time = await readDataFromStorage(`deviceFp_time_${uid}`, '')

  // 如果 storage 中没有 deviceId，则生成一个新的 deviceId
  if (deviceFp === '' || deviceFpRefreshRequest) {
    [seed, time, deviceFp] = await generateDeviceFp(cookie, uid)
    await writeDataToStorage(`deviceFp_${uid}`, deviceFp)
    await writeDataToStorage(`deviceFp_seed_${uid}`, seed)
    await writeDataToStorage(`deviceFp_time_${uid}`, time)
    await writeDataToStorage(`deviceFp_${uid}_request`, false)
  }
  headers['x-rpc-device_fp'] = deviceFp
  return `DEVICEFP_SEED_ID=${seed};DEVICEFP_SEED_TIME=${time};DEVICEFP=${deviceFp};${cookie};`
}

async function appendChallenge(headers: AdvancedHeaders, uid: string) {
  const challenge = await readDataFromStorage(`challenge_${uid}`, '')

  // 如果 storage 中没有 deviceId，则生成一个新的 deviceId
  if (challenge === '') {
    return headers
  }
  headers['x-rpc-chellange'] = challenge
  await writeDataToStorage(`challenge_${uid}`, '')
  return headers
}

export {
  md5,
  randomIntFromInterval,
  getTime,
  getClock,
  getDS,
  getHeader,
  getRoleInfoByCookie,
  getRoleDataByCookie,
  createVerification,
  verifyVerification,
  calcRoleDataLocally,
  getGeetestChallenge,
}

// 随机生成-5到5的整数
export const getRandomTimeOffset = () => {
  return Math.floor(Math.random() * 11) - 5
}
