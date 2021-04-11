const { resolve } = require('path')
const { createVuePlugin } = require('vite-plugin-vue2')

const resolvePages = dir => resolve(__dirname, 'pages', dir, 'index.html')

module.exports = {
  build: {
    rollupOptions: {
      input: {
        demo: resolvePages('demo'),
        x10n: resolvePages('x10n')
      }
    }
  },
  plugins: [createVuePlugin()]
}
