const { resolve } = require('path')

const resolveIndex = dir => resolve(__dirname, dir, 'index.html')

module.exports = {
  build: {
    rollupOptions: {
      input: {
        demo: resolveIndex('pages/demo')
      }
    }
  }
}
