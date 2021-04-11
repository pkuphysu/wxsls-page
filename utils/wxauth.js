export let wxtoken = localStorage.getItem('wxtoken')

export function ensureToken () {
  if (wxtoken !== null) return
  const searchParams = new URLSearchParams(location.search)
  const code = searchParams.get('code')
  if (code === null) {
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
  } else {
    const authURL = new URL('/auth/wechat', window.env.API_URL)
    authURL.searchParams.append('code', code)
    fetch(authURL.href)
      .then(res => res.json())
      .then((data) => {
        if (!('token' in data)) {
          alert(data)
          return
        }
        wxtoken = data.token
        localStorage.setItem('wxtoken', wxtoken)
      })
  }
}
