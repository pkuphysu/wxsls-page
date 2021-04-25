export const requestApi = async (method, url, data) => {
  const fetchInit = {
    headers: new Headers(),
    method,
    cache: 'no-cache',
    body: JSON.stringify(data)
  }
  const token = localStorage.getItem('token')
  if (token) {
    fetchInit.headers.append('Authorization', 'Basic ' + token)
  }
  if (data) {
    fetchInit.headers.append('Content-Type', 'application/json')
  }
  return fetch(new URL(url, window.env.API_URL), fetchInit)
    .then(resp => resp.json())
    .catch(err => alert(err))
}
