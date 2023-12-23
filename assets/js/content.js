function autorun() {
  let content = '<p class="alert-text">Cannot connect to Paimon Web-Ext</p>'
  content += '<div id="captcha"></div>'
  content
    += '<style>.alert-text{font-size: 30px;} #captcha{width: 80px;}</style>'
  document.querySelectorAll('body > *').forEach((el) => {
    el.style.display = 'none'
  })
  const div = document.createElement('div')
  div.innerHTML = content
  document.body.innerHTML = content

  const gt = document.createElement('script')
  gt.src = 'https://static.geetest.com/static/js/gt.0.4.9.js'
  document.body.appendChild(gt)
}

{
  window.addEventListener('message', (event) => {
    if (
      event.source === window
      && event.data.direction
      && event.data.direction === 'from-content-script'
    ) {
      console.log('Received message from content script: ', event.data)
      if (event.data.type === 'init') {
        autorun()
        init()
      } else if (event.data.type === 'request_captcha') {
        const data = JSON.parse(event.data.payload)
        initCaptcha(data)
      }
    }
  })

  function init() {
    const AlertTextEl = document.querySelector('.alert-text')
    AlertTextEl.textContent = 'Connected, waiting for 3 seconds'
  }

  function initCaptcha(data) {
    const AlertTextEl = document.querySelector('.alert-text')
    AlertTextEl.textContent
      = 'Connected, please wait for captcha loading, and then click the button below'
    window.initGeetest(
      {
        gt: data.verification.gt,
        challenge: data.verification.challenge,
        offline: false,
        new_captcha: data.verification.new_captcha,
        product: 'float',
        width: '100%',
      },
      (captcha) => {
        captcha.appendTo('#captcha')
        captcha.onSuccess(() => {
          const validate = captcha.getValidate()
          window.postMessage(
            {
              direction: 'from-page-script',
              type: 'finish_captcha',
              payload: JSON.stringify(validate),
            },
            '*',
          )
        })
      },
    )
  }
}
