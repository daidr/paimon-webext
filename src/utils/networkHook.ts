import type { AdvancedHeaders } from './advancedFetch'
import { range } from './utils'
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
  'https://public-data-api.mihoyo.com/device-fp/api/getFp*',
]
const ruleID = 114514

const generateHeaderRules = (headers: AdvancedHeaders) => {
  const requestHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = []
  for (const [key, value] of Object.entries(headers)) {
    requestHeaders.push({
      header: key,
      operation: chrome.declarativeNetRequest.HeaderOperation.SET,
      value,
    })
  }
  return requestHeaders
}

export const updateRules = async (headers: AdvancedHeaders) => {
  const rules: chrome.declarativeNetRequest.Rule[] = []
  for (let i = 0; i < targetPages.length; i++) {
    rules.push({
      id: ruleID + i,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        requestHeaders: generateHeaderRules(headers),
      },
      condition: { urlFilter: targetPages[i] },
    })
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: range(ruleID, ruleID + targetPages.length - 1),
    addRules: rules,
  })
}

export const resetRules = async () => {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: range(ruleID, ruleID + targetPages.length - 1),
  })
}

const responseRuleID = 19198

export const initResponseRules = async () => {
  const rules: chrome.declarativeNetRequest.Rule[] = []
  for (let i = 0; i < targetPages.length; i++) {
    rules.push({
      id: responseRuleID + i,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        responseHeaders: [
          { header: 'set-cookie', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE },
        ],
      },
      condition: { urlFilter: targetPages[i] },
    })
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: range(
      responseRuleID,
      responseRuleID + targetPages.length - 1,
    ),
    addRules: rules,
  })
}
