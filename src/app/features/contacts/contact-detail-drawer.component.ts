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

@Component({
  selector: 'app-contact-detail-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.selectedContact(); as contact) {
      @let score = store.leadScores().get(contact.id) ?? 0;
      <div
        class="fixed inset-0 z-40 flex justify-end bg-slate-900/30 backdrop-blur-[1px]"
        (click)="store.selectContact(null)"
      >
        <aside
          class="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <!-- Drawer Header -->
          <header class="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div class="flex items-center gap-3.5">
              <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm">
                {{ contact.firstName.charAt(0) }}{{ contact.lastName.charAt(0) }}
              </span>
              <div>
                <h2 class="text-lg font-bold text-slate-900">
                  {{ contact.firstName }} {{ contact.lastName }}
                </h2>
                <p class="text-xs font-medium text-slate-500">
                  {{ contact.company }} · {{ contact.email }}
                </p>
              </div>
            </div>
            <button
              type="button"
              (click)="store.selectContact(null)"
              class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Fermer la fiche"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <!-- Drawer Body -->
          <div class="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <!-- Status & Lead Score -->
            <div class="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Statut client
                </label>
                <select
                  [value]="contact.status"
                  (change)="onStatusChange(contact.id, $event)"
                  class="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="lead">Lead</option>
                  <option value="qualified">Qualifié</option>
                  <option value="customer">Client</option>
                  <option value="churned">Perdu</option>
                </select>
              </div>

              <div>
                <span class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Score d’engagement
                </span>
                <div class="mt-2 flex items-center gap-2.5">
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      class="h-full rounded-full"
                      [style.width.%]="score"
                      [class]="score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-indigo-500' : 'bg-amber-400'"
                    ></div>
                  </div>
                  <span class="text-sm font-bold tabular-nums text-slate-900">{{ score }}/100</span>
                </div>
              </div>
            </div>

            <!-- Associated Deals -->
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Opportunités associées ({{ store.selectedContactDeals().length }})
              </h3>
              <div class="mt-2.5 space-y-2">
                @for (deal of store.selectedContactDeals(); track deal.id) {
                  <div class="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-slate-900">{{ deal.title }}</p>
                      <p class="text-xs text-slate-500">
                        {{ getStageLabel(deal.stage) }} · {{ deal.probability }}%
                      </p>
                    </div>
                    <span class="ml-3 shrink-0 text-sm font-bold tabular-nums text-slate-900">
                      {{ deal.amount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                    </span>
                  </div>
                } @empty {
                  <p class="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
                    Aucune opportunité liée à ce contact.
                  </p>
                }
              </div>
            </section>

            <!-- Log New Activity Form -->
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ajouter au journal d’activités
              </h3>
              <form
                [formGroup]="activityForm"
                (ngSubmit)="submitActivity(contact.id)"
                class="mt-2.5 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5"
              >
                <div class="grid grid-cols-2 gap-2.5">
                  <select
                    formControlName="type"
                    class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="appel">Appel</option>
                    <option value="email">Email</option>
                    <option value="reunion">Réunion</option>
                    <option value="note">Note interne</option>
                  </select>

                  <select
                    formControlName="dealId"
                    class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
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
                  placeholder="Compte-rendu d’appel, prochaine étape, note..."
                  class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                ></textarea>

                <div class="flex justify-end">
                  <button
                    type="submit"
                    [disabled]="activityForm.invalid"
                    class="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Enregistrer l’activité
                  </button>
                </div>
              </form>
            </section>

            <!-- Activity Timeline -->
            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Historique ({{ store.selectedContactActivities().length }})
              </h3>
              <ol class="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
                @for (act of store.selectedContactActivities(); track act.id) {
                  <li class="relative">
                    <span class="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white"></span>
                    <div class="rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs">
                      <div class="flex items-center justify-between gap-2 text-[11px]">
                        <span class="font-semibold uppercase tracking-wide text-indigo-700">
                          {{ activityLabels[act.type] }}
                        </span>
                        <span class="text-slate-400 tabular-nums">
                          {{ act.createdAt | date:'dd MMM yyyy · HH:mm':'':'fr' }}
                        </span>
                      </div>
                      <p class="mt-1.5 text-sm text-slate-700">{{ act.summary }}</p>
                      <p class="mt-1 text-[11px] font-medium text-slate-400">
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

  readonly activityForm = this.fb.group({
    type: ['appel' as ActivityType],
    dealId: [''],
    summary: ['', [Validators.required, Validators.minLength(3)]],
  });

  getStageLabel(stage: string): string {
    return DEAL_STAGES.find((s) => s.id === stage)?.label ?? stage;
  }

  onStatusChange(contactId: string, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as ContactStatus;
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
