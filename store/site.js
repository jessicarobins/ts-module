const initialState = {
  showNotificationBanner: false
}

const getters = {
  showNotificationBanner: state => state.showNotificationBanner,
}

const mutations = {
  toggleNotificationBanner(state, payload) {
    if (payload !== undefined) {
      state.showNotificationBanner = payload
    } else {
      state.showNotificationBanner = !state.showNotificationBanner
    }
  }
}

export default {
  state: initialState,
  getters,
  mutations
}
