import { requestApi } from './utils/api'
import validPages from './pages/index.json'
import './style.css'

const searchParams = new URLSearchParams(location.search)

const redirectWechatOAuth = () => {
  const redirectURL = new URL('https://open.weixin.qq.com/connect/oauth2/authorize')
  const redirectParams = {
    appid: window.env.APPID,
    redirect_uri: location.href,
    response_type: 'code',
    scope: 'snsapi_base'
  }
  for (const paramKey in redirectParams) {
    redirectURL.searchParams.append(paramKey, redirectParams[paramKey])
  }
  redirectURL.hash = 'wechat_redirect'
  console.log('Not authed. Redirecting to', redirectURL.href)
  location.replace(redirectURL.href)
}

const isWechatClient = async () =>
  navigator.userAgent.indexOf('MicroMessenger') !== -1 || await Promise.race([
    new Promise(resolve => document.addEventListener(
      'WeixinJSBridgeReady', () => resolve(true), { once: true }
    )),
    new Promise(resolve => setTimeout(() => resolve(false), 1000))
  ])

const redirectPage = () => {
  const page = searchParams.get('page')
  if (!validPages.includes(page)) alert('跳转参数不合法')
  else location.replace(`${location.origin}/pages/${page}`)
}

const setTokenFromData = (data) => {
  const { token } = data
  if (!token) {
    alert(data.errid)
    return false
  }
  sessionStorage.setItem('token', token)
  return token
}

const checkGrant = async () => {
  const tcode = searchParams.get('grant')
  if (!tcode) return false
  const data = await requestApi('GET', `/auth/tcode/grant?tcode=${tcode}`)
  if (data.status === 200) {
    alert('授权成功')
    window.WeixinJSBridge.call('closeWindow')
  } else alert('授权失败：' + JSON.stringify(data))
  return true
}

const main = async () => {
  const token = sessionStorage.getItem('token')

  if (token !== null) {
    await checkGrant() || redirectPage()
    return
  }
  const code = searchParams.get('code')
  if (code !== null) {
    const data = await requestApi('GET', `/auth/wechat?code=${code}`)
    if (setTokenFromData(data)) checkGrant() || redirectPage()
    return
  }
  if (await isWechatClient()) {
    redirectWechatOAuth()
    return
  }
  const data = await requestApi('GET', '/auth/tcode/get')
  if (!data.tcode) {
    alert('Unexpected Error')
    return
  }
  const tcode = data.tcode
  const grantURL = new URL(`/?grant=${tcode}`, location.href).href
  document.getElementById('qr-to-scan').style.display = 'block'
  document.getElementById('qr-content').innerText = grantURL
  // eslint-disable-next-line no-new
  new window.QRCode(document.getElementById('qrcode'), grantURL)
  document.getElementById('done-scan').addEventListener('click', async () => {
    const data = await requestApi('GET', `/auth/tcode/exchange?tcode=${tcode}`)
    if (setTokenFromData(data)) redirectPage()
  })
}

main()
