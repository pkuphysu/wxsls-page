export const requestApi = async (method, url, data) => {
  const fetchInit = {
    method,
    cache: 'no-cache',
    body: JSON.stringify(data)
  }
  const token = sessionStorage.getItem('token')
  if (token) {
    fetchInit.headers = new Headers({
      Authorization: 'Basic ' + token
    })
  }
  return fetch(new URL(url, window.env.API_URL), fetchInit)
    .then(resp => resp.json())
    .catch(err => alert(err))
}
