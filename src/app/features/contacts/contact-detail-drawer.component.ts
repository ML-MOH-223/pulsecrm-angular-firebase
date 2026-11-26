import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ACTIVITY_TYPE_LABELS,
  ActivityType,
  ContactStatus,
  DEAL_STAGES,
} from '../../core/models/crm.model';
import { CRM_STORE } from '../../core/state/crm.store';

const STATUS_OPTIONS: readonly { id: ContactStatus; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualifié' },
  { id: 'customer', label: 'Client' },
  { id: 'churned', label: 'Perdu' },
];

@Component({
  selector: 'app-contact-detail-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'store.selectContact(null)',
  },
  template: `
    @if (store.selectedContact(); as contact) {
      @let score = store.leadScores().get(contact.id) ?? 0;
      <div
        class="fixed inset-0 z-40 flex justify-end bg-slate-950/40 backdrop-blur-xs"
        (click)="store.selectContact(null)"
      >
        <aside
          class="flex h-[100dvh] w-full max-w-xl flex-col bg-white shadow-modal dark:bg-[#162033]"
          (click)="$event.stopPropagation()"
        >
          <!-- Hero Header -->
          <header class="relative shrink-0 overflow-hidden bg-slate-950 px-4 py-5 text-white sm:px-6 sm:py-6">
            <div class="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-2xl"></div>
            <div class="relative flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3 sm:gap-4">
                <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-display text-sm font-bold text-white shadow-lg shadow-indigo-500/30 sm:h-12 sm:w-12 sm:text-base">
                  {{ contact.firstName.charAt(0) }}{{ contact.lastName.charAt(0) }}
                </span>
                <div class="min-w-0">
                  <h2 class="truncate font-display text-base font-bold tracking-tight text-white sm:text-lg">
                    {{ contact.firstName }} {{ contact.lastName }}
                  </h2>
                  <p class="truncate text-xs font-medium text-indigo-300">{{ contact.company }}</p>
                  <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
                    <span class="max-w-full truncate rounded-md bg-white/10 px-2 py-0.5">{{ contact.email }}</span>
                    @if (contact.phone) {
                      <span class="rounded-md bg-white/10 px-2 py-0.5 tabular-nums">{{ contact.phone }}</span>
                    }
                  </div>
                </div>
              </div>

              <button
                type="button"
                (click)="store.selectContact(null)"
                class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white sm:h-9 sm:w-9"
                aria-label="Fermer la fiche"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <!-- Drawer Body -->
          <div class="kanban-scroll pb-safe flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:space-y-6 sm:px-6 sm:py-5">
            <!-- Segmented Status + Lead Score Card -->
            <div class="space-y-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 sm:p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Statut du cycle client
                </span>
                <span
                  class="rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums"
                  [class]="score >= 70 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' : score >= 40 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'"
                >
                  Lead Score : {{ score }}/100
                </span>
              </div>

              <div class="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800 sm:grid-cols-4">
                @for (opt of statusOptions; track opt.id) {
                  <button
                    type="button"
                    (click)="setStatus(contact.id, opt.id)"
                    [class]="contact.status === opt.id
                      ? 'rounded-lg bg-white py-2 text-xs font-bold text-slate-900 shadow-xs transition dark:bg-indigo-600 dark:text-white sm:py-1.5'
                      : 'rounded-lg py-2 text-xs font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:py-1.5'"
                  >
                    {{ opt.label }}
                  </button>
                }
              </div>

              <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  [style.width.%]="score"
                  [class]="score >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : score >= 40 ? 'bg-gradient-to-r from-indigo-400 to-indigo-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'"
                ></div>
              </div>
            </div>

            <!-- Associated Deals -->
            <section>
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Opportunités associées ({{ store.selectedContactDeals().length }})
                </h3>
              </div>
              <div class="mt-2.5 space-y-2">
                @for (deal of store.selectedContactDeals(); track deal.id) {
                  <div class="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-slate-900">{{ deal.title }}</p>
                      <p class="mt-0.5 text-xs text-slate-500">
                        {{ getStageLabel(deal.stage) }} · <span class="tabular-nums">{{ deal.probability }}%</span>
                      </p>
                    </div>
                    <span class="ml-3 shrink-0 font-display text-sm font-extrabold tabular-nums text-slate-900">
                      {{ deal.amount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                    </span>
                  </div>
                } @empty {
                  <p class="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400">
                    Aucune opportunité liée à ce contact.
                  </p>
                }
              </div>
            </section>

            <!-- Log New Activity Form -->
            <section>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nouvelle activité
              </h3>
              <form
                [formGroup]="activityForm"
                (ngSubmit)="submitActivity(contact.id)"
                class="mt-2.5 space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4"
              >
                <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <select
                    formControlName="type"
                    class="ds-input"
                  >
                    <option value="appel">Appel</option>
                    <option value="email">Email</option>
                    <option value="reunion">Réunion</option>
                    <option value="note">Note interne</option>
                  </select>

                  <select
                    formControlName="dealId"
                    class="ds-input"
                  >
                    <option value="">Aucune opportunité</option>
                    @for (deal of store.selectedContactDeals(); track deal.id) {
                      <option [value]="deal.id">{{ deal.title }}</option>
                    }
                  </select>
                </div>

                <textarea
                  rows="2"
                  formControlName="summary"
                  placeholder="Compte-rendu d’appel, prochaine étape, décision clé..."
                  class="ds-input"
                ></textarea>

                <div class="flex justify-end">
                  <button
                    type="submit"
                    [disabled]="activityForm.invalid || store.saving()"
                    class="ds-btn ds-btn-primary w-full sm:w-auto"
                  >
                    {{ store.saving() ? 'Enregistrement...' : 'Enregistrer l’activité' }}
                  </button>
                </div>
              </form>
            </section>

            <!-- Activity Timeline -->
            <section>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">
                Journal d’activités ({{ store.selectedContactActivities().length }})
              </h3>
              <ol class="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
                @for (act of store.selectedContactActivities(); track act.id) {
                  <li class="relative">
                    <span
                      class="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full ring-4 ring-white"
                      [class]="getActivityDotClass(act.type)"
                    ></span>
                    <div class="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                      <div class="flex items-center justify-between gap-2 text-[11px]">
                        <span
                          class="rounded-md px-2 py-0.5 font-bold uppercase tracking-wide"
                          [class]="getActivityBadgeClass(act.type)"
                        >
                          {{ activityLabels[act.type] }}
                        </span>
                        <span class="text-slate-400 tabular-nums">
                          {{ act.createdAt | date:'dd MMM yyyy · HH:mm':'':'fr' }}
                        </span>
                      </div>
                      <p class="mt-2 text-sm leading-relaxed text-slate-700">{{ act.summary }}</p>
                      <p class="mt-1.5 text-[11px] font-medium text-slate-400">
                        Par {{ act.authorName }}
                      </p>
                    </div>
                  </li>
                } @empty {
                  <li class="text-xs text-slate-400">Aucune activité enregistrée.</li>
                }
              </ol>
            </section>
          </div>
        </aside>
      </div>
    }
  `,
})
export class ContactDetailDrawerComponent {
  readonly store = inject(CRM_STORE);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly activityLabels = ACTIVITY_TYPE_LABELS;
  readonly statusOptions = STATUS_OPTIONS;

