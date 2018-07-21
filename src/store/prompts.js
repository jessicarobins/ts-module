import get from 'lodash/get'
import moment from 'moment'
import { plugins } from '@/firebase'

const initialState = {
  loading: false,
  prompts: []
}

function formatPromptSnapshot(snapshot) {
  const prompts = []

  snapshot.forEach((prompt) => {
    prompts.push(prompt.data())
  })

  return prompts
}

const actions = {
  async getPrompts({ commit }) {
    commit('setPromptsLoading', true)
    const date = moment().format('MMMM D')
    const snapshot = await plugins.db
      .collection('prompts')
      .where('date', '==', date)
      .get()

    commit('setPrompts', formatPromptSnapshot(snapshot))
    commit('setPromptsLoading', false)
  }
}

const getters = {
  prompt: state => get(state, 'prompts[0].prompt', 'What do you want to say today?'),
  promptsAreLoading: state => state.loading
}

const mutations = {
  setPromptsLoading(state, payload) {
    state.loading = payload
  },
  setPrompts(state, payload) {
    state.prompts = payload
  }
}

export default {
  state: initialState,
  actions,
  getters,
  mutations
}
