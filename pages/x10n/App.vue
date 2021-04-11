<template>
  <div id="app">
    <div class="container" align="center">
      <b-form v-if="show1" class="col-10" >
        <h2>数量级估算大赛</h2>
        <p style="font-size: x-small;">见到此页面即可开始答题</p>
        <div class="text-left" style="font-size: small">
          <p>
            这次比赛是为了给大家的五一假期增加快乐，题目可能有失严谨，请大家见谅~
            如果遇到了其他问题，请咨询<a href="mailto://wulixynl@163.com">wulixynl@163.com</a>
          </p>
          <p>请注意写完题之后<em>不能回头修改</em>，<em>中途不能暂停或退出</em>，请一次性做完~</p>
        </div>
        <p>以下信息用于领奖，请如实填写</p>
        <b-input-group prepend="学号" class="mb-2 mr-sm-2 mb-sm-0">
          <b-form-input type="number" v-model.trim="result.stuId" />
        </b-input-group>
        <b-input-group prepend="姓名" class="mb-2 mr-sm-2 mb-sm-0">
          <b-form-input v-model.trim="result.name"></b-form-input>
        </b-input-group>
        <b-input-group prepend="微信号" class="mb-2 mr-sm-2 mb-sm-0">
          <b-form-input v-model.trim="result.wx"></b-form-input>
        </b-input-group>
        <br />
        <p style="font-size: small;">可能因为带宽问题点击开始键会有延迟，请不要离开</p>
        <div>
          <b-button block variant="primary" @click="start"><h4>start</h4></b-button>
        </div>
      </b-form>
  </div>
  <div class="container col-10">
      <div v-if="show2">
        <div class="row">
          <div class="col-md-11">
            <b-progress :value="count+1" :max="max_num"></b-progress>
          </div>
          <div class="col-md-1">
            TIME:{{(interval-(present_time-result.time))/1000}}
          </div>
        </div>
        <br>
        <div>
          <span class="badge badge-pill badge-primary">{{count+1}}</span>
          {{ques[count].text}}
        </div>
        <div class="ques-img">
          <img v-if="!!ques[count].img" :src="ques[count].img" />
        </div>
        <div v-for="(choice,i) in ques[count].choices" :key="i" class="form-check my-3" >
          <label class="form-check-label py-2 container-fluid">
            <input type="radio" class="form-check-input" name="choice" :value="i" v-model="selected"/>
            {{option[i]}}.&nbsp;{{choice}}
          </label>
        </div>
        <div>
          <b-button block variant="outline-primary" @click="nextques" class="py-1"><h4>next question</h4></b-button>
        </div>
      </div>
      <div v-if="!(show1||show2)" id="result" class="text-center">
        <h2>{{result.name}}的答题结果</h2>
        <p>
          用时：{{result.time / 1000}}s，
          答对 {{result.question.filter(q=>q.answer).length}} 题
        </p>
        <p>
          你真是数量级估算带师啊。截个图更方便对答案哦~
          看看你和小伙伴都答对了哪些题呢？（第二个数字表示题目唯一编号）
        </p>
        <span
          v-for="(q,i) in result.question"
          :key="q.number"
          class="badge badge-pill p-2 m-1"
          :class="{
            'badge-success': q.answer,
            'badge-danger': !q.answer
            }"
        >{{i+1}}-{{q.number}}</span>
      </div>
    </div>
    <br />
    <div class="position-fixed fixed-bottom">
     <b-alert :show="3" dismissible fade variant="warning">
       请登录哦
     </b-alert>
     <div v-for="(s, i) in msg" :key="i">
       <b-alert :show="5" dismissible fade :variant="s.type">{{s.text}}
       </b-alert>
      </div>
    </div>
  </div>
</template>

<script>
import {BForm, BInputGroup, BAlert, BButton, BFormInput } from 'bootstrap-vue'

const postResult = async (id, body) =>
  await (
    await fetch(`https://pkuphysu.top/test/api/x10n?id=${id}`, {
      method: "POST",
      body
    })
  ).json();
const getResult = async id =>
  await (
    await fetch(`https://pkuphysu.top/test/api/x10n?id=${id}`, {
      method: "GET"
    })
  ).json();

export default {
  name: "App",
  components: {BForm, BInputGroup, BAlert, BButton, BFormInput},
  data() {
    return {
      interval:30000,
      max_num:30,
      option: ["A", "B", "C", "D"],
      show1: true,
      show2: false,
      count: 0, //题目计数
      selected: -1, //记录当前选项
      result: { stuId: "", name: "", wx: "", time: 0, question: [] }, //完成一题更新一遍time if(present_time - time > ...)则判定超时，自动下一题
      start_time: 0, //开始时的时间 用于最后post所用时长
      present_time: 0, //现在的时间，一直计时
      ques: null, //题库
      msgs:[
        {type:"warning",text:"请至少填一个像样的信息"},
        {type:"success",text:"答题开始！"},
        {type:"success",text:"答题结束啦！"},
        {type:"warning",text:"该学号已经答题过了哦"},
        {type:"warning",text:"不能帮别人查询~"},
        {type:"warning",text:"看起来中途离开了，那就没有成绩了"},
        {type:"warning",text:"比赛看起来不在线上"}
      ],
      msg:[]
    };
  },
  methods: {
    async start() {
      if (this.result.stuId.length != 10 || !this.result.wx || !this.result.name)
        this.message(0);
      else {
        let resp = await getResult(this.result.stuId);
        console.log(resp);
        if (!resp || resp.played === undefined) return this.message(6)
        if (resp.played) {
          let result = JSON.parse(resp.result);
          if (result === null) return this.message(5)
          if (result.wx !== this.result.wx || result.name !== this.result.name) {
            this.message(4);
            return;
          }
          this.result = result;
          this.message(3);
          this.show1 = false;
          this.show2 = false;
          return;
        }
        //if (!resp.result.question.length < max_num) {
      let res = await fetch("round1.json"); //获取json
      let array = await res.json();
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      } //打乱数组
      this.ques = array
      this.message(1);
      this.show2 = true;
      this.show1 = false;
      this.result.time = Date.parse(new Date()); //记录时间
      this.start_time = this.result.time;
      this.countdown(); //开始计时
      }
    },
    nextques() {
      let check = this.selected == this.ques[this.count].answer;
      this.result.question.push({
        number: this.ques[this.count].number,
        answer: check
      });
      this.result.time = this.present_time; //传入时间
      this.selected = -1; //重置选项
      this.count++;
    },
    countdown() {
      this.present_time = Date.parse(new Date());
      setTimeout(() => {
        //console.log(that.present_time)
        if (this.count < this.max_num) this.countdown(); //递归
      }, 1000);
    },
    post() {
      this.result.time -= this.start_time;
      postResult(this.result.stuId, JSON.stringify(this.result));
    },
    message(i){
      this.msg.push(this.msgs[i])
      setTimeout(() => {
        this.msg = []
      }, 5000);
    }
  },
  created: () => console.log('大佬请认真答题'),
  destroyed() {
    this.post();
  },
  watch: {
    count() {
      if (this.count >= this.max_num) {
        this.show2 = false;
        this.message(2);
        this.post();
      }
    },
    present_time() {
      if (this.present_time - this.result.time > this.interval) this.nextques();
    },
  }
};
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
