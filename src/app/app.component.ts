import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthStore } from './core/auth/auth.store';
import { DEAL_STAGES, DealStage } from './core/models/crm.model';
import { CRM_STORE } from './core/state/crm.store';
import { AuthModalComponent } from './features/auth/auth-modal.component';
import { ContactDetailDrawerComponent } from './features/contacts/contact-detail-drawer.component';
import { ContactsDirectoryComponent } from './features/contacts/contacts-directory.component';
import { ForecastModalComponent } from './features/dashboard/forecast-modal.component';
import { KpiBannerComponent } from './features/dashboard/kpi-banner.component';
import { PipelineKanbanComponent } from './features/pipeline/pipeline-kanban.component';

type ActiveTab = 'pipeline' | 'contacts';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    KpiBannerComponent,
    PipelineKanbanComponent,
    ContactsDirectoryComponent,
    ContactDetailDrawerComponent,
    ForecastModalComponent,
    AuthModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!authStore.isAuthenticated()) {
      <app-auth-modal />
    } @else {
      <div class="min-h-screen bg-slate-50 text-slate-900">
        <!-- Top SaaS Header -->
        <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div class="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <!-- Brand & View Tabs -->
            <div class="flex items-center gap-6">
              <div class="flex items-center gap-2.5">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <div>
                  <span class="text-base font-bold tracking-tight text-slate-900">PulseCRM</span>
                  <div class="flex items-center gap-1.5">
                    @if (store.syncMode() === 'firestore') {
                      <span class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                        <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Firestore Live
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                        <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        Mode Démo Local
                      </span>
                    }
                  </div>
                </div>
              </div>

              <nav class="flex items-center rounded-lg bg-slate-100 p-1" aria-label="Navigation principale">
                <button
                  type="button"
                  (click)="activeTab.set('pipeline')"
                  class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                  [class]="activeTab() === 'pipeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                >
                  Pipeline Kanban
                </button>
                <button
                  type="button"
                  (click)="activeTab.set('contacts')"
                  class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                  [class]="activeTab() === 'contacts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                >
                  Contacts ({{ store.contacts().length }})
                </button>
              </nav>
            </div>

            <!-- Right Actions & User -->
            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="openForecast()"
                class="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                Prévisions mensuelles
              </button>

              @if (store.syncMode() === 'firestore' && store.deals().length === 0) {
                <button
                  type="button"
                  (click)="store.seedDemoDataToFirestore()"
                  class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Importer données démo
                </button>
              }

              <div class="flex items-center gap-2 border-l border-slate-200 pl-3">
                <span class="hidden text-xs font-medium text-slate-700 sm:inline">
                  {{ authStore.user()?.displayName }}
                </span>
                <button
                  type="button"
                  (click)="authStore.signOut()"
                  class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
          <!-- Error Banner -->
          @if (store.error(); as err) {
            <div class="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
              <span>{{ err }}</span>
              <button type="button" (click)="store.clearError()" class="ml-4 font-bold hover:underline">
                Fermer
              </button>
            </div>
          }

          <!-- Real-Time KPI Banner -->
          <app-kpi-banner />

          <!-- Instant Multi-Criteria Filter Bar -->
          <section class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div class="relative flex-1 min-w-[220px]">
              <svg class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="search"
                [value]="store.searchQuery()"
                (input)="onSearchInput($event)"
                placeholder="Rechercher un contact, une entreprise, une opportunité..."
                class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            <select
              [value]="store.ownerFilter() ?? ''"
              (change)="onOwnerChange($event)"
              aria-label="Filtrer par commercial"
              class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="">Tous les commerciaux</option>
              @for (owner of store.ownerOptions(); track owner.id) {
                <option [value]="owner.id">{{ owner.label }}</option>
              }
            </select>

            <select
              [value]="store.selectedStage()"
              (change)="onStageChange($event)"
              aria-label="Filtrer par étape"
              class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Toutes les étapes</option>
              @for (stage of stages; track stage.id) {
                <option [value]="stage.id">{{ stage.label }}</option>
              }
            </select>

            @if (store.searchQuery() || store.ownerFilter() || store.selectedStage() !== 'all') {
              <button
                type="button"
                (click)="resetFilters()"
                class="rounded-lg px-2.5 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                Réinitialiser
              </button>
            }
          </section>

          <!-- Main View Switcher -->
          @if (store.loading()) {
            <div class="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
              <span class="mr-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></span>
              Synchronisation temps réel avec Firestore...
            </div>
          } @else {
            @switch (activeTab()) {
              @case ('pipeline') {
                <app-pipeline-kanban />
              }
              @case ('contacts') {
                <app-contacts-directory />
              }
            }
          }
        </main>

        <!-- Contact Detail Slide-Over Drawer -->
        <app-contact-detail-drawer />

        <!-- Monthly Forecast Modal -->
        @if (showForecastModal()) {
          <app-forecast-modal (closed)="showForecastModal.set(false)" />
        }
      </div>
    }
  `,
})
export class AppComponent {
  readonly authStore = inject(AuthStore);
  readonly store = inject(CRM_STORE);

  readonly stages = DEAL_STAGES;
  readonly activeTab = signal<ActiveTab>('pipeline');
  readonly showForecastModal = signal(false);

  onSearchInput(event: Event): void {
    this.store.setSearchQuery((event.target as HTMLInputElement).value);
  }

  onOwnerChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.setOwnerFilter(val || null);
  }

  onStageChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as DealStage | 'all';
    this.store.setSelectedStage(val);
  }

  resetFilters(): void {
    this.store.setSearchQuery('');
    this.store.setOwnerFilter(null);
    this.store.setSelectedStage('all');
  }

  async openForecast(): Promise<void> {
    this.showForecastModal.set(true);
    await this.store.requestMonthlyForecast();
  }
}
