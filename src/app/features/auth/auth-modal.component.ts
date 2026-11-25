import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1 class="mt-4 text-xl font-bold text-slate-900">Connexion à PulseCRM</h1>
          <p class="mt-1 text-xs text-slate-500">
            Accédez à votre pipeline commercial temps réel et vos fiches clients.
          </p>
        </div>

        @if (authStore.error(); as err) {
          <div class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            {{ err }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submitEmail()" class="mt-6 space-y-3.5">
          @if (mode() === 'signup') {
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-700">Nom complet</label>
              <input
                type="text"
                formControlName="displayName"
                placeholder="Camille Laurent"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          }

          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              formControlName="email"
              placeholder="commercial@entreprise.fr"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-700">Mot de passe</label>
            <input
              type="password"
              formControlName="password"
              placeholder="••••••••"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            [disabled]="form.invalid || authStore.loading()"
            class="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ mode() === 'login' ? 'Se connecter' : 'Créer un compte' }}
          </button>
        </form>

        <div class="my-5 flex items-center gap-3">
          <div class="h-px flex-1 bg-slate-200"></div>
          <span class="text-[11px] font-medium uppercase text-slate-400">ou</span>
          <div class="h-px flex-1 bg-slate-200"></div>
        </div>

        <div class="space-y-2.5">
          <button
            type="button"
            (click)="authStore.signInWithGoogle()"
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Continuer avec Google
          </button>

          <button
            type="button"
            (click)="authStore.signInAnonymously()"
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Accès Démo Instantané (Anonyme)
          </button>
        </div>

        <p class="mt-5 text-center text-xs text-slate-500">
          @if (mode() === 'login') {
            Nouveau sur PulseCRM ?
            <button type="button" (click)="mode.set('signup')" class="font-semibold text-indigo-600 hover:underline">
              Créer un compte
            </button>
          } @else {
            Déjà un compte ?
            <button type="button" (click)="mode.set('login')" class="font-semibold text-indigo-600 hover:underline">
              Se connecter
            </button>
          }
        </p>
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

  async submitEmail(): Promise<void> {
    if (this.form.invalid) return;
    const { email, password, displayName } = this.form.getRawValue();
    if (this.mode() === 'signup') {
      await this.authStore.signUpWithEmail(email, password, displayName);
    } else {
      await this.authStore.signInWithEmail(email, password);
    }
  }
}
