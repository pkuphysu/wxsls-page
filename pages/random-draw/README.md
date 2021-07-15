# 抽奖前端

说真的，看这个模板不爽很久了。发现有更好的能换的话请务必马上立刻换掉它。

本来这个动画是抽数字，其中数字的样式是直接写死在 js 里的，手动矢量图可还行。
但好在一开始的画面还是有粒子组成的文字的，后来就用这部分代码改写了。

主要问题模板给过来的时候就是被部分压过的，还是有很多 magic code，永远不知道里面运行了什么东西。

由于不同活动有各种奇奇怪怪的甲方要求，代码里残留了各种逻辑。

而且和 vite 结合需要把这些 static 文件甩进 `public/` 下，很不优雅，and will be included in every build.

Landmines and dragons!


## 发布
### Required Parameters
比如 `ROOT_URL/?page=random-draw&api=/api/random-draw/all&event=抽奖`
#### `api`

获取抽奖信息的 API 地址。如果是配合 `draw-join` 的，就是 `/api/random-draw/all`

#### `event`

抽奖间隙显示的文本，以及默认为未开始时显示的标题


### Optional Parameters

具体看 `./main.js` 里一堆 `urlParams.get`

#### `least`
最少显示多少人之后才会有中奖
#### `random`
达到最小显示人数后，每次显示人名后生成随机数，小于 `random` 则停止。可以理解为 `random` 越小停止越慢。
#### `prize`
当抽奖分一二三等奖项时（即使用的 API 不是 `draw-join`），抽取哪个奖。根据后台的格式做调整，一般 0 表示一等奖，以此类推。
##### `word`
未开始时显示的标题

**注意：** 未开始时显示的标题应当（在正常显示的情况下）尽可能长，否则文字会显示不正常。

### 其他

配合参与抽奖页面（`draw-join`）食用

URL 填完了甩给人家就好。但是要求在目标浏览器上经过微信认证登录，且在 wxsls-pyfn 中所列的 `MASTER_IDS` 中。

注意在抽奖开始前一定要刷新页面，或者在所有人报名完成后再打开。
