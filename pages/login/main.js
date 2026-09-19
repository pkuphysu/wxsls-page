import { requestApi } from '../../utils/api'

const POLL_INTERVAL = 2500

const statusBox = document.getElementById('status-box')
const fpBox = document.getElementById('fp-box')
const qrcodeImg = document.getElementById('qrcode-img')
const sessionBox = document.getElementById('session-box')
const startBtn = document.getElementById('start-btn')
const restartBtn = document.getElementById('restart-btn')

let visitorIdPromise = null

const resolveVisitorId = () => {
  if (!visitorIdPromise) visitorIdPromise = getVisitorId()
  return visitorIdPromise
}

const setStatus = (text, isError = false) => {
  statusBox.style.color = isError ? 'darkred' : 'green'
  statusBox.innerText = text
}

const showQrcode = (dataUri) => {
  qrcodeImg.src = dataUri
  qrcodeImg.style.display = 'inline'
}

const hideQrcode = () => {
  qrcodeImg.style.display = 'none'
}

const renderSessionBox = async () => {
  const data = await requestApi('GET', '/wechat-manager/session')
  if (data.status !== 200) {
    sessionBox.innerText = `会话状态获取失败：${data.errid}`
    return
  }
  sessionBox.innerText = data.logged_in
    ? `当前后台会话：有效（${data.mp_account || '未知账号'}）`
    : '当前后台会话：无（拉取头像时将自动跳过）'
}

const getVisitorId = async () => {
  if (!window.FingerprintJS) throw new Error('FingerprintJS 未加载，请检查网络后刷新')
  return window.FingerprintJS.load()
    .then(agent => agent.get())
    .then(({ visitorId }) => visitorId)
}

const poll = async (loginId) => {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
    const data = await requestApi('GET', `/wechat-manager/login/${loginId}`)
    if (data.status !== 200) {
      setStatus(`轮询失败：${data.errid}`, true)
      return
    }
    if (data.qrcode) showQrcode(data.qrcode)
    switch (data.state) {
      case 'pending':
        setStatus('等待扫码…')
        break
      case 'scanned':
        setStatus(data.acct_size > 1
          ? `发现 ${data.acct_size} 个账号，暂不支持自动选择，请转人工处理`
          : '已扫码，请在手机上确认')
        break
      case 'done':
        setStatus('登录成功，后台会话已保存')
        hideQrcode()
        renderSessionBox()
        return
      case 'expired':
        setStatus('登录已超时，请重新获取二维码', true)
        hideQrcode()
        restartBtn.style.display = 'inline'
        return
      case 'need_email':
        setStatus('该账号需先绑定邮箱，请转人工处理', true)
        return
      default:
        setStatus(`未知状态：${data.state}`, true)
        return
    }
  }
}

const startLogin = async () => {
  restartBtn.style.display = 'none'
  hideQrcode()
  setStatus('正在计算浏览器指纹…')
  let visitorId
  try {
    visitorId = await resolveVisitorId()
  } catch (err) {
    setStatus(err.message, true)
    return
  }
  setStatus('正在生成二维码…')
  const data = await requestApi('POST', '/wechat-manager/login/start', { fingerprint: visitorId })
  if (data.status === 401) {
    setStatus('未授权：请先从站点首页完成登录授权', true)
    return
  }
  if (data.status !== 200) {
    setStatus(`发起登录失败：${data.errid}`, true)
    return
  }
  showQrcode(data.qrcode)
  setStatus('等待扫码…')
  await poll(data.login_id)
}

startBtn.addEventListener('click', startLogin)
restartBtn.addEventListener('click', startLogin)
document.getElementById('check-btn').addEventListener('click', async () => {
  const data = await requestApi('POST', '/wechat-manager/session/check')
  if (data.status !== 200) {
    setStatus(`校验失败：${data.errid}`, true)
    return
  }
  setStatus(data.valid ? '后台会话有效' : '后台会话已失效，请重新扫码', !data.valid)
  renderSessionBox()
})

resolveVisitorId().then(
  visitorId => {
    fpBox.innerText = `本页指纹：${visitorId}`
  },
  err => {
    fpBox.innerText = `指纹计算失败：${err.message}`
  }
)
renderSessionBox()
