import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CRM_STORE } from '../../core/state/crm.store';

@Component({
  selector: 'app-forecast-modal',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closed.emit()',
  },
  template: `
    <div
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-3 pt-4 pb-6 backdrop-blur-sm sm:px-4 sm:pt-10"
      (click)="closed.emit()"
    >
      <div
        class="animate-fade-in flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-modal ring-1 ring-slate-900/10 dark:bg-[#162033] dark:ring-slate-700"
        (click)="$event.stopPropagation()"
      >
        <header class="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/60 sm:px-6 sm:py-4">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </span>
            <div class="min-w-0">
              <h2 class="truncate font-display text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                Prévisions Mensuelles
              </h2>
              <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                Synthèse pondérée de votre chiffre d’affaires par commercial
              </p>
            </div>
          </div>
          <button
            type="button"
            (click)="closed.emit()"
            class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 sm:h-9 sm:w-9"
            aria-label="Fermer"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="kanban-scroll flex-1 overflow-y-auto p-4 sm:p-6">
          @if (store.forecastLoading()) {
            <div class="flex flex-col items-center justify-center py-12 text-sm text-slate-500">
              <span class="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></span>
              Agrégation des prévisions commerciales...
            </div>
          } @else {
            @if (store.forecastReport(); as report) {
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div class="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pipeline ouvert</p>
                  <p class="mt-1 font-display text-xl font-extrabold text-slate-900 tabular-nums">
                    {{ report.totalPipelineAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                  </p>
                </div>
                <div class="rounded-xl border border-indigo-200/70 bg-indigo-50/70 p-4">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">Prévision pondérée</p>
                  <p class="mt-1 font-display text-xl font-extrabold text-indigo-950 tabular-nums">
                    {{ report.totalWeightedForecast | currency:'EUR':'symbol':'1.0-0':'fr' }}
                  </p>
                </div>
                <div class="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-4">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Déjà gagné</p>
                  <p class="mt-1 font-display text-xl font-extrabold text-emerald-950 tabular-nums">
                    {{ report.totalWonAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                  </p>
                </div>
              </div>

              <!-- Mobile Card List by Rep (< md / zero horizontal overflow) -->
              <div class="mt-4 space-y-2.5 md:hidden">
                @for (rep of report.byRep; track rep.ownerId) {
                  @let share = report.totalWeightedForecast > 0 ? (rep.weightedForecast / report.totalWeightedForecast) * 100 : 0;
                  <div class="rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900/50">
                    <div class="flex items-center justify-between gap-2">
                      <p class="truncate text-sm font-bold text-slate-900 dark:text-white">{{ rep.ownerName }}</p>
                      <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 tabular-nums">
                        {{ rep.openDealsCount }} deal{{ rep.openDealsCount > 1 ? 's' : '' }}
                      </span>
                    </div>
                    <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div class="h-full rounded-full bg-indigo-500" [style.width.%]="share"></div>
                    </div>
                    <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span class="block text-[10px] text-slate-400">Pipeline</span>
                        <span class="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                          {{ rep.pipelineAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[10px] text-slate-400">Pondéré</span>
                        <span class="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {{ rep.weightedForecast | currency:'EUR':'symbol':'1.0-0':'fr' }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[10px] text-slate-400">Gagné</span>
                        <span class="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {{ rep.wonAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                        </span>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <p class="py-6 text-center text-xs text-slate-500">Aucune donnée commerciale disponible.</p>
                }
              </div>

              <!-- Desktop Table (>= md) -->
              <div class="mt-5 hidden overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700 md:block">
                <div class="kanban-scroll overflow-x-auto">
                  <table class="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  <thead class="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th class="px-4 py-3">Commercial</th>
                      <th class="px-4 py-3 text-right">Deals</th>
                      <th class="px-4 py-3 text-right">Pipeline</th>
                      <th class="px-4 py-3 text-right">Pondéré</th>
                      <th class="px-4 py-3 text-right">Gagné</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    @for (rep of report.byRep; track rep.ownerId) {
                      @let share = report.totalWeightedForecast > 0 ? (rep.weightedForecast / report.totalWeightedForecast) * 100 : 0;
                      <tr class="hover:bg-slate-50/60">
                        <td class="px-4 py-3">
                          <p class="font-semibold text-slate-900">{{ rep.ownerName }}</p>
                          <div class="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                            <div
                              class="h-full rounded-full bg-indigo-500"
                              [style.width.%]="share"
                            ></div>
                          </div>
                        </td>
                        <td class="px-4 py-3 text-right tabular-nums text-slate-600">{{ rep.openDealsCount }}</td>
                        <td class="px-4 py-3 text-right tabular-nums text-slate-700">
                          {{ rep.pipelineAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                        </td>
                        <td class="px-4 py-3 text-right font-bold tabular-nums text-indigo-700">
                          {{ rep.weightedForecast | currency:'EUR':'symbol':'1.0-0':'fr' }}
                        </td>
                        <td class="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">
                          {{ rep.wonAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="px-4 py-8 text-center text-slate-500">
                          Aucune donnée commerciale disponible.
                        </td>
                      </tr>
                    }
                  </tbody>
                  </table>
                </div>
              </div>

              <p class="mt-3 text-right text-[11px] text-slate-400">
                Période {{ report.month }} · Généré le {{ report.generatedAt | date:'dd/MM/yyyy à HH:mm':'':'fr' }}
              </p>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class ForecastModalComponent {
  readonly store = inject(CRM_STORE);
  readonly closed = output<void>();
}
