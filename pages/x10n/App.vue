<template>
  <div id="app">
    <div
      class="container"
      align="center"
    >
      <b-form
        v-if="screen === 'welcome'"
        class="col-10"
      >
        <h2>数量级估算大赛</h2>
        <div
          class="text-left"
          style="font-size: small"
        >
          <p>
            这次比赛是为了给大家的学习生活增加快乐，题目可能有失严谨，请大家见谅~
            如果遇到了其他问题，请咨询<a href="mailto://1376156442@qq.com">1376156442@qq.com</a>
          </p>
          <p>请注意写完题之后<em>不能回头修改</em>，<em>中途不能暂停或退出</em>，请一次性做完~</p>
        </div>
        <p>请确认是<strong>北大校内同学</strong>，并如实填写以下用于领奖的信息</p>
        <b-input-group
          prepend="姓名"
          class="mb-2 mr-sm-2 mb-sm-0"
        >
          <b-form-input v-model.trim="localResult.name" />
        </b-input-group>
        <b-input-group
          prepend="学号"
          class="mb-2 mr-sm-2 mb-sm-0"
        >
          <b-form-input v-model.trim="localResult.stuID" />
        </b-input-group>
        <br>
        <p style="font-size: small;">
          可能因为带宽问题点击开始键会有延迟，请不要离开
        </p>
        <div>
          <b-button
            block
            variant="primary"
            @click="start"
          >
            <h4>start</h4>
          </b-button>
        </div>
      </b-form>
    </div>
    <div class="container col-10">
      <div v-if="screen === 'main'">
        <div class="row">
          <div class="col-md-11">
            <b-progress
              :value="count+1"
              :max="max_num"
            />
          </div>
          <div class="col-md-1">
            TIME:{{ remainingTime }}
          </div>
        </div>
        <br>
        <div>
          <span class="badge badge-pill badge-primary">{{ count+1 }}</span>
          {{ ques[count].text }}
        </div>
        <div class="ques-img">
          <img
            v-if="!!ques[count].img"
            :src="ques[count].img"
          >
        </div>
        <div
          v-for="(choice,i) in ques[count].choices"
          :key="i"
          class="form-check my-3"
        >
          <label class="form-check-label py-2 container-fluid">
            <input
              v-model="selected"
              type="radio"
              class="form-check-input"
              name="choice"
              :value="i"
            >
            {{ option[i] }}.&nbsp;{{ choice }}
          </label>
        </div>
        <div>
          <b-button
            block
            variant="outline-primary"
            class="py-1"
            @click="nextques"
          >
            <h4>next question</h4>
          </b-button>
        </div>
      </div>
      <div
        v-if="screen === 'result' && serverResult"
        id="result"
        class="text-center"
      >
        <h2>{{ serverResult.name }}的答题结果</h2>
        <p>
          用时：{{ serverResult.time }}s，
          答对 {{ serverResult.questions.filter(q=>q.answer).length }} 题
        </p>
        <p>
          你真是数量级估算带师啊。截个图更方便对答案哦~
          看看你和小伙伴都答对了哪些题呢？（第二个数字表示题目唯一编号）
        </p>
        <span
          v-for="(q,i) in serverResult.questions"
          :key="`badge${q.number}`"
          class="badge badge-pill p-2 m-1"
          :class="{
            'badge-success': q.answer,
            'badge-danger': !q.answer
          }"
        >{{ i+1 }}-{{ q.number }}</span>
      </div>
    </div>
    <br>
    <div class="position-fixed fixed-bottom">
      <b-alert
        :show="3"
        dismissible
        fade
        variant="warning"
      >
        请登录哦
      </b-alert>
      <div
        v-for="(s, i) in msg"
        :key="i"
      >
        <b-alert
          :show="5"
          dismissible
          fade
          :variant="s.type"
        >
          {{ s.text }}
        </b-alert>
      </div>
    </div>
  </div>
</template>

<script>
import { BForm, BInputGroup, BAlert, BButton, BFormInput, BProgress } from 'bootstrap-vue'
import { requestApi } from '../../utils/api'

const getResult = async () => await requestApi('GET', '/api/x10n')
const postResult = async (body) => await requestApi('POST', '/api/x10n', body)
const msgs = {
  infoInvalid: { type: 'warning', text: '请至少填一个像样的信息' },
  start: { type: 'success', text: '答题开始！' },
  end: { type: 'success', text: '答题结束啦！' },
  done: { type: 'warning', text: '您已经答题过了哦' },
  notComplete: { type: 'warning', text: '看起来中途离开了，那就没有成绩了' },
  offline: { type: 'warning', text: '活动和您的设备至少有一个不在线' }
}
const timeInSec = 30

export default {
  name: 'App',
  components: { BForm, BInputGroup, BAlert, BButton, BFormInput, BProgress },
  data () {
    return {
      remainingTime: timeInSec,
      max_num: 10,
      option: ['A', 'B', 'C', 'D'],
      screen: 'welcome',
      count: 0, // 题目计数
      selected: -1, // 记录当前选项
      localResult: { name: '', stuID: '', questions: [] },
      serverResult: null,
      ques: null, // 题库
      intervalHandle: null,
      msg: []
    }
  },
  created: () => console.log('大佬请认真答题'),
  destroyed () {
    this.post()
  },
  methods: {
    async start () {
      if (!this.localResult.stuID || !this.localResult.name) {
        this.message('infoInvalid')
      } else {
        const resp = await getResult()
        console.log(resp)
        if (!resp || resp.played === undefined) return this.message('offline')
        if (resp.played) {
          const serverResult = resp.result
          if (!serverResult) return this.message('notComplete')
          this.serverResult = serverResult
          this.message('done')
          this.screen = 'result'
          return
        }
        this.ques = resp.questions
        this.message('start')
        this.screen = 'main'
        this.intervalHandle = setInterval(() => this.countdown(), 1000)
      }
    },
    nextques () {
      this.localResult.questions.push({
        number: this.ques[this.count].number,
        answer: this.selected
      })
      this.remainingTime = timeInSec
      this.selected = -1 // 重置选项
      if (this.count + 1 >= this.max_num) {
        this.message('end')
        this.post()
        clearInterval(this.intervalHandle)
      } else this.count++
    },
    countdown () {
      if (this.count < this.max_num) {
        this.remainingTime--
        if (this.remainingTime === 0) this.nextques()
      }
    },
    async post () {
      this.serverResult = (await postResult({ result: this.localResult })).result
      this.screen = 'result'
    },
    message (i) {
      this.msg.push(msgs[i])
      setTimeout(() => {
        this.msg = []
      }, 5000)
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 30px;
}
label.form-check-label:hover{
  cursor:pointer;
  background:#E1E1E1
}
.ques-img img {
  max-width: 100%;
  max-height: 30vh;
}
</style>
