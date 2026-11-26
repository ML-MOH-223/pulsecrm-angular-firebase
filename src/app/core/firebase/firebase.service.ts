import { Injectable } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  Firestore,
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import {
  Functions,
  connectFunctionsEmulator,
  getFunctions,
} from 'firebase/functions';
import { appEnv, isFirebaseConfigReady } from '../config/env';
import { logger } from '../observability/logger';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly isConfigured: boolean;
  readonly app: FirebaseApp | null = null;
  readonly auth: Auth | null = null;
  readonly db: Firestore | null = null;
  readonly functions: Functions | null = null;

  constructor() {
    const cfg = appEnv.firebase;
    this.isConfigured = isFirebaseConfigReady(cfg);

    if (!this.isConfigured) {
      return;
    }

    const alreadyInitialized = getApps().length > 0;
    this.app = alreadyInitialized ? getApp() : initializeApp(cfg);
    this.auth = getAuth(this.app);

    // Enable offline persistent cache and auto-detect long polling for unstable 3G/4G or QUIC networks
    if (!alreadyInitialized) {
      try {
        this.db = initializeFirestore(this.app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
          experimentalAutoDetectLongPolling: true,
        });
      } catch (err) {
        logger.warn(
          'IndexedDB persistent cache unavailable, falling back to default Firestore instance',
          { module: 'FirebaseService' },
          err
        );
        this.db = getFirestore(this.app);
      }
    } else {
      this.db = getFirestore(this.app);
    }

    this.functions = getFunctions(this.app, 'europe-west1');

    if (appEnv.useEmulators) {
      connectAuthEmulator(this.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(this.db, '127.0.0.1', 8080);
      connectFunctionsEmulator(this.functions, '127.0.0.1', 5001);
    }
  }
}
