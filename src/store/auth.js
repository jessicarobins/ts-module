import get from 'lodash/get'
import merge from 'lodash/merge'
import omitBy from 'lodash/omitBy'

import { defaultReminderTime } from '../util'

const subscriptionInitialState = {
  brand: '',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  last4: null,
  loading: true,
  periodEnd: null,
  status: false,
  trialEnd: null,
}

const initialState = {
  blockedInBrowser: false,
  encryptionKey: null,
  loading: 0,
  settings: {
    imageCount: 0,
    reminderTime: defaultReminderTime,
  },
  subscription: { ...subscriptionInitialState },
  user: null
}

const actions = ({ router, firebase, bugsnagClient, displayMessage, displayError }) => ({
  async onUserLogin({ commit, dispatch, state }, authUser) {
    commit('incrementUserLoading')
    try {
      commit('setUser', authUser)
      await dispatch('getUserSettings')
      await dispatch('getEncryptionKey')
      // user hasn't explicitly turned off notifications
      if (state.settings.sendNotifications === true) {
        dispatch('requestMessagingPermission')
      } else if (state.settings.sendNotifications === undefined) {
        commit('toggleNotificationBanner', true)
      }

      dispatch('getSubscription')
    } catch (err) {
      if (bugsnagClient) {
        bugsnagClient.notify(err)
      }
      displayError(err)
    }
    commit('decrementUserLoading')
  },
  async getEncryptionKey({ commit }) {
    const { claims } = await firebase.auth().currentUser.getIdTokenResult()
    commit('setEncryptionKey', claims.encryptionKey)
  },
  async getSubscription({ commit }) {
    commit('setSubscriptionLoading', true)
    const subscription = await firebase.functions().getSubscription()
    if (subscription && subscription.data) {
      commit('modifyUserSubscription', subscription.data)
    }
    commit('setSubscriptionLoading', false)
  },
  async getUserSettings({ commit, state }) {
    const doc = await firebase.db()
      .collection('users')
      .doc(state.user.uid)
      .get()

    const data = doc.data()

    if (data) {
      commit('modifyUserSettings', data)
    }
  },
  async requestMessagingPermission({ commit, dispatch }, { notify = false } = {}) {
    try {
      await firebase.messaging.requestPermission()
      dispatch('setMessagingToken')
      firebase.messaging.onTokenRefresh(() => {
        dispatch('setMessagingToken')
      })

      if (notify) {
        displayMessage('Successfully subscribed to notifications!')
      }
    } catch (err) {
      commit('setBlockedInBrowser', true)
      console.log('Unable to get permission to notify.', err)
    }
  },
  async setMessagingToken({ dispatch }) {
    let messagingTokens = null
    try {
      const messagingToken = await firebase.messaging.getToken()
      messagingTokens = { [messagingToken]: true }
    } catch (err) {
      console.log('Unable to get permission to notify.', err)
      displayError(err)
    }
    dispatch('updateUser', {
      messagingTokens,
      sendNotifications: !!messagingTokens
    })
  },
  async updateUser({ commit, state }, attributes) {
    const nonEmptyAttributes = omitBy(attributes, attribute => attribute === undefined)
    await firebase.db()
      .collection('users')
      .doc(state.user.uid)
      .set(nonEmptyAttributes, { merge: true })
    commit('modifyUserSettings', nonEmptyAttributes)
  },
  async updateUserSettings({ commit, dispatch }, { sendNotifications, reminderTime, silent }) {
    if (!silent) {
      commit('incrementUserLoading')
    }
    try {
      await dispatch('updateUser', { sendNotifications, reminderTime })
      displayMessage('Notification settings updated!')
    } catch (err) {
      if (bugsnagClient) {
        bugsnagClient.notify(err)
        displayError(err)
      }
    }
    commit('decrementUserLoading')
  },
  async userEmailSignIn({ commit, dispatch }, { user: { email, password }, line }) {
    commit('incrementUserLoading')
    try {
      const doc = await firebase.auth().signInWithEmailAndPassword(email, password)
      await dispatch('onUserLogin', doc.user)
      if (line) {
        await dispatch('addLine', line)
      }
      router.push('Home')
    } catch (err) {
      if (bugsnagClient) {
        bugsnagClient.notify(err)
        displayError(err)
      }
    }
    commit('decrementUserLoading')
  },
  async userEmailSignUp({ commit, dispatch }, { user: { email, password }, line }) {
    commit('incrementUserLoading')
    try {
      const doc = await firebase.auth().createUserWithEmailAndPassword(email, password)
      const idToken = await doc.user.getIdToken()
      const { data } = await firebase.functions().setEncryptionKey({ idToken })
      firebase.auth().currentUser.getIdToken(true)
      commit('setEncryptionKey', data.encryptionKey)
      commit('setUser', doc.user)
      commit('toggleNotificationBanner', true)
      dispatch('updateUser', { reminderTime: defaultReminderTime })
      commit('setSubscriptionLoading', false)

      if (line) {
        await dispatch('addLine', line)
      }
      router.push('Home')
    } catch (err) {
      if (bugsnagClient) {
        bugsnagClient.notify(err)
      }
      displayError(err)
    }
    commit('decrementUserLoading')
  },
  async userSignOut({ commit }) {
    await firebase.auth().signOut()
    commit('resetUser')
    commit('resetLines')
    commit('toggleNotificationBanner', false)
    router.push('Login')
  },
  async subscribeUser({ commit }, { coupon, token }) {
    const { data } = await firebase.functions().addSubscription({
      coupon,
      stripePlan: 'premium_monthly',
      stripeToken: token.id,
    })

    commit('modifyUserSubscription', data)

    displayMessage('Subscription successful!')
    router.push('Home')
  },
  async resubscribeUser({ commit }) {
    commit('setSubscriptionLoading', true)
    const { data } = await firebase.functions().resubscribe()

    commit('modifyUserSubscription', data)

    displayMessage('Subscription successful!')
    commit('setSubscriptionLoading', false)
  },
  async unsubscribeUser({ commit }) {
    commit('setSubscriptionLoading', true)
    const { data } = await firebase.functions().cancelSubscription()

    commit('modifyUserSubscription', data)

    displayMessage('You have been successfully unsubscribed.')
    commit('setSubscriptionLoading', false)
  }
})

