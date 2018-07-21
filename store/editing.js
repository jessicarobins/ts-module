const initialState = {
  line: null
}

const getters = {
  isEditing: state => !!state.line,
  getEditingLine: state => state.line
}

const mutations = {
  resetEditing(state) {
    state.line = ''
  },
  setEditing(state, line) {
    state.line = line
  }
}

export default {
  state: initialState,
  getters,
  mutations
}
