const { resolve, join } = require('path')
const { defineConfig } = require('vite')
const { svelte } = require('@sveltejs/vite-plugin-svelte')
const { createVuePlugin } = require('vite-plugin-vue2')
const pages = require('./public/pages.json')

const input = { index: resolve(__dirname, 'index.html') }
for (const page of pages) {
  input[page] = resolve(__dirname, join('pages', page, 'index.html'))
}

module.exports = defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production'
  return {
    plugins: [createVuePlugin(), svelte()],
    build: {
      minify: isProduction,
      rollupOptions: {
        input
      }
    }
  }
})
