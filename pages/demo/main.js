import { ensureToken, wxtoken } from '../../utils/wxauth'

document.querySelector('#app').innerHTML = `
  <h1>Hello Vite!</h1>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`

console.log(ensureToken())
console.log(window.env.API_URL)
console.log(wxtoken)
