## 抽奖前端

说真的，看这个模板不爽很久了。发现有更好的能换的话请务必马上立刻换掉它。

本来这个动画是抽数字，其中数字的样式是直接写死在 js 里的，手动矢量图可还行。
但好在一开始的画面还是有粒子组成的文字的，后来就用这部分代码改写了。

主要问题模板给过来的时候就是被部分压过的，还是有很多 magic code，永远不知道里面运行了什么东西。

由于不同活动有各种奇奇怪怪的甲方要求，代码里残留了各种逻辑。

而且和 vite 结合需要把这些 static 文件甩进 `public/` 下，很不优雅，and will be included in every build.

Landmines and dragons!


### 发布
#### Required Parameters

- `api`
- `event`

比如 `ROOT_URL/?page=random-draw&api=/api/random-draw/all&event=抽奖`

#### Optional Parameters

懒得写了，看 `./main.js` 里一堆 `urlParams.get` 吧。

#### 其他

配合参与抽奖页面（`draw-join`）食用

URL 填完了甩给人家就好。但是要求在目标浏览器上经过微信认证登录，且后台身份是管理员。

注意在抽奖开始前一定要刷新页面，或者在所有人报名完成后再打开。
