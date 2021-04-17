import { requestApi } from '../../utils/api'

window.onload = () => {
  const el = document.getElementById('info-box')

  document.getElementById('join-btn').addEventListener('click', () => {
    const name = document.getElementById('name').value
    requestApi('POST', '/api/random-draw/join', { name })
      .then((message) => {
        if (message.status === 200) {
          el.style.color = 'green'
          el.innerText = '报名成功！'
        } else {
          el.style.color = 'darkred'
          el.innerText = `报名失败: ${message.errid}`
        }
      })
      .catch(() => {
        el.style.color = 'darkred'
        el.innerText = '报名失败，可能是网络故障'
      })
  })
}
