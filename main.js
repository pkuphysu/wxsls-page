import { requestApi } from './utils/api'
import './style.css'

const searchParams = new URLSearchParams(location.search)
const page = searchParams.get('page')
const tcode = searchParams.get('grant')
const code = searchParams.get('code')

const checkRedirectPage = async () => {
  const validPages = await fetch(`/pages.json?${+new Date()}`).then(resp => resp.json())
  if (!tcode && !validPages.includes(page)) {
    alert('跳转参数不合法或页面不在线')
    return false
  }
  return true
}

const redirectWechatOAuth = () => {
  const redirectURL = new URL('https://open.weixin.qq.com/connect/oauth2/authorize')
  const redirectParams = {
    appid: window.env.APPID,
    redirect_uri: location.href,
    response_type: 'code',
    scope: 'snsapi_userinfo'
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
  searchParams.append('time', +new Date())
  location.replace(`${location.origin}/pages/${page}/?${searchParams.toString()}`)
}

const setTokenFromData = (data) => {
  const { token } = data
  if (!token) {
    alert(data.errid)
    return false
  }
  localStorage.setItem('token', token)
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

const checkToken = async () => {
  const checkData = await requestApi('GET', '/auth/openid')
  return checkData.status === 200
}

const main = async () => {
  if (!await checkRedirectPage()) return

  const token = localStorage.getItem('token')

  if (token !== null) {
    if (await checkToken()) {
      await checkGrant() || redirectPage()
      return
    }
    localStorage.removeItem('token')
  }
  if (code !== null) {
    const tokenData = await requestApi('GET', `/auth/wechat?code=${code}`)
    if (setTokenFromData(tokenData)) await checkGrant() || redirectPage()
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
