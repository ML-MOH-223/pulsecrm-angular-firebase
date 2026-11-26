import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CRM_STORE } from '../../core/state/crm.store';

@Component({
  selector: 'app-kpi-banner',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(1, minmax(0, 1fr));
        gap: 0.75rem;
      }
      @media (min-width: 640px) {
        .kpi-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
      }
      @media (min-width: 1280px) {
        .kpi-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
    `,
  ],
  template: `
    @let m = store.pipelineMetrics();
    <section aria-label="Indicateurs clés du pipeline" class="kpi-grid">
      <!-- Pipeline Total -->
      <article class="ds-card ds-card-interactive animate-fade-in group relative overflow-hidden p-4 sm:p-5">
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pipeline total
          </span>
          <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30 sm:h-9 sm:w-9">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </span>
        </div>
        <p class="kpi-value mt-2.5 font-display font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums sm:mt-3">
          {{ m.totalPipelineAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:mt-2.5">
          <span class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 tabular-nums">
            {{ m.openDealsCount }} actif{{ m.openDealsCount > 1 ? 's' : '' }}
          </span>
          <span>opportunité{{ m.openDealsCount > 1 ? 's' : '' }} ouverte{{ m.openDealsCount > 1 ? 's' : '' }}</span>
        </div>
      </article>

      <!-- Revenu Pondéré -->
      <article class="ds-card ds-card-interactive animate-fade-in group relative overflow-hidden p-4 sm:p-5">
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-400"></div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Revenu pondéré
          </span>
          <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30 sm:h-9 sm:w-9">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </span>
        </div>
        <p class="kpi-value mt-2.5 font-display font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums sm:mt-3">
          {{ m.weightedRevenue | currency:'EUR':'symbol':'1.0-0':'fr' }}
        </p>
        <div class="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 sm:mt-2.5">
          <span class="truncate">Panier moyen : <strong class="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{{ m.averageDealValue | currency:'EUR':'symbol':'1.0-0':'fr' }}</strong></span>
          <span class="shrink-0 rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 tabular-nums">
            {{ weightedRatio() }}%
          </span>
        </div>
      </article>

      <!-- Taux de Closing -->
      <article class="ds-card ds-card-interactive animate-fade-in group relative overflow-hidden p-4 sm:p-5">
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Taux de closing
          </span>
          <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30 sm:h-9 sm:w-9">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <div class="mt-2.5 flex items-baseline gap-2 sm:mt-3">
          <p class="kpi-value font-display font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {{ m.conversionRate | number:'1.0-1':'fr' }} %
          </p>
          <span class="text-xs text-slate-400 tabular-nums">
            ({{ m.wonDealsCount }}G / {{ m.lostDealsCount }}P)
          </span>
        </div>
        <div class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:mt-3">
          <div
            class="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-500"
            [style.width.%]="m.conversionRate"
          ></div>
        </div>
      </article>

      <!-- Deals Gagnés ce Mois -->
      <article class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-4 text-white shadow-lg shadow-emerald-600/20 transition duration-200 hover:-translate-y-0.5 sm:p-5">
        <div class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-emerald-100">
            Gagnés ce mois
          </span>
          <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20 sm:h-9 sm:w-9">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
            </svg>
          </span>
        </div>
        <p class="kpi-value mt-2.5 font-display font-extrabold tracking-tight text-white tabular-nums sm:mt-3">
          {{ m.wonThisMonthAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-emerald-100 sm:mt-2.5">
          <span class="inline-flex items-center rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
            {{ m.wonThisMonthCount }} deal{{ m.wonThisMonthCount > 1 ? 's' : '' }}
          </span>
          <span>signé{{ m.wonThisMonthCount > 1 ? 's' : '' }} sur la période</span>
        </div>
      </article>
    </section>
  `,
})
export class KpiBannerComponent {
  readonly store = inject(CRM_STORE);

  readonly weightedRatio = computed(() => {
    const { totalPipelineAmount, weightedRevenue } = this.store.pipelineMetrics();
    if (totalPipelineAmount <= 0) return 0;
    return Math.round((weightedRevenue / totalPipelineAmount) * 100);
  });
}
