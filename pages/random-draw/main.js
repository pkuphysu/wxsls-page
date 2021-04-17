import { requestApi } from '../../utils/api'

let handle = 0 // 记录真正是否循环
let timeoutHandle = 0
let initClick = null

const ensureLoop = 20
let loopNow = 0

let allStudents = null
let names = null
const luckyDogs = []
let pointsEnabled = true
let totalPoints = 0
const pointList = []
let studentNum = 0

const urlParams = new URLSearchParams(window.location.search)
const prizeType = urlParams.get('prize')
const eventName = urlParams.get('event')
const apiPoint = urlParams.get('api')
// initial word should be as long as possible
// to get enough particles
window.word = urlParams.get('word') || eventName

const interval = 200

// try to avoid cache
requestApi('GET', `${apiPoint}${location.search}&${Math.floor(Date.now() / 1000)}`)
  .then(function (data) {
    allStudents = data
    if (Array.isArray(allStudents)) {
      pointsEnabled = false
      names = allStudents
    } else {
      names = Object.keys(allStudents)
      names.forEach((name) => {
        const point = allStudents[name][prizeType] + 1
        pointList.push(point)
        totalPoints += point
        studentNum += 1
      })
    }
  })

function setText (s) {
  window.clearWord()
  window.nextText = [[], []]
  window.text = []
  window.createText(s)
}

function naiveSelect () {
  if (pointsEnabled) {
    const randPoint = Math.floor(Math.random() * totalPoints)
    let accumPoint = 0
    for (let i = 0; i < studentNum; i++) {
      accumPoint += pointList[i]
      if (accumPoint > randPoint) return names[i]
    }
  } else return names[Math.floor(Math.random() * names.length)]
}

function randomSelect () {
  let selected = '人数不足'
  if (luckyDogs.length < names.length) { while (luckyDogs.includes(selected = naiveSelect())); }

  setText(selected)
  if (loopNow++ > ensureLoop && Math.random() < 0.1 && handle !== 0) {
    loopNow = 0
    clearInterval(handle)
    handle = 0
    luckyDogs.push(selected)
    setTimeout(() => { window.textColor = '#1d73c9' }, interval)
    timeoutHandle = setTimeout(restore, 10000)
  }
}

function restore () {
  if (handle === 0) {
    window.textColor = 'white'
    setText(eventName)
  }
}

window.onkeypress = function (e) {
  if (e.keyCode === 13) {
    window.location.reload()
  }
}

document.getElementById('play-zone').addEventListener('click', function () {
  if (!initClick) {
    initClick = 1
    return
  }
  if (!names) {
    setText('尚未就绪')
    return
  }
  if (handle === 0) {
    clearTimeout(timeoutHandle) // 下一轮开始时，之前的timeout不要插嘴
    window.textColor = 'white'
    randomSelect() // 不要窒息1s
    handle = setInterval(randomSelect, interval)
  }
})