const FREE_IMAGE_COUNT = 5
const hasSubscription = status => ['trialing', 'active'].includes(status)

const getters = {
  blockedInBrowser: state => state.blockedInBrowser,
  encryptionKey: state => state.encryptionKey,
  hasMaxImages: state => !hasSubscription(state.subscription.status) &&
    (state.settings.imageCount >= FREE_IMAGE_COUNT),
  hasSubscription: state => hasSubscription(state.subscription.status),
  isAuthenticated: state => !!state.user,
  subscriptionIsLoading: state => state.subscription.loading,
  userEmail: state => get(state, 'user.email', ''),
  userIsLoading: state => state.loading > 0,
  userSettings: state => state.settings,
  userSubscription: state => state.subscription
}

const mutations = {
  modifyUserSettings(state, { imageCount, reminderTime, sendNotifications }) {
    merge(state.settings, { imageCount, reminderTime, sendNotifications })
  },
  modifyUserSubscription(state, {
    brand,
    cancel_at_period_end: cancelAtPeriodEnd,
    current_period_end: currentPeriodEnd,
    last4,
    status,
    trial_end: trialEnd
  }) {
    merge(state.subscription, {
      brand,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      last4,
      status,
      trialEnd
    })
  },
  resetUser(state) {
    state.blockedInBrowser = false
    state.encryptionKey = null
    state.settings = {}
    state.user = null
    state.subscription = { ...subscriptionInitialState }
  },
  setBlockedInBrowser(state, blockedInBrowser) {
    state.blockedInBrowser = blockedInBrowser
  },
  setEncryptionKey(state, key) {
    state.encryptionKey = key
  },
  incrementUserLoading(state) {
    state.loading += 1
  },
  decrementUserLoading(state) {
    state.loading -= 1
  },
  setSubscriptionLoading(state, loading) {
    state.subscription.loading = loading
  },
  setUser(state, { uid, email }) {
    bugsnagClient.user = { uid, email }
    state.user = { uid, email }
  }
}

export default ({ router, firebase, bugsnagClient }) => ({
  state: initialState,
  actions: actions({ router, firebase, bugsnagClient }),
  getters,
  mutations
})