  readonly activityForm = this.fb.group({
    type: ['appel' as ActivityType],
    dealId: [''],
    summary: ['', [Validators.required, Validators.minLength(3)]],
  });

  getStageLabel(stage: string): string {
    return DEAL_STAGES.find((s) => s.id === stage)?.label ?? stage;
  }

  getActivityDotClass(type: ActivityType): string {
    switch (type) {
      case 'reunion':
        return 'bg-violet-500';
      case 'appel':
        return 'bg-sky-500';
      case 'email':
        return 'bg-indigo-500';
      default:
        return 'bg-emerald-500';
    }
  }

  getActivityBadgeClass(type: ActivityType): string {
    switch (type) {
      case 'reunion':
        return 'bg-violet-50 text-violet-700';
      case 'appel':
        return 'bg-sky-50 text-sky-700';
      case 'email':
        return 'bg-indigo-50 text-indigo-700';
      default:
        return 'bg-emerald-50 text-emerald-700';
    }
  }

  setStatus(contactId: string, status: ContactStatus): void {
    void this.store.updateContact(contactId, { status });
  }

  async submitActivity(contactId: string): Promise<void> {
    if (this.activityForm.invalid) return;
    const raw = this.activityForm.getRawValue();
    await this.store.addActivity({
      contactId,
      dealId: raw.dealId || null,
      type: raw.type,
      summary: raw.summary.trim(),
      authorName: '',
    });
    this.activityForm.reset({ type: 'appel', dealId: '', summary: '' });
  }
}
