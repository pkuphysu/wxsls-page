export const requestApi = async (method, url, data) => {
  const requestUrl = import.meta.env.DEV
    ? new URL(`/__api${url.startsWith('/') ? url : `/${url}`}`, location.origin)
    : new URL(url, window.env.API_DETAILS[0].urls[0])

  const fetchInit = {
    headers: new Headers(),
    method,
    cache: 'no-cache',
    body: JSON.stringify(data)
  }
  const token = import.meta.env.DEV
    ? 'developmentoken'
    : localStorage.getItem('token')
  if (token) {
    fetchInit.headers.append('Authorization', 'Basic ' + token)
  }
  if (data) {
    fetchInit.headers.append('Content-Type', 'application/json')
  }
  return fetch(requestUrl, fetchInit)
    .then(resp => resp.json())
    .catch(err => alert(err))
}
