# 如何开发

注：所讲并非绝对，如有变动请及时修改。

# 如何开发

注：所讲并非绝对，如有变动请及时修改。

## Code Style

**注意** ❗ 在写代码之前，强烈建议阅读 [clean-code-javascript](https://github.com/ryanmcdermott/clean-code-javascript) 或类似指导。始终记住，代码写出来不止你一个人看。

## Commit

### Commit Message Style

最好是 [Angular's conventional commit](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit)，但是不做强制要求。

但是必须避免废话式的提交信息，比如 `fix some bugs`, `enhance`。还是那句活，几个月后看到[满屏都是 `bug fix`](https://github.com/treehollow/treehollow-backend/commits/master) 怎么知道哪个是哪个？

### Commit 失败？

如果是使用 GUI 提交，请务必查看相应的 log

如果是代码的问题，建议对应信息检查后修复。

如果是 husky 无法跑起来，使用搜索引擎尝试解决。

## 功能性模块的工作流

工作流大致如下：

1. 从 master 新建一个分支
2. 在 `pages` 下新建文件夹，模仿已有的功能写好业务代码。然后修改 `public/pages.json`，加上新建的模块名称
3. 如可以，在本地开启前端后端进行联合调试
4. 【如有在线全真调试需求】从 master 新建 dev 分支
5. 【如有在线全真调试需求】合并进 dev，调试 dev，汇总问题并修改
6. 从 dev 或新建的分支向 master 发起 PR
7. review 通过后，根据 commit 是否混乱，决定是 create merge commit 还是 squash merge
8. 该新建分支与 dev 分支的历史使命已经结束，删除以保持整洁
9. 如果上线后有问题，可以视时间紧迫与代码修改方便程度，选择直接向腾讯云上传本地的 build 还是重复以上步骤
10. 功能使命结束，适时将 master 上的 `public/pages.json` 回复原样即可

## 发布

使用微信认证门户页面跳转，即应当对外使用 `ROOT_URL/?page=x10n`。

该页面保证用户完成了微信认证，处理了非微信客户端的登录逻辑。

## 请求 API

相关部分代码在 `utils/api.js` 中。所有需要登录的代码都应该使用该函数。如果该函数无法满足新的需求，请修改函数代码。
