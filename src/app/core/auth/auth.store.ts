import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { FirebaseService } from '../firebase/firebase.service';

export interface CrmUser {
  uid: string;
  displayName: string;
  email: string | null;
  isAnonymous: boolean;
  photoURL: string | null;
}

const DEMO_USER: CrmUser = {
  uid: 'demo-user',
  displayName: 'Camille Laurent',
  email: 'camille.laurent@pulsecrm.io',
  isAnonymous: true,
  photoURL: null,
};

function mapFirebaseUser(user: User): CrmUser {
  return {
    uid: user.uid,
    displayName:
      user.displayName ||
      (user.isAnonymous ? 'Commercial Démo' : user.email?.split('@')[0] || 'Utilisateur'),
    email: user.email,
    isAnonymous: user.isAnonymous,
    photoURL: user.photoURL,
  };
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly firebase = inject(FirebaseService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _user = signal<CrmUser | null>(null);
  private readonly _loading = signal<boolean>(true);
  private readonly _error = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isDemoMode = computed(() => !this.firebase.isConfigured);
  readonly isAuthenticated = computed(() => this._user() !== null);

  constructor() {
    if (!this.firebase.isConfigured || !this.firebase.auth) {
      this._user.set(DEMO_USER);
      this._loading.set(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      this.firebase.auth,
      (fbUser) => {
        this._user.set(fbUser ? mapFirebaseUser(fbUser) : null);
        this._loading.set(false);
      },
      (err) => {
        this._error.set(err.message);
        this._loading.set(false);
      }
    );

    this.destroyRef.onDestroy(() => unsubscribe());
  }

  clearError(): void {
    this._error.set(null);
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.firebase.auth) {
      this._user.set(DEMO_USER);
      return;
    }
    this._error.set(null);
    this._loading.set(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.firebase.auth, provider);
    } catch (err) {
      this._error.set(this.formatAuthError(err));
    } finally {
      this._loading.set(false);
    }
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    if (!this.firebase.auth) {
      this._user.set({
        ...DEMO_USER,
        email,
        displayName: email.split('@')[0] || 'Commercial',
        isAnonymous: false,
      });
      return;
    }
    this._error.set(null);
    this._loading.set(true);
    try {
      await signInWithEmailAndPassword(this.firebase.auth, email, password);
    } catch (err) {
      this._error.set(this.formatAuthError(err));
    } finally {
      this._loading.set(false);
    }
  }

  async signUpWithEmail(
    email: string,
    password: string,
    displayName: string
  ): Promise<void> {
    if (!this.firebase.auth) {
      this._user.set({
        ...DEMO_USER,
        email,
        displayName: displayName.trim() || 'Commercial',
        isAnonymous: false,
      });
      return;
    }
    this._error.set(null);
    this._loading.set(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        this.firebase.auth,
        email,
        password
      );
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      this._user.set(mapFirebaseUser(cred.user));
    } catch (err) {
      this._error.set(this.formatAuthError(err));
    } finally {
      this._loading.set(false);
    }
  }

  async signInAnonymously(): Promise<void> {
    if (!this.firebase.auth) {
      this._user.set(DEMO_USER);
      return;
    }
    this._error.set(null);
    this._loading.set(true);
    try {
      await firebaseSignInAnonymously(this.firebase.auth);
    } catch (err) {
      this._error.set(this.formatAuthError(err));
    } finally {
      this._loading.set(false);
    }
  }

  async signOut(): Promise<void> {
    if (!this.firebase.auth) {
      this._user.set(null);
      return;
    }
    this._error.set(null);
    try {
      await firebaseSignOut(this.firebase.auth);
    } catch (err) {
      this._error.set(this.formatAuthError(err));
    }
  }

  private formatAuthError(err: unknown): string {
    if (err instanceof Error) {
      return err.message.replace(/^Firebase:\s*/i, '');
    }
    return 'Erreur d’authentification inattendue.';
  }
}
