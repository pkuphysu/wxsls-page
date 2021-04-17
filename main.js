import { requestApi } from './utils/api'
import validPages from './pages/index.json'
import './style.css'

const searchParams = new URLSearchParams(location.search)
const page = searchParams.get('page')
const tcode = searchParams.get('grant')
const code = searchParams.get('code')

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
    new Promise(resolve => setTimeout(() => resolve(false), 40))
  ])

const redirectPage = () => {
  ['page', 'grant', 'code'].forEach(name => searchParams.delete(name))
  location.replace(`${location.origin}/pages/${page}/?${searchParams.toString()}`)
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
  if (!tcode) return false
  const grantData = await requestApi('GET', `/auth/tcode/grant?tcode=${tcode}`)
  if (grantData.status === 200) {
    alert('授权成功')
    window.WeixinJSBridge.call('closeWindow')
  } else alert('授权失败：' + JSON.stringify(grantData))
  return true
}

const main = async () => {
  if (!tcode && !validPages.includes(page)) {
    alert('跳转参数不合法')
    return
  }

  const token = sessionStorage.getItem('token')

  if (token !== null) {
    await checkGrant() || redirectPage()
    return
  }
  if (code !== null) {
    const tokenData = await requestApi('GET', `/auth/wechat?code=${code}`)
    if (setTokenFromData(tokenData)) checkGrant() || redirectPage()
    return
  }
  if (await isWechatClient()) {
    redirectWechatOAuth()
    return
  }
  const tcodeData = await requestApi('GET', '/auth/tcode/get')
  if (!tcodeData.tcode) {
    alert('Unexpected Error')
    return
  }
  const grantURL = new URL(`/?grant=${tcodeData.tcode}`, location.href).href
  document.getElementById('qr-to-scan').style.display = 'block'
  document.getElementById('qr-content').innerText = grantURL
  // eslint-disable-next-line no-new
  new window.QRCode(document.getElementById('qrcode'), grantURL)
  document.getElementById('done-scan').addEventListener('click', async () => {
    const tokenExchangeData = await requestApi('GET', `/auth/tcode/exchange?tcode=${tcodeData.tcode}`)
    if (setTokenFromData(tokenExchangeData)) redirectPage()
  })
}

main()
