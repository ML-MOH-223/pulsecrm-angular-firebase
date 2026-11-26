import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { AuthStore } from './core/auth/auth.store';
import { DEAL_STAGES, DealStage } from './core/models/crm.model';
import { CRM_STORE } from './core/state/crm.store';
import { ThemeStore } from './core/state/theme.store';
import { AuthModalComponent } from './features/auth/auth-modal.component';
import { ContactDetailDrawerComponent } from './features/contacts/contact-detail-drawer.component';
import { ContactsDirectoryComponent } from './features/contacts/contacts-directory.component';
import { ForecastModalComponent } from './features/dashboard/forecast-modal.component';
import { KpiBannerComponent } from './features/dashboard/kpi-banner.component';
import { PipelineKanbanComponent } from './features/pipeline/pipeline-kanban.component';
import { ActiveTab, AppSidebarComponent } from './shared/layout/app-sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AppSidebarComponent,
    KpiBannerComponent,
    PipelineKanbanComponent,
    ContactsDirectoryComponent,
    ContactDetailDrawerComponent,
    ForecastModalComponent,
    AuthModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (authStore.loading()) {
      <div class="flex min-h-screen flex-col items-center justify-center bg-[#f4f6fa] px-4 text-center dark:bg-[#0d1424]">
        <img
          src="pulsecrm-icon.png"
          alt="PulseCRM"
          width="52"
          height="52"
          class="mb-4 h-14 w-14 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-900/10"
        />
        <div class="flex items-center gap-2.5 text-sm font-medium text-slate-600 dark:text-slate-300">
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></span>
          <span>Chargement de votre espace PulseCRM...</span>
        </div>
      </div>
    } @else if (!authStore.isAuthenticated()) {
      <app-auth-modal />
    } @else {
      <div class="flex min-h-screen w-full overflow-x-clip bg-[#f4f6fa] text-slate-900 transition-colors duration-200 dark:bg-[#0f172a] dark:text-slate-100">
        <!-- Responsive Sidebar (Desktop Sticky + Mobile Slide-Over Drawer) -->
        <app-sidebar
          [activeTab]="activeTab()"
          [mobileOpen]="mobileMenuOpen()"
          (tabSelected)="selectTab($event)"
          (mobileClosed)="mobileMenuOpen.set(false)"
          (forecastRequested)="openForecast()"
          (seedRequested)="seedDemoData()"
          (signOutRequested)="signOut()"
        />

        <!-- Right Main Workspace -->
        <div class="flex min-w-0 flex-1 flex-col">
          <!-- Sticky Top Command Bar -->
          <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors duration-200 dark:border-white/[0.06] dark:bg-[#0d1424]/85">
            <div class="mx-auto flex max-w-[1600px] flex-col gap-2.5 px-3.5 py-2.5 sm:px-6 sm:py-3 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <!-- Top Row on Mobile: Hamburger + Title + Dark Mode Toggle -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    (click)="mobileMenuOpen.set(true)"
                    [attr.aria-expanded]="mobileMenuOpen()"
                    aria-label="Ouvrir le menu"
                    class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 lg:hidden"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  </button>

                  <div class="min-w-0">
                    <h1 class="truncate font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base lg:text-lg">
                      {{ activeTab() === 'pipeline' ? 'Pipeline Commercial' : 'Répertoire Contacts' }}
                    </h1>
                    <p class="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                      {{ activeTab() === 'pipeline'
                        ? 'Suivez vos opportunités en temps réel et accélérez vos closings'
                        : 'Centralisez vos comptes, scores d’engagement et journaux d’activités' }}
                    </p>
                  </div>
                </div>

                <!-- Dark Mode Toggle (Mobile/Tablet) -->
                <button
                  type="button"
                  (click)="themeStore.toggle()"
                  [attr.aria-label]="themeStore.isDark() ? 'Passer en thème clair' : 'Passer en thème sombre'"
                  class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700 lg:hidden"
                >
                  @if (themeStore.isDark()) {
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                  } @else {
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>
                  }
                </button>
              </div>

              <!-- Search + Filters + Desktop Theme Toggle -->
              <div class="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center lg:flex-nowrap">
                <div class="relative min-[380px]:col-span-2 sm:w-64 sm:flex-none lg:w-72">
                  <svg class="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400 sm:top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="search"
                    [value]="store.searchQuery()"
                    (input)="onSearchInput($event)"
                    placeholder="Rechercher contact, deal..."
                    class="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-base text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-slate-800 sm:min-h-[38px] sm:text-xs"
                  />
                </div>

                <select
                  [value]="store.ownerFilter() ?? ''"
                  (change)="onOwnerChange($event)"
                  aria-label="Filtrer par commercial"
                  class="min-h-[44px] min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-base font-medium text-slate-700 transition hover:border-slate-300 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:min-h-[38px] sm:text-xs"
                >
                  <option value="">Commerciaux</option>
                  @for (owner of store.ownerOptions(); track owner.id) {
                    <option [value]="owner.id">{{ owner.label }}</option>
                  }
                </select>

                @if (activeTab() === 'pipeline') {
                  <select
                    [value]="store.selectedStage()"
                    (change)="onStageChange($event)"
                    aria-label="Filtrer par étape"
                    class="min-h-[44px] min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-base font-medium text-slate-700 transition hover:border-slate-300 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:min-h-[38px] sm:text-xs"
                  >
                    <option value="all">Étapes</option>
                    @for (stage of stages; track stage.id) {
                      <option [value]="stage.id">{{ stage.label }}</option>
                    }
                  </select>
                }

                @if (store.searchQuery() || store.ownerFilter() || store.selectedStage() !== 'all') {
                  <button
                    type="button"
                    (click)="resetFilters()"
                    class="min-h-[44px] rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 min-[380px]:col-span-2 sm:col-span-1 sm:min-h-[38px]"
                  >
                    Effacer les filtres
                  </button>
                }

                <!-- Desktop Theme Toggle -->
                <button
                  type="button"
                  (click)="themeStore.toggle()"
                  [attr.aria-label]="themeStore.isDark() ? 'Passer en thème clair' : 'Passer en thème sombre'"
                  [title]="themeStore.isDark() ? 'Thème clair' : 'Thème sombre'"
                  class="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700 lg:inline-flex"
                >
                  @if (themeStore.isDark()) {
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                  } @else {
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>
                  }
                </button>
              </div>
            </div>
          </header>

          <!-- Main Scrollable Canvas -->
          <main class="mx-auto w-full max-w-[1600px] flex-1 space-y-5 px-3 pt-4 pb-28 sm:space-y-6 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8">
            @if (!isOnline()) {
              <div
                role="status"
                class="animate-fade-in flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-medium text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200"
              >
                <span class="h-2 w-2 shrink-0 rounded-full bg-sky-500"></span>
                <span>Mode hors ligne — vos modifications seront synchronisées automatiquement au retour du réseau.</span>
              </div>
            }
            @if (store.error(); as err) {
              <div class="animate-fade-in flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-medium text-amber-900 shadow-xs">
                <div class="flex min-w-0 items-center gap-2">
                  <svg class="h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span class="break-words">{{ err }}</span>
                </div>
                <button type="button" (click)="store.clearError()" class="shrink-0 font-semibold text-amber-800 hover:underline">
                  Fermer
                </button>
              </div>
            }

            <!-- Real-Time KPI Banner -->
            <app-kpi-banner />

            <!-- Guided Onboarding Card for First-Time Empty Workspace -->
            @if (!store.loading() && store.contacts().length === 0 && store.deals().length === 0) {
              <section class="animate-fade-in rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5 shadow-card sm:p-6">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div class="max-w-xl">
                    <span class="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                      Bienvenue sur PulseCRM
                    </span>
                    <h2 class="mt-2 font-display text-base font-bold text-slate-900 sm:text-lg">
                      Votre espace commercial est prêt ! Par où souhaitez-vous commencer ?
                    </h2>
                    <p class="mt-1 text-xs leading-relaxed text-slate-600">
                      Ajoutez votre premier client ou chargez un exemple complet (contacts, opportunités et activités) pour découvrir immédiatement le fonctionnement du pipeline.
                    </p>
                  </div>
                  <div class="flex flex-col gap-2 sm:flex-row sm:shrink-0">
                    <button
                      type="button"
                      (click)="activeTab.set('contacts')"
                      class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      Créer mon premier contact
                    </button>
                    @if (store.syncMode() === 'firestore') {
                      <button
                        type="button"
                        [disabled]="store.saving()"
                        (click)="store.seedDemoDataToFirestore()"
                        class="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
                      >
                        {{ store.saving() ? 'Chargement...' : 'Charger un exemple de démo' }}
                      </button>
                    }
                  </div>
                </div>
              </section>
            }

            <!-- Active Workspace View with Skeleton Shimmer -->
            @if (store.loading()) {
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Chargement des données">
                @for (item of [1, 2, 3]; track item) {
                  <div class="ds-card space-y-3 p-5">
                    <div class="flex items-center justify-between">
                      <div class="skeleton h-4 w-28"></div>
                      <div class="skeleton h-5 w-16"></div>
                    </div>
                    <div class="skeleton h-5 w-3/4"></div>
                    <div class="skeleton h-3 w-full"></div>
                    <div class="skeleton h-8 w-full"></div>
                  </div>
                }
              </div>
            } @else {
              <div class="animate-fade-in">
                @switch (activeTab()) {
                  @case ('pipeline') {
                    <app-pipeline-kanban />
                  }
                  @case ('contacts') {
                    <app-contacts-directory />
                  }
                }
              </div>
            }
          </main>
        </div>

        <!-- Contact Detail Slide-Over Drawer -->
        <app-contact-detail-drawer />

        <!-- Monthly Forecast Modal (lazy-deferred for faster 3G initial load) -->
        @if (showForecastModal()) {
          @defer {
            <app-forecast-modal (closed)="showForecastModal.set(false)" />
          }
        }

        <!-- Mobile Bottom Navigation Bar (44px+ touch targets + safe-area) -->
        <nav
          aria-label="Navigation rapide mobile"
          class="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#162033]/95 lg:hidden"
        >
          <button
            type="button"
            (click)="activeTab.set('pipeline')"
            [class]="activeTab() === 'pipeline'
              ? 'flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400'
              : 'flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400'"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <span>Pipeline</span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('contacts')"
            [class]="activeTab() === 'contacts'
              ? 'flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400'
              : 'flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400'"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span>Contacts</span>
          </button>

          <button
            type="button"
            (click)="openForecast()"
            class="flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span>Prévisions</span>
          </button>

          <button
            type="button"
            (click)="mobileMenuOpen.set(true)"
            class="flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span>Compte</span>
          </button>
        </nav>

        <!-- Floating Success / Welcome Toast -->
        @if (store.toast(); as toast) {
          <div
            role="status"
            aria-live="polite"
            class="animate-toast fixed bottom-20 right-4 z-50 flex max-w-sm items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl ring-1 ring-white/10 dark:bg-indigo-600 lg:bottom-5"
          >
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              [class]="toast.type === 'success' ? 'bg-emerald-400' : 'bg-sky-400'"
            ></span>
            <span>{{ toast.message }}</span>
            <button
              type="button"
              (click)="store.clearToast()"
              class="ml-2 text-slate-400 hover:text-white"
              aria-label="Fermer la notification"
            >
              ✕
            </button>
          </div>
        } @else {
          @if (authStore.infoMessage(); as welcome) {
            <div
              role="status"
              aria-live="polite"
              class="animate-fade-in fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-2.5 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-semibold text-white shadow-xl"
            >
              <span>{{ welcome }}</span>
              <button
                type="button"
                (click)="authStore.clearInfo()"
                class="ml-2 text-emerald-200 hover:text-white"
                aria-label="Fermer la notification"
              >
                ✕
              </button>
            </div>
          }
        }
      </div>
    }
  `,
})
export class AppComponent {
  readonly authStore = inject(AuthStore);
  readonly store = inject(CRM_STORE);
  readonly themeStore = inject(ThemeStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly stages = DEAL_STAGES;
  readonly activeTab = signal<ActiveTab>('pipeline');
  readonly showForecastModal = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly isOnline = signal<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  constructor() {
    if (typeof window !== 'undefined') {
      const handleOnline = () => this.isOnline.set(true);
      const handleOffline = () => this.isOnline.set(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      });
    }
  }

  selectTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    this.mobileMenuOpen.set(false);
  }

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
    this.mobileMenuOpen.set(false);
    this.showForecastModal.set(true);
    await this.store.requestMonthlyForecast();
  }

  async seedDemoData(): Promise<void> {
    this.mobileMenuOpen.set(false);
    await this.store.seedDemoDataToFirestore();
  }

  async signOut(): Promise<void> {
    this.mobileMenuOpen.set(false);
    await this.authStore.signOut();
  }
}
