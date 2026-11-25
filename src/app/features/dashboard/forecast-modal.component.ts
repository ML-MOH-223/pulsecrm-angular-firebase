import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CRM_STORE } from '../../core/state/crm.store';

@Component({
  selector: 'app-forecast-modal',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      (click)="closed.emit()"
    >
      <div
        class="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <header class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">
              Prévisions Mensuelles par Commercial
            </h2>
            <p class="text-xs text-slate-500">
              Agrégation Cloud Function <code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">calculateMonthlyForecast</code>
            </p>
          </div>
          <button
            type="button"
            (click)="closed.emit()"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fermer"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="p-6">
          @if (store.forecastLoading()) {
            <div class="flex items-center justify-center py-12 text-sm text-slate-500">
              <span class="mr-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></span>
              Calcul des prévisions en cours...
            </div>
          } @else {
            @if (store.forecastReport(); as report) {
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-xl bg-slate-50 p-3.5">
                <p class="text-xs font-medium text-slate-500">Pipeline ouvert</p>
                <p class="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                  {{ report.totalPipelineAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                </p>
              </div>
              <div class="rounded-xl bg-indigo-50/70 p-3.5">
                <p class="text-xs font-medium text-indigo-700">Prévision pondérée</p>
                <p class="mt-1 text-lg font-bold text-indigo-950 tabular-nums">
                  {{ report.totalWeightedForecast | currency:'EUR':'symbol':'1.0-0':'fr' }}
                </p>
              </div>
              <div class="rounded-xl bg-emerald-50/70 p-3.5">
                <p class="text-xs font-medium text-emerald-700">Déjà gagné</p>
                <p class="mt-1 text-lg font-bold text-emerald-950 tabular-nums">
                  {{ report.totalWonAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                </p>
              </div>
            </div>

            <div class="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Commercial</th>
                    <th class="px-4 py-3 text-right">Deals ouverts</th>
                    <th class="px-4 py-3 text-right">Pipeline</th>
                    <th class="px-4 py-3 text-right">Pondéré</th>
                    <th class="px-4 py-3 text-right">Gagné</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (rep of report.byRep; track rep.ownerId) {
                    <tr class="hover:bg-slate-50/60">
                      <td class="px-4 py-3 font-medium text-slate-900">{{ rep.ownerName }}</td>
                      <td class="px-4 py-3 text-right tabular-nums text-slate-600">{{ rep.openDealsCount }}</td>
                      <td class="px-4 py-3 text-right tabular-nums text-slate-700">
                        {{ rep.pipelineAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                      </td>
                      <td class="px-4 py-3 text-right font-semibold tabular-nums text-indigo-700">
                        {{ rep.weightedForecast | currency:'EUR':'symbol':'1.0-0':'fr' }}
                      </td>
                      <td class="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
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
