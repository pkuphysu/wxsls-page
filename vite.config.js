const { resolve, join } = require('path')
const { defineConfig, loadEnv } = require('vite')
const { svelte } = require('@sveltejs/vite-plugin-svelte')
const tailwindcssModule = require('@tailwindcss/vite')
const vuePlugin = require('@vitejs/plugin-vue2')
const vue = vuePlugin.default || vuePlugin
const tailwindcss = tailwindcssModule.default || tailwindcssModule
const pages = require('./public/pages.json')

const developmentEnv = () => ({
  name: 'development-runtime-env',
  configureServer (server) {
    server.middlewares.use('/env.js', (_request, response) => {
      response.setHeader('Content-Type', 'application/javascript')
      response.end('window.env = {}')
    })
  }
})

const input = { index: resolve(__dirname, 'index.html') }
for (const page of pages) {
  input[page] = resolve(__dirname, join('pages', page, 'index.html'))
}

module.exports = defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production'
  const env = loadEnv(mode, __dirname, '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000'
  return {
    plugins: [developmentEnv(), vue(), svelte(), tailwindcss()],
    server: {
      proxy: {
        '/__api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/__api/, '')
        }
      }
    },
    build: {
      minify: isProduction,
      rollupOptions: {
        input
      }
    }
  }
})
