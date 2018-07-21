import Vue from 'vue'
import Vuex from 'vuex'
import createLogger from 'vuex/dist/logger'

import auth from './auth'
import editing from './editing'
import lines from './lines'
import prompts from './prompts'
import site from './site'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production';

export default new Vuex.Store({
  state: {

  },
  modules: {
    auth,
    editing,
    lines,
    prompts,
    site
  },
  mutations: {

  },
  plugins: debug ? [createLogger()] : [],
  actions: {

  }
})
