import get from 'lodash/get'
import moment from 'moment'

const initialState = {
  loading: true,
  prompts: []
}

function formatPromptSnapshot(snapshot) {
  const prompts = []

  snapshot.forEach((prompt) => {
    prompts.push(prompt.data())
  })

  return prompts
}

const actions = ({ firebase }) => ({
  async getPrompts({ commit }) {
    commit('setPromptsLoading', true)
    const date = moment().format('MMMM D')
    const snapshot = await firebase.firestore()
      .collection('prompts')
      .where('date', '==', date)
      .get()

    commit('setPrompts', formatPromptSnapshot(snapshot))
    commit('setPromptsLoading', false)
  }
})

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

export default ({ firebase }) => ({
  state: initialState,
  actions: actions({ firebase }),
  getters,
  mutations
})
