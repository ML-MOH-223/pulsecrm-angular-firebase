import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }
    `,
  ],
  template: `
    <div class="flex min-h-screen w-full flex-col bg-[#f4f6fa] transition-colors duration-200 dark:bg-[#0f172a] lg:flex-row">
      <!-- Left Obsidian Brand Showcase -->
      <div class="relative hidden lg:flex lg:w-1/2 lg:min-h-screen flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white">
        <div class="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl"></div>

        <div class="relative flex items-center gap-3">
          <img
            src="pulsecrm-logo.png"
            alt="PulseCRM — Customer Relationship Platform"
            class="h-11 w-auto rounded-xl bg-white px-3 py-1.5 shadow-lg"
          />
        </div>

        <div class="relative max-w-md space-y-5">
          <h2 class="font-display text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
            Pilotez votre pipeline commercial en temps réel.
          </h2>
          <p class="text-sm leading-relaxed text-slate-400">
            Suivez vos prospects, centralisez vos fiches clients, mesurez vos prévisions de ventes et ne ratez plus aucune relance.
          </p>

          <div class="grid grid-cols-2 gap-3 pt-2">
            <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p class="font-display text-base font-bold text-indigo-400">Temps réel</p>
              <p class="mt-1 text-xs text-slate-400">Mises à jour instantanées sur tous vos appareils</p>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p class="font-display text-base font-bold text-emerald-400">Automatisé</p>
              <p class="mt-1 text-xs text-slate-400">Score d’engagement et suivi client intégrés</p>
            </div>
          </div>
        </div>

        <p class="relative text-xs text-slate-500">
          PulseCRM · Espace commercial collaboratif
        </p>
      </div>

      <!-- Right Auth Form Panel -->
      <div class="flex flex-1 min-h-screen items-center justify-center p-4 sm:p-10">
        <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/5 dark:bg-[#162033] dark:ring-slate-700/70 sm:p-8">
          <div class="text-center lg:text-left">
            <img
              src="pulsecrm-logo.png"
              alt="PulseCRM"
              class="mx-auto mb-4 h-11 w-auto rounded-xl bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-900/5 lg:hidden"
            />
            <h1 class="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              {{ mode() === 'login' ? 'Bon retour sur PulseCRM' : 'Créer votre espace' }}
            </h1>
            <p class="mt-1 text-xs text-slate-500">
              {{ mode() === 'login'
                ? 'Connectez-vous pour accéder à vos opportunités et fiches clients.'
                : 'Créez un compte gratuit en quelques secondes.' }}
            </p>
          </div>

          @if (authStore.error(); as err) {
            <div
              role="alert"
              class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200"
            >
              {{ err }}
            </div>
          }

          @if (authStore.infoMessage(); as info) {
            <div
              role="status"
              class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200"
            >
              {{ info }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submitEmail()" class="mt-5 space-y-3.5">
            @if (mode() === 'signup') {
              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nom complet</label>
                <input
                  type="text"
                  formControlName="displayName"
                  placeholder="Ex: Camille Laurent"
                  class="ds-input"
                />
              </div>
            }

            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Email professionnel</label>
              <input
                type="email"
                formControlName="email"
                placeholder="commercial@entreprise.fr"
                class="ds-input"
              />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <p class="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  Veuillez saisir une adresse email valide.
                </p>
              }
            </div>

            <div>
              <div class="mb-1 flex items-center justify-between">
                <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Mot de passe</label>
                @if (mode() === 'login') {
                  <button
                    type="button"
                    (click)="onForgotPassword()"
                    class="py-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Mot de passe oublié ?
                  </button>
                }
              </div>
              <input
                type="password"
                formControlName="password"
                placeholder="6 caractères minimum"
                class="ds-input"
              />
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <p class="mt-1 text-[11px] font-medium text-rose-600">
                  Le mot de passe doit contenir au moins 6 caractères.
                </p>
              }
            </div>

            <button
              type="submit"
              [disabled]="authStore.loading()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
            >
              @if (authStore.loading()) {
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Connexion en cours...</span>
              } @else {
                <span>{{ mode() === 'login' ? 'Se connecter' : 'Créer mon compte' }}</span>
              }
            </button>
          </form>

          <div class="my-4 flex items-center gap-3">
            <div class="h-px flex-1 bg-slate-200"></div>
            <span class="text-[11px] font-medium uppercase text-slate-400">ou</span>
            <div class="h-px flex-1 bg-slate-200"></div>
          </div>

          <div class="space-y-2">
            <button
              type="button"
              [disabled]="authStore.loading()"
              (click)="authStore.signInWithGoogle()"
              class="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Continuer avec Google
            </button>

            <button
              type="button"
              [disabled]="authStore.loading()"
              (click)="authStore.signInAnonymously()"
              class="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/70 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
            >
              Essayer sans créer de compte (Démo)
            </button>
          </div>

          <p class="mt-5 text-center text-xs text-slate-500">
            @if (mode() === 'login') {
              Nouveau sur PulseCRM ?
              <button type="button" (click)="switchMode('signup')" class="font-semibold text-indigo-600 hover:underline">
                Créer un compte
              </button>
            } @else {
              Déjà un compte ?
              <button type="button" (click)="switchMode('login')" class="font-semibold text-indigo-600 hover:underline">
                Se connecter
              </button>
            }
          </p>
        </div>
      </div>
    </div>
  `,
})
export class AuthModalComponent {
  readonly authStore = inject(AuthStore);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly mode = signal<'login' | 'signup'>('login');

  readonly form = this.fb.group({
    displayName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  switchMode(next: 'login' | 'signup'): void {
    this.mode.set(next);
    this.authStore.clearError();
    this.authStore.clearInfo();
  }

  async onForgotPassword(): Promise<void> {
    this.form.controls.email.markAsTouched();
    await this.authStore.resetPassword(this.form.controls.email.value);
  }

  async submitEmail(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { email, password, displayName } = this.form.getRawValue();
    if (this.mode() === 'signup') {
      await this.authStore.signUpWithEmail(email, password, displayName);
    } else {
      await this.authStore.signInWithEmail(email, password);
    }
  }
}
