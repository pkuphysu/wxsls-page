const { resolve, join } = require('path')
const { createVuePlugin } = require('vite-plugin-vue2')
const pages = require('./pages/index.json')

const input = { index: resolve(__dirname, 'index.html') }
for (const page of pages) {
  input[page] = resolve(__dirname, join('pages', page, 'index.html'))
}

module.exports = {
  build: {
    rollupOptions: {
      input
    }
  },
  plugins: [createVuePlugin()]
}
