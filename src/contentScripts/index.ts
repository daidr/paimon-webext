/* eslint-disable */
import { onMessage, sendMessage } from 'webext-bridge'
import { ICaptchaRequest } from '~/types'

(() => {
  const Config = {
    uid: "",
    tabId: -1,
  }

  console.info('[paimon-webext] init')

  // eslint-disable-next-line
  window.postMessage({
    direction: 'from-content-script',
    type: 'init',
  }, '*')

  onMessage('request_captcha', ({ data }) => {
    console.info('[paimon-webext] request_captcha', data)
    const { uid, tabId } = data
    Config.uid = uid
    Config.tabId = tabId
    window.postMessage({
      direction: 'from-content-script',
      type: 'request_captcha',
      payload: JSON.stringify(data),
    }, '*')
  })

  window.addEventListener('message', (event) => {
    if (event.source === window
                    && event.data.direction
                    && event.data.direction === 'from-page-script') {
      console.log('Received message from page script: ', event.data)
      if (event.data.type === 'finish_captcha') {
        const data = JSON.parse(event.data.payload)
        sendCaptchaResult(data)
      }
    }
  })

  function sendCaptchaResult(data: ICaptchaRequest) {
    sendMessage('finish_captcha', {
      geetest: data,
      uid: Config.uid,
      tabId: Config.tabId,
    })
  }
})()
