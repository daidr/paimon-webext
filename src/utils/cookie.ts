import type { Cookies } from 'webextension-polyfill'
import { cookies } from 'webextension-polyfill'
import { getUserFullInfo } from './utils'

// 获取国服cookie
export const getMiHoYoCookie = async function () {
  let cookieString = ''
  let _cookies = await cookies.getAll({ domain: 'miyoushe.com' })
  // 过滤name相同的cookies
  _cookies = _cookies.filter(
    (cookie, index, self) =>
      self.findIndex((t) => t.name === cookie.name) === index,
  )
  const parsedCookies: Record<string, string> = {}
  for (const cookie of _cookies) {
    parsedCookies[cookie.name] = cookie.value
  }
  if (_cookies.length !== 0) {
    cookieString = ''
    let flagV2 = false
    let cachedLtuid = ''
    if (!parsedCookies.cookie_token && parsedCookies.cookie_tken_v2) {
      return ''
    }
    cookieString += `ltoken=${parsedCookies.ltoken};ltuid=${
      parsedCookies.ltuid || parsedCookies.login_uid
    };cookie_token=${
      parsedCookies.cookie_token || parsedCookies.cookie_token_v2
    };account_id=${parsedCookies.ltuid || parsedCookies.login_uid};`
    if (
      parsedCookies.cookie_token_v2
      && (parsedCookies.account_mid_v2 || parsedCookies.ltmid_v2)
    ) {
      flagV2 = true
      cookieString = `ltuid=${
        parsedCookies.ltuid || parsedCookies.login_uid || parsedCookies.ltuid_v2
      };account_mid_v2=${parsedCookies.account_mid_v2};cookie_token_v2=${
        parsedCookies.cookie_token_v2
      };ltoken_v2=${parsedCookies.ltoken_v2};ltmid_v2=${
        parsedCookies.ltmid_v2
      };`
    }
    if (parsedCookies.mi18nLang) {
      cookieString += `mi18nLang=${parsedCookies.mi18nLang};`
    }
    cachedLtuid = parsedCookies.ltuid || parsedCookies.ltmid_v2
    if (flagV2) {
      const userFullInfo = await getUserFullInfo(cookieString)
      if (!userFullInfo) {
        return ''
      }
      if (userFullInfo?.data?.user_info) {
        const userInfo = userFullInfo?.data?.user_info
        cookieString += `ltuid=${userInfo.uid || cachedLtuid};`
      } else {
        console.error('[ERROR:userFullInfo]', userFullInfo.message)
        return ''
      }
    }
    return cookieString.split(';').filter((cookie, index, self) =>
    {
      const cookieName = cookie.split('=')[0]
      return self.findIndex((t) => {
        const tempName = t.split('=')[0]
        return tempName === cookieName
      },
      ) === index
    }).join(';')
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
