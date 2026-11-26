import { TestBed } from '@angular/core/testing';
import { FirebaseService } from '../firebase/firebase.service';
import { AuthStore } from './auth.store';

describe('AuthStore (critical auth flows)', () => {
  let store: AuthStore;

  const mockFirebaseService = {
    isConfigured: false,
    app: null,
    auth: null,
    db: null,
    functions: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    });
    store = TestBed.inject(AuthStore);
  });

  it('initializes in demo mode when Firebase is not configured', () => {
    expect(store.isDemoMode()).toBeTrue();
    expect(store.isAuthenticated()).toBeTrue();
    expect(store.loading()).toBeFalse();
    expect(store.user()?.uid).toBe('demo-user');
  });

  it('signs out and clears user state', async () => {
    await store.signOut();
    expect(store.isAuthenticated()).toBeFalse();
    expect(store.user()).toBeNull();
  });

  it('signs in with email in demo mode and derives displayName', async () => {
    await store.signOut();
    await store.signInWithEmail('alice.martin@pulsecrm.io', 'secret123');
    expect(store.isAuthenticated()).toBeTrue();
    expect(store.user()?.email).toBe('alice.martin@pulsecrm.io');
    expect(store.user()?.displayName).toBe('alice.martin');
    expect(store.user()?.isAnonymous).toBeFalse();
  });

  it('signs up with email, trims displayName, and sets welcome info message', async () => {
    await store.signOut();
    await store.signUpWithEmail('bob@pulsecrm.io', 'secret123', '  Bob Dupont  ');
    expect(store.user()?.displayName).toBe('Bob Dupont');
    expect(store.infoMessage()).toContain('Compte créé');
  });

  it('falls back to Commercial when signUp displayName is blank', async () => {
    await store.signUpWithEmail('bob@pulsecrm.io', 'secret123', '   ');
    expect(store.user()?.displayName).toBe('Commercial');
  });

  it('rejects empty email on resetPassword with a clear French error', async () => {
    const result = await store.resetPassword('   ');
    expect(result).toBeFalse();
    expect(store.error()).toContain('adresse email');
  });

  it('accepts valid email on resetPassword and sets infoMessage', async () => {
    const result = await store.resetPassword('claire@pulsecrm.io');
    expect(result).toBeTrue();
    expect(store.infoMessage()).toContain('claire@pulsecrm.io');
  });

  it('supports Google and anonymous sign-in in demo mode', async () => {
    await store.signOut();
    await store.signInWithGoogle();
    expect(store.user()?.uid).toBe('demo-user');

    await store.signOut();
    await store.signInAnonymously();
    expect(store.user()?.uid).toBe('demo-user');
  });

  it('clears error and info messages explicitly', async () => {
    await store.resetPassword('');
    expect(store.error()).not.toBeNull();
    store.clearError();
    expect(store.error()).toBeNull();

    await store.resetPassword('test@pulsecrm.io');
    expect(store.infoMessage()).not.toBeNull();
    store.clearInfo();
    expect(store.infoMessage()).toBeNull();
  });
});
