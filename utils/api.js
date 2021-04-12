export const requestApi = async (method, url, data) => {
  const fetchInit = {
    method,
    mode: 'cors',
    data,
    credentials: 'include'
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