const firebase = require('firebase/app')
require('firebase/auth')
require('firebase/firestore')
require('firebase/functions')
require('firebase/messaging')
require('firebase/storage')

module.exports = class FirebaseService {
  constructor({
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    storageBucket,
    messagingSenderId
  }) {
    firebase.initializeApp({
      apiKey,
      authDomain,
      databaseURL,
      projectId,
      storageBucket,
      messagingSenderId
    })

    this.messaging = firebase.messaging
  }

  auth() {
    return firebase.auth()
  }

  db() {
    if (!this.db) {
      this.db = firebase.firestore()
      this.db.settings({ timestampsInSnapshots: true })
    }
    return this.db
  }

  functions() {
    return ({
      addSubscription: firebase.functions().httpsCallable('addSubscription'),
      cancelSubscription: firebase.functions().httpsCallable('cancelSubscription'),
      getSubscription: firebase.functions().httpsCallable('getSubscription'),
      resubscribe: firebase.functions().httpsCallable('resubscribe'),
      setEncryptionKey: firebase.functions().httpsCallable('setEncryptionKey'),
    })
  }

  storage() {
    if (!this.storage) {
      this.storage = firebase.storage()
    }
    return this.storage
  }
}
