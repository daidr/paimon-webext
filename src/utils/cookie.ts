import type { Cookies } from 'webextension-polyfill'
import { cookies } from 'webextension-polyfill'

// 获取国服cookie
export const getMiHoYoCookie = async function () {
  let cookieString = ''
  let _cookies = await cookies.getAll({ domain: 'miyoushe.com' })
  // 过滤name相同的cookies
  _cookies = _cookies.filter(
    (cookie, index, self) =>
      self.findIndex((t) => t.name === cookie.name) === index,
  )
  if (_cookies.length !== 0) {
    cookieString = ''
    for (const cookie of _cookies)
      cookieString += `${cookie.name}=${cookie.value};`
    return cookieString
  } else {
    return ''
  }
}

// 获取海外cookie
export const getHoYoLABCookie = async function () {
  let cookieString = ''
  const _cookies = await cookies.getAll({ domain: 'hoyolab.com' })
  if (_cookies.length !== 0) {
    cookieString = ''
    for (const cookie of _cookies)
      cookieString += `${cookie.name}=${cookie.value};`
    return cookieString
  } else {
    return ''
  }
}

export const clearMiHoYoCookie = async function () {
  const originCookieList: Cookies.Cookie[] = await cookies.getAll({
    domain: 'miyoushe.com',
  })
  const cookieList: Cookies.RemoveDetailsType[] = originCookieList.map(
    (cookie) => ({
      name: cookie.name,
      url: 'https://miyoushe.com',
    }),
  )
  for (const cookie of cookieList) await cookies.remove(cookie)
}

export const clearHoYoLABCookie = async function () {
  const originCookieList: Cookies.Cookie[] = await cookies.getAll({
    domain: 'hoyolab.com',
  })
  const cookieList: Cookies.RemoveDetailsType[] = originCookieList.map(
    (cookie) => ({
      name: cookie.name,
      url: 'https://hoyolab.com',
    }),
  )

  for (const cookie of cookieList) await cookies.remove(cookie)
}
