import { IRoleDataItem, IUserData, serverRegions } from './types'

function randomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function md5(string: string) {
  function md5_RotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
  }
  function md5_AddUnsigned(lX: number, lY: number) {
    const lX8 = lX & 0x80000000
    const lY8 = lY & 0x80000000
    const lX4 = lX & 0x40000000
    const lY4 = lY & 0x40000000
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF)
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8

    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xC0000000 ^ lX8 ^ lY8
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8
    }
    else {
      return lResult ^ lX8 ^ lY8
    }
  }
  function md5_F(x: number, y: number, z: number) {
    return (x & y) | (~x & z)
  }
  function md5_G(x: number, y: number, z: number) {
    return (x & z) | (y & ~z)
  }
  function md5_H(x: number, y: number, z: number) {
    return x ^ y ^ z
  }
  function md5_I(x: number, y: number, z: number) {
    return y ^ (x | ~z)
  }
  function md5_FF(
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    ac: number,
  ) {
    a = md5_AddUnsigned(
      a,
      md5_AddUnsigned(md5_AddUnsigned(md5_F(b, c, d), x), ac),
    )
    return md5_AddUnsigned(md5_RotateLeft(a, s), b)
  }
  function md5_GG(
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    ac: number,
  ) {
    a = md5_AddUnsigned(
      a,
      md5_AddUnsigned(md5_AddUnsigned(md5_G(b, c, d), x), ac),
    )
    return md5_AddUnsigned(md5_RotateLeft(a, s), b)
  }
  function md5_HH(
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    ac: number,
  ) {
    a = md5_AddUnsigned(
      a,
      md5_AddUnsigned(md5_AddUnsigned(md5_H(b, c, d), x), ac),
    )
    return md5_AddUnsigned(md5_RotateLeft(a, s), b)
  }
  function md5_II(
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    ac: number,
  ) {
    a = md5_AddUnsigned(
      a,
      md5_AddUnsigned(md5_AddUnsigned(md5_I(b, c, d), x), ac),
    )
    return md5_AddUnsigned(md5_RotateLeft(a, s), b)
  }
  function md5_ConvertToWordArray(string: string) {
    let lWordCount
    const lMessageLength = string.length
    const lNumberOfWords_temp1 = lMessageLength + 8
    const lNumberOfWords_temp2
      = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16
    const lWordArray = Array(lNumberOfWords - 1)
    let lBytePosition = 0
    let lByteCount = 0
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4
      lBytePosition = (lByteCount % 4) * 8
      lWordArray[lWordCount]
        = lWordArray[lWordCount]
        | (string.charCodeAt(lByteCount) << lBytePosition)
      lByteCount++
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4
    lBytePosition = (lByteCount % 4) * 8
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
    return lWordArray
  }
  function md5_WordToHex(lValue: number) {
    let WordToHexValue = ''
    let WordToHexValue_temp = ''
    let lByte
    let lCount
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255
      WordToHexValue_temp = `0${lByte.toString(16)}`
      WordToHexValue
        = WordToHexValue
        + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2)
    }
    return WordToHexValue
  }
  function md5_Utf8Encode(string: string) {
    string = string.replace(/\r\n/g, '\n')
    let utftext = ''
    for (let n = 0; n < string.length; n++) {
      const c = string.charCodeAt(n)
      if (c < 128) {
        utftext += String.fromCharCode(c)
      }
      else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192)
        utftext += String.fromCharCode((c & 63) | 128)
      }
      else {
        utftext += String.fromCharCode((c >> 12) | 224)
        utftext += String.fromCharCode(((c >> 6) & 63) | 128)
        utftext += String.fromCharCode((c & 63) | 128)
      }
    }
    return utftext
  }
  let x = []
  let k, AA, BB, CC, DD, a, b, c, d
  const S11 = 7
  const S12 = 12
  const S13 = 17
  const S14 = 22
  const S21 = 5
  const S22 = 9
  const S23 = 14
  const S24 = 20
  const S31 = 4
  const S32 = 11
  const S33 = 16
  const S34 = 23
  const S41 = 6
  const S42 = 10
  const S43 = 15
  const S44 = 21
  string = md5_Utf8Encode(string)
  x = md5_ConvertToWordArray(string)
  a = 0x67452301
  b = 0xEFCDAB89
  c = 0x98BADCFE
  d = 0x10325476
  for (k = 0; k < x.length; k += 16) {
    AA = a
    BB = b
    CC = c
    DD = d
    a = md5_FF(a, b, c, d, x[k + 0], S11, 0xD76AA478)
    d = md5_FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756)
    c = md5_FF(c, d, a, b, x[k + 2], S13, 0x242070DB)
    b = md5_FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE)
    a = md5_FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF)
    d = md5_FF(d, a, b, c, x[k + 5], S12, 0x4787C62A)
    c = md5_FF(c, d, a, b, x[k + 6], S13, 0xA8304613)
    b = md5_FF(b, c, d, a, x[k + 7], S14, 0xFD469501)
    a = md5_FF(a, b, c, d, x[k + 8], S11, 0x698098D8)
    d = md5_FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF)
    c = md5_FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1)
    b = md5_FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE)
    a = md5_FF(a, b, c, d, x[k + 12], S11, 0x6B901122)
    d = md5_FF(d, a, b, c, x[k + 13], S12, 0xFD987193)
    c = md5_FF(c, d, a, b, x[k + 14], S13, 0xA679438E)
    b = md5_FF(b, c, d, a, x[k + 15], S14, 0x49B40821)
    a = md5_GG(a, b, c, d, x[k + 1], S21, 0xF61E2562)
    d = md5_GG(d, a, b, c, x[k + 6], S22, 0xC040B340)
    c = md5_GG(c, d, a, b, x[k + 11], S23, 0x265E5A51)
    b = md5_GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA)
    a = md5_GG(a, b, c, d, x[k + 5], S21, 0xD62F105D)
    d = md5_GG(d, a, b, c, x[k + 10], S22, 0x2441453)
    c = md5_GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681)
    b = md5_GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8)
    a = md5_GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6)
    d = md5_GG(d, a, b, c, x[k + 14], S22, 0xC33707D6)
    c = md5_GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87)
    b = md5_GG(b, c, d, a, x[k + 8], S24, 0x455A14ED)
    a = md5_GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905)
    d = md5_GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8)
    c = md5_GG(c, d, a, b, x[k + 7], S23, 0x676F02D9)
    b = md5_GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A)
    a = md5_HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942)
    d = md5_HH(d, a, b, c, x[k + 8], S32, 0x8771F681)
    c = md5_HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122)
    b = md5_HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C)
    a = md5_HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44)
    d = md5_HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9)
    c = md5_HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60)
    b = md5_HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70)
    a = md5_HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6)
    d = md5_HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA)
    c = md5_HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085)
    b = md5_HH(b, c, d, a, x[k + 6], S34, 0x4881D05)
    a = md5_HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039)
    d = md5_HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5)
    c = md5_HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8)
    b = md5_HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665)
    a = md5_II(a, b, c, d, x[k + 0], S41, 0xF4292244)
    d = md5_II(d, a, b, c, x[k + 7], S42, 0x432AFF97)
    c = md5_II(c, d, a, b, x[k + 14], S43, 0xAB9423A7)
    b = md5_II(b, c, d, a, x[k + 5], S44, 0xFC93A039)
    a = md5_II(a, b, c, d, x[k + 12], S41, 0x655B59C3)
    d = md5_II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92)
    c = md5_II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D)
    b = md5_II(b, c, d, a, x[k + 1], S44, 0x85845DD1)
    a = md5_II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F)
    d = md5_II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0)
    c = md5_II(c, d, a, b, x[k + 6], S43, 0xA3014314)
    b = md5_II(b, c, d, a, x[k + 13], S44, 0x4E0811A1)
    a = md5_II(a, b, c, d, x[k + 4], S41, 0xF7537E82)
    d = md5_II(d, a, b, c, x[k + 11], S42, 0xBD3AF235)
    c = md5_II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB)
    b = md5_II(b, c, d, a, x[k + 9], S44, 0xEB86D391)
    a = md5_AddUnsigned(a, AA)
    b = md5_AddUnsigned(b, BB)
    c = md5_AddUnsigned(c, CC)
    d = md5_AddUnsigned(d, DD)
  }
  return (
    md5_WordToHex(a)
    + md5_WordToHex(b)
    + md5_WordToHex(c)
    + md5_WordToHex(d)
  ).toLowerCase()
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
  if (timeRecovery < tomorrow) str = 'today'
  else str = 'tomorrow'

  // return ` ${str}, ${timeRecovery.getHours()}点${timeRecovery.getMinutes()}分`
  return {
    day: str,
    hour: timeRecovery.getHours(),
    minute: timeRecovery.getMinutes(),
  }
}

