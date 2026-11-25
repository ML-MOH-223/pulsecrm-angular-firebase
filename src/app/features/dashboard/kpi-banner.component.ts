import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CRM_STORE } from '../../core/state/crm.store';

@Component({
  selector: 'app-kpi-banner',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let m = store.pipelineMetrics();
    <section
      aria-label="Indicateurs clés du pipeline"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <!-- Pipeline Total -->
      <article class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pipeline total
          </span>
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </span>
        </div>
        <p class="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {{ m.totalPipelineAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
        </p>
        <p class="mt-1 text-xs text-slate-500">
          {{ m.openDealsCount }} opportunité{{ m.openDealsCount > 1 ? 's' : '' }} en cours
        </p>
      </article>

      <!-- Revenu Pondéré -->
      <article class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Revenu pondéré
          </span>
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </span>
        </div>
        <p class="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {{ m.weightedRevenue | currency:'EUR':'symbol':'1.0-0':'fr' }}
        </p>
        <p class="mt-1 text-xs text-slate-500">
          Panier moyen : {{ m.averageDealValue | currency:'EUR':'symbol':'1.0-0':'fr' }}
        </p>
      </article>

      <!-- Taux de Closing -->
      <article class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Taux de closing
          </span>
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <p class="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {{ m.conversionRate | number:'1.0-1':'fr' }} %
        </p>
        <p class="mt-1 text-xs text-slate-500">
          {{ m.wonDealsCount }} gagné{{ m.wonDealsCount > 1 ? 's' : '' }} · {{ m.lostDealsCount }} perdu{{ m.lostDealsCount > 1 ? 's' : '' }}
        </p>
      </article>

      <!-- Deals Gagnés ce Mois -->
      <article class="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm transition hover:border-emerald-300">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Gagnés ce mois
          </span>
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
            </svg>
          </span>
        </div>
        <p class="mt-3 text-2xl font-bold tracking-tight text-emerald-950 tabular-nums">
          {{ m.wonThisMonthAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
        </p>
        <p class="mt-1 text-xs font-medium text-emerald-700">
          {{ m.wonThisMonthCount }} deal{{ m.wonThisMonthCount > 1 ? 's' : '' }} signé{{ m.wonThisMonthCount > 1 ? 's' : '' }}
        </p>
      </article>
    </section>
  `,
})
export class KpiBannerComponent {
  readonly store = inject(CRM_STORE);
}
