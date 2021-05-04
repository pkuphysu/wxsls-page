# 北京大学物院学生会的（零碎）网页

使用腾讯云的 Serverless Framework. See Also:

- [wxsls-pyfn](https://github.com/pkuphysu/wxsls-pyfn) 微信公众号后台回复核心
- [wxsls-base](https://github.com/pkuphysu/wxsls-base) 基本组件

## Development

更多开发相关详见[CONTRIBUTING.md](CONTRIBUTING.md)

### `npm install`

不用多说了吧。husky 会自动安装好。

### Mock `env.js`

由于 Serverless Framework 机制的限制，不使用 `process.env` 操作环境变量。须在 `public/` 下新建 `env.js`，内容大致如下：

```js
window.env = {
  API_URL: '/'
}
```

这样也方便做本地修改并 hot reload

记得（几乎）每个新的 HTML 都要

```html
<script src="/env.js"></script>
```

### Editor Integration

都是 Optional，毕竟已经使用 husky 规范了：

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [HTMLHint](https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint)


### Commands

```sh
# 本地开发
npm run dev
# 生成静态网页
npm run build
# 运行代码检查
npm run lint
# 运行代码检查并修复
npm run lint:fix
```

## Deploy

`dev` 的会自动发布到 dev 环境，`master` 的会自动发布到 prod 环境。

若非调试部署，应当另开分支。