function stringifyParams(params: { [key: string]: string }) {
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

function getDS(oversea: boolean, params: { [key: string]: string }, body: object) {
  const timestamp = Math.floor(Date.now() / 1000)
  const randomStr = randomIntFromInterval(100000, 200000)
  const bodyStr = (body && Object.keys(body).length > 0) ? JSON.stringify(body) : ''
  const paramStr = (params && Object.keys(params).length > 0) ? stringifyParams(params) : ''
  const salt = oversea ? 'okr4obncj8bw5a65hbnn5oo6ixjc3l9w' : 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
  const text = `salt=${salt}&t=${timestamp}&r=${randomStr}&b=${bodyStr}&q=${paramStr}`
  const sign = md5(text)
  return `${timestamp},${randomStr},${sign}`
}

const HEADER_TEMPLATE_CN: { [key: string]: string } = {
  'x-rpc-app_version': '2.23.1',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mi 10 Pro Build/SKQ1.211006.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36 miHoYoBBS/2.23.1',
  'x-rpc-client_type': '5',
  'Origin': 'https://webstatic.mihoyo.com',
  'X-Requested-With': 'com.mihoyo.hyperion',
  'Referer': 'https://webstatic.mihoyo.com/',
}

const HEADER_TEMPLATE_OS: { [key: string]: string } = {
  'x-rpc-app_version': '2.9.0',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mi 10 Pro Build/SKQ1.211006.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36 miHoYoBBSOversea/2.9.0',
  'x-rpc-client_type': '2',
  'Origin': 'https://webstatic-sea.hoyolab.com',
  'X-Requested-With': 'com.mihoyo.hoyolab',
  'Referer': 'https://webstatic-sea.hoyolab.com',
}

function getHeader(oversea: boolean, params: { [key: string]: string }, body: object, ds: boolean) {
  const client = oversea ? HEADER_TEMPLATE_OS : HEADER_TEMPLATE_CN
  const header = new Headers()
  Object.keys(client).forEach(key => {
    header.append(key, client[key])
  })

  if (ds) {
    const dsStr = getDS(oversea, params, body)
    header.append('DS', dsStr)
  }
  return header
}

async function getRoleInfoByCookie(oversea: boolean, cookie: string, setCookie?: Function): Promise<IRoleDataItem[] | false> {
  // 根据 oversea 参数选择对应 api 地址
  const url = oversea
    ? 'https://api-os-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_global'
    : 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn'

  // 生成 header
  const headers = getHeader(oversea, {}, {}, false)

  // 为 header 追加 cookie
  headers.append('Cookie', cookie)
  setCookie && setCookie(cookie, headers)

  // 构造请求
  const req = new Request(
    url,
    {
      method: 'get',
      headers,
    },
  )

  // 发送请求
  return await fetch(req)
    .then(response => response.json())
    .then((data) => {
      if (data.retcode === 0)
        return data.data.list
      else
        return false
    })
    .catch(() => {
      return false
    })
}

async function getRoleDataByCookie(oversea: boolean, cookie: string, role_id: string, serverRegion: serverRegions, setCookie?: Function): Promise<IUserData | false> {
  // 根据 oversea 参数选择对应 api 地址
  const url = new URL(oversea ? 'https://bbs-api-os.hoyolab.com/game_record/app/genshin/api/dailyNote' : 'https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/dailyNote')

  // 补全 url query
  const params = {
    server: serverRegion,
    role_id,
  }

  for (const [key, value] of Object.entries(params))
    url.searchParams.append(key, value)

  // 生成 header
  const headers = getHeader(oversea, params, {}, true)

  // 为 header 追加 cookie
  headers.append('Cookie', cookie)
  setCookie && setCookie(cookie, headers)

  // 构造请求
  const req = new Request(
    url.toString(),
    {
      method: 'get',
      headers,
    },
  )

  // 发送请求
  return await fetch(req)
    .then(response => response.json())
    .then((data) => {
      if (data.retcode === 0)
        return data.data
      else
        return false
    })
    .catch(() => {
      return false
    })
}

export { md5, randomIntFromInterval, getTime, getClock, getDS, getHeader, getRoleInfoByCookie, getRoleDataByCookie }
