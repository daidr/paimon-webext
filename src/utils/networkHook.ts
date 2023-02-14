import { webRequest } from 'webextension-polyfill'
import { range } from './utils'
import { isFirefox } from '~/env'

const targetPages = [
  'https://api-os-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_global',
  'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookieToken?game_biz=hk4e_cn',
  'https://bbs-api-os.hoyolab.com/game_record/app/genshin/api/dailyNote*',
  'https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/dailyNote*',
  'https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/createVerification*',
  'https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/verifyVerification*',
  'https://bbs-api-os.hoyolab.com/game_record/app/card/wapi/createVerification*',
  'https://bbs-api-os.hoyolab.com/game_record/app/card/wapi/verifyVerification*',
  'https://apiv6.geetest.com/ajax.php?pt=3&client_type=web_mobile&lang=zh-cn*',
]

let currentCookie = ''
let currentReferer = ''
let currentUA = ''
const ruleID = 114514

let isRewriteEnabled_Firefox = false
let isCookieIgnored_Firefox = false

if (isFirefox) {
  function rewriteCookieHeader(e: any) {
    if (!isRewriteEnabled_Firefox) {
      return { requestHeaders: e.requestHeaders }
    }

    if (!isCookieIgnored_Firefox) {
      let flag = false
      for (const header of e.requestHeaders) {
        if (header.name.toLowerCase() === 'cookie') {
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
    }

    let flag1 = false
    let flag2 = false
    for (const header of e.requestHeaders) {
      if (header.name.toLowerCase() === 'referer') {
        header.value = currentReferer
        flag1 = true
      } else if (header.name.toLowerCase() === 'user-agent') {
        header.value = currentUA
        flag2 = true
      }
    }
    if (!flag1) {
      e.requestHeaders.push({
        name: 'Referer',
        value: currentReferer,
      })
    }
    if (!flag2) {
      e.requestHeaders.push({
        name: 'User-Agent',
        value: currentUA,
      })
    }

    return { requestHeaders: e.requestHeaders }
  }

  webRequest.onBeforeSendHeaders.addListener(
    rewriteCookieHeader,
    { urls: targetPages },
    [
      'blocking',
      'requestHeaders',
      chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS,
    ].filter(Boolean),
  )
}

export const updateRules = async (ignoreCookie = false) => {
  if (isFirefox) {
    isRewriteEnabled_Firefox = true
    isCookieIgnored_Firefox = ignoreCookie
  } else {
    const rules = []
    for (let i = 0; i < targetPages.length; i++) {
      rules.push({
        id: ruleID + i,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              header: 'Cookie',
              operation: 'set',
              value: ignoreCookie ? '' : currentCookie,
            },
            { header: 'Referer', operation: 'set', value: currentReferer },
            { header: 'Origin', operation: 'set', value: currentReferer },
            { header: 'User-Agent', operation: 'set', value: currentUA },
          ],
        },
        condition: { urlFilter: targetPages[i] },
      })
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: range(ruleID, ruleID + 8),
      addRules: rules,
    })
  }
}

export const resetRules = async () => {
  if (isFirefox) {
    isRewriteEnabled_Firefox = false
  } else {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: range(ruleID, ruleID + 8),
    })
  }
}

const responseRuleID = 19198

export const initResponseRules = async () => {
  if (isFirefox) {
    function removeSetCookieHeader(e: any) {
      if (!isRewriteEnabled_Firefox) {
        return { responseHeaders: e.responseHeaders }
      }
      for (const header of e.responseHeaders) {
        if (header.name === 'Set-Cookie' || header.name === 'set-cookie')
          header.value = ''
      }
      return { responseHeaders: e.responseHeaders }
    }

    webRequest.onHeadersReceived.addListener(
      removeSetCookieHeader,
      { urls: targetPages },
      [
        'blocking',
        'responseHeaders',
        chrome.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS,
      ].filter(Boolean),
    )
  } else {
    const rules = []
    for (let i = 0; i < targetPages.length; i++) {
      rules.push({
        id: responseRuleID + i,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            { header: 'set-cookie', operation: 'set', value: '' },
          ],
        },
        condition: { urlFilter: targetPages[i] },
      })
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: range(responseRuleID, responseRuleID + 8),
      addRules: rules,
    })
  }
}

export const setExtraHeaders = async (
  cookie: string,
  referer: string,
  ua: string,
  ignoreCookie = false,
) => {
  currentCookie = cookie
  currentReferer = referer
  currentUA = ua
  await updateRules(ignoreCookie)
}
