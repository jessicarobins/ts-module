import moment from 'moment'
import get from 'lodash/get'
import uniq from 'lodash/uniq'
import CryptoJS from 'crypto-js'
import { plugins } from '@/firebase'
import { groupByDateFormat } from '@/util'

const initialState = {
  hasToday: false,
  lines: [],
  loading: true,
  tags: []
}

function getIndexOfToday(lineArray) {
  const today = moment().format(groupByDateFormat)
  return lineArray.findIndex(([key]) => key === today)
}

function getLineArray(lines) {
  const today = moment().format(groupByDateFormat)
  const lineArray = Object.entries(lines)
  if (lines[today] && lines[today].length) {
    const indexOfToday = getIndexOfToday(lineArray)
    if (indexOfToday > 0) {
      return [...lineArray.slice(indexOfToday), ...lineArray.slice(0, indexOfToday)]
    }
  }

  return lineArray
}

function getTagObjectFromArray(tags) {
  const today = moment()
  return tags.reduce((acc, curr) => {
    acc[curr] = today.valueOf()
    return acc
  }, {})
}

function formatLineCollectionSnapshot(snapshot, encryptionKey) {
  const today = moment()
  const lines = {}
  const tags = []
  let hasToday = false

  snapshot.forEach((doc) => {
    const data = doc.data()
    const date = moment(data.createdAt.toDate()).format(groupByDateFormat)
    const textBytes = CryptoJS.AES.decrypt(data.text, encryptionKey)
    const text = textBytes.toString(CryptoJS.enc.Utf8)
    const line = { ...data, text, id: doc.id }
    if (lines[date]) {
      lines[date].push(line)
    } else {
      lines[date] = [line]
    }
    if (today.isSame(moment(data.createdAt.toDate()), 'd')) {
      hasToday = true
    }

    tags.push(...Object.keys(data.tags || {}))
  })

  const lineArray = getLineArray(lines)
  return { lines: lineArray, hasToday, tags }
}

function encryptText(text, key) {
  return CryptoJS.AES.encrypt(text, key).toString()
}

const actions = {
  async addLine({ commit, rootState }, { text, tags }) {
    commit('setLinesLoading', true)
    const today = moment()
    const tagObject = getTagObjectFromArray(tags)
    const encryptedText = encryptText(text, rootState.auth.encryptionKey)
    const line = {
      createdAt: today.toDate(),
      dayOfWeek: today.day(),
      ...today.toObject(),
      tags: tagObject,
      text: encryptedText,
    }
    const { id } = await plugins.db
      .collection('users')
      .doc(rootState.auth.user.uid)
      .collection('lines')
      .add(line)

    commit('addLine', { ...line, text, id })
    commit('addTags', tags)
    commit('setHasToday', true)
    commit('setLinesLoading', false)
  },
  async editLine({ commit, rootState }, { id, text, tags }) {
    commit('setLinesLoading', true)

    const tagObject = getTagObjectFromArray(tags)
    const lineRef = plugins.db
      .collection('users')
      .doc(rootState.auth.user.uid)
      .collection('lines')
      .doc(id);

    const encryptedText = encryptText(text, rootState.auth.encryptionKey)
    const newLineProps = { text, tags: tagObject }
    await lineRef.set({ ...newLineProps, text: encryptedText }, { merge: true })
    commit('addTags', tags)
    commit('setLine', newLineProps)
    commit('resetEditing')
    commit('setLinesLoading', false)
  },
  async getLines({ commit, rootState }, { tag } = {}) {
    const { user, encryptionKey } = rootState.auth
    commit('setLinesLoading', true)
    let snapshotPromise = plugins.db
      .collection('users')
      .doc(user.uid)
      .collection('lines')

    if (tag) {
      snapshotPromise = snapshotPromise
        .where(`tags.${tag}`, '>', 0)
        .orderBy(`tags.${tag}`, 'desc')
    } else {
      snapshotPromise = snapshotPromise
        .orderBy('createdAt', 'desc')
    }

    const snapshot = await snapshotPromise.get()

    const { hasToday, lines, tags } = formatLineCollectionSnapshot(snapshot, encryptionKey)
    commit('setHasToday', hasToday)
    commit('setLines', lines)
    commit('setTags', tags)
    commit('setLinesLoading', false)
  },
}

const getters = {
  hasToday: state => state.hasToday,
  lines: state => state.lines,
  linesAreLoading: state => state.loading,
  tags: state => state.tags
}

const mutations = {
  addLine(state, line) {
    const date = moment(line.createdAt).format(groupByDateFormat)
    if (get(state.lines, '[0][0]') === date) {
      state.lines[0][1].unshift(line)
    } else {
      state.lines.unshift([date, [line]])
    }
  },
  addTags(state, tags) {
    state.tags = uniq(state.tags.concat(tags)).sort()
  },
  resetLines(state) {
    state.lines = {}
    state.hasToday = false
  },
  setHasToday(state, payload) {
    state.hasToday = payload
  },
  setLine(state, newLineProps) {
    const line = state.lines[0][1].shift()
    state.lines[0][1].unshift({ ...line, ...newLineProps })
  },
  setLines(state, payload) {
    state.lines = payload
  },
  setLinesLoading(state, isLoading) {
    state.loading = isLoading
  },
  setTags(state, tags) {
    state.tags = uniq(tags).sort()
  },
}

export default {
  state: initialState,
  actions,
  getters,
  mutations
}
