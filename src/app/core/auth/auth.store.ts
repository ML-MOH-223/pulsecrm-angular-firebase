import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { FirebaseService } from '../firebase/firebase.service';
import { AppError } from '../errors/app-error';
import { logger } from '../observability/logger';
import { createRequestId } from '../observability/request-id';

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
  private readonly _infoMessage = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly infoMessage = this._infoMessage.asReadonly();
  readonly isDemoMode = computed(() => !this.firebase.isConfigured);
  readonly isAuthenticated = computed(() => this._user() !== null);

  constructor() {
    if (!this.firebase.isConfigured || !this.firebase.auth) {
      this._user.set(DEMO_USER);
      logger.setActor(DEMO_USER.uid);
      this._loading.set(false);
      return;
    }

    getRedirectResult(this.firebase.auth).catch((err: unknown) => {
      const requestId = createRequestId('auth');
      this.handleAuthFailure('getRedirectResult', err, requestId);
    });

    const unsubscribe = onAuthStateChanged(
      this.firebase.auth,
      (fbUser) => {
        const mapped = fbUser ? mapFirebaseUser(fbUser) : null;
        this._user.set(mapped);
        logger.setActor(mapped?.uid ?? null);
        this._loading.set(false);
      },
      (err) => {
        const requestId = createRequestId('auth');
        this.handleAuthFailure('onAuthStateChanged', err, requestId);
        this._loading.set(false);
      }
    );

    this.destroyRef.onDestroy(() => unsubscribe());
  }

  clearError(): void {
    this._error.set(null);
  }

  clearInfo(): void {
    this._infoMessage.set(null);
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.firebase.auth) {
      this._user.set(DEMO_USER);
      return;
    }
    this._error.set(null);
    this._infoMessage.set(null);
    this._loading.set(true);
    const requestId = createRequestId('auth');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(this.firebase.auth, provider);
      logger.info('Google sign-in succeeded', { module: 'AuthStore', requestId });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-blocked') {
        logger.warn('Google popup blocked, falling back to redirect', {
          module: 'AuthStore',
          requestId,
        });
        this._infoMessage.set(
          'Fenêtre Google bloquée par le navigateur — redirection automatique en cours...'
        );
        try {
          await signInWithRedirect(this.firebase.auth, provider);
          return;
        } catch (redirectErr) {
          this.handleAuthFailure('signInWithRedirect', redirectErr, requestId);
          return;
        }
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        logger.warn('Google popup closed before completion', {
          module: 'AuthStore',
          requestId,
          providerCode: code,
        });
        this._error.set(this.formatAuthError(err));
        return;
      }
      this.handleAuthFailure('signInWithGoogle', err, requestId);
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
    this._infoMessage.set(null);
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
      this._infoMessage.set('Compte créé avec succès ! Bienvenue sur PulseCRM.');
      return;
    }
    this._error.set(null);
    this._infoMessage.set(null);
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
      this._infoMessage.set('Compte créé avec succès ! Bienvenue sur PulseCRM.');
    } catch (err) {
      this._error.set(this.formatAuthError(err));
    } finally {
      this._loading.set(false);
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    const trimmed = email.trim();
    if (!trimmed) {
      this._error.set('Saisissez d’abord votre adresse email pour recevoir le lien de réinitialisation.');
      return false;
    }
    if (!this.firebase.auth) {
      this._infoMessage.set(`Un lien de réinitialisation a été simulé pour ${trimmed}.`);
      return true;
    }
    this._error.set(null);
    this._infoMessage.set(null);
    this._loading.set(true);
    try {
      await sendPasswordResetEmail(this.firebase.auth, trimmed);
      this._infoMessage.set(
        `Un email de réinitialisation vient d’être envoyé à ${trimmed}. Pensez à vérifier vos spams.`
      );
      return true;
    } catch (err) {
      this._error.set(this.formatAuthError(err));
      return false;
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
    this._infoMessage.set(null);
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
    this._infoMessage.set(null);
    try {
      await firebaseSignOut(this.firebase.auth);
    } catch (err) {
      this._error.set(this.formatAuthError(err));
    }
  }

  private handleAuthFailure(action: string, err: unknown, requestId: string): void {
    const providerCode = (err as { code?: string })?.code ?? '';
    const userMessage = this.formatAuthError(err);
    const appErr = new AppError(`Auth action ${action} failed`, {
      code:
        providerCode === 'auth/unauthorized-domain'
          ? 'AUTH_UNAUTHORIZED_DOMAIN'
          : 'AUTH_ERROR',
      userMessage,
      requestId,
      context: { action, providerCode },
      cause: err,
    });
    logger.error(`Auth failure in ${action}`, { module: 'AuthStore', requestId }, appErr);
    this._error.set(`${userMessage} (réf. ${requestId})`);
  }

  private formatAuthError(err: unknown): string {
    const code = (err as { code?: string })?.code ?? '';
    const messages: Record<string, string> = {
      'auth/invalid-credential':
        'Email ou mot de passe incorrect. Vérifiez vos identifiants ou cliquez sur « Mot de passe oublié ? ».',
      'auth/user-not-found':
        'Aucun compte n’est associé à cet email. Vérifiez l’adresse ou créez un compte.',
      'auth/wrong-password':
        'Mot de passe incorrect. Réessayez ou cliquez sur « Mot de passe oublié ? ».',
      'auth/invalid-email':
        'Le format de l’adresse email est invalide.',
      'auth/email-already-in-use':
        'Un compte existe déjà avec cet email. Essayez de vous connecter.',
      'auth/weak-password':
        'Le mot de passe est trop court : utilisez au moins 6 caractères.',
      'auth/too-many-requests':
        'Trop de tentatives échouées. Patientez quelques minutes ou réinitialisez votre mot de passe.',
      'auth/popup-closed-by-user':
        'La fenêtre de connexion Google a été fermée avant la fin. Réessayez ou connectez-vous par email.',
      'auth/cancelled-popup-request':
        'Une fenêtre de connexion Google est déjà ouverte. Finalisez-la ou réessayez.',
      'auth/popup-blocked':
        'Votre navigateur a bloqué la fenêtre Google. Autorisez les pop-ups ou utilisez votre email.',
      'auth/network-request-failed':
        'Connexion Internet indisponible. Vérifiez votre réseau et réessayez.',
      'auth/operation-not-allowed':
        'Cette méthode de connexion n’est pas encore activée. Essayez par email ou avec Google.',
      'auth/unauthorized-domain':
        `Ce domaine (${typeof window !== 'undefined' ? window.location.hostname : 'actuel'}) n’est pas autorisé dans Firebase Auth. Ajoutez-le dans Firebase Console → Authentication → Settings → Authorized domains.`,
    };

    if (code && messages[code]) {
      return messages[code];
    }
    return 'Impossible de finaliser l’authentification pour le moment. Réessayez dans un instant.';
  }
}
