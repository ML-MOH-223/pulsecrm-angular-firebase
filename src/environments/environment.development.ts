import type { FirebaseEnvConfig } from './firebase-env.model';

export type { FirebaseEnvConfig };

export const environment = {
  production: false,
  useEmulators: false,
  firebase: {
    apiKey: 'AIzaSyAAHMPFRbs5QVe6IdIY0kCrxmqSJ6GsPko',
    authDomain: 'pulsecrm-app-f5ac0.firebaseapp.com',
    databaseURL: 'https://pulsecrm-app-f5ac0-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'pulsecrm-app-f5ac0',
    storageBucket: 'pulsecrm-app-f5ac0.firebasestorage.app',
    messagingSenderId: '876675571224',
    appId: '1:876675571224:web:ece8abe5f72a17532aad6d',
    measurementId: 'G-903S8J3X6Y',
  } satisfies FirebaseEnvConfig,
};
