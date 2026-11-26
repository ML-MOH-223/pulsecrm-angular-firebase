import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DEAL_STAGES, DealStage } from '../../core/models/crm.model';
import { CRM_STORE } from '../../core/state/crm.store';

@Component({
  selector: 'app-deal-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closed.emit()',
  },
  template: `
    <div
      class="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 px-3 pt-4 pb-4 backdrop-blur-sm sm:items-center sm:p-4"
      (click)="closed.emit()"
    >
      <div
        class="animate-fade-in flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-modal ring-1 ring-slate-900/10 dark:bg-[#162033] dark:ring-slate-700"
        (click)="$event.stopPropagation()"
      >
        <header class="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 sm:px-5">
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </span>
            <h2 class="truncate font-display text-sm font-bold text-slate-900 dark:text-white sm:text-base">
              Nouvelle opportunité
            </h2>
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

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex min-h-0 flex-1 flex-col">
          <div class="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Titre du deal *</label>
                <input
                  type="text"
                  formControlName="title"
                  placeholder="Ex: Licence Enterprise 50 utilisateurs"
                  class="ds-input"
                />
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Entreprise *</label>
                <input
                  type="text"
                  formControlName="company"
                  placeholder="Ex: NovaTech SAS"
                  class="ds-input"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Contact associé</label>
                <select
                  formControlName="contactId"
                  (change)="onContactChange()"
                  class="ds-input"
                >
                  <option value="">— Sélectionner un contact —</option>
                  @for (contact of store.contacts(); track contact.id) {
                    <option [value]="contact.id">
                      {{ contact.firstName }} {{ contact.lastName }} ({{ contact.company }})
                    </option>
                  }
                </select>
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Date de closing estimée</label>
                <input
                  type="date"
                  formControlName="expectedCloseDate"
                  class="ds-input"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Montant (€) *</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  formControlName="amount"
                  class="ds-input tabular-nums"
                />
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Étape</label>
                <select
                  formControlName="stage"
                  (change)="onStageChange()"
                  class="ds-input"
                >
                  @for (stage of stages; track stage.id) {
                    <option [value]="stage.id">{{ stage.label }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Probabilité (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  formControlName="probability"
                  class="ds-input tabular-nums"
                />
              </div>
            </div>
          </div>

          <footer class="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5 sm:px-5">
            <button
              type="button"
              (click)="closed.emit()"
              class="ds-btn ds-btn-secondary w-full sm:w-auto"
            >
              Annuler
            </button>
            <button
              type="submit"
              [disabled]="store.saving()"
              class="ds-btn ds-btn-primary w-full sm:w-auto"
            >
              {{ store.saving() ? 'Enregistrement...' : 'Créer l’opportunité' }}
            </button>
          </footer>
          @if (form.touched && form.invalid) {
            <p class="bg-rose-50 px-5 py-2 text-xs font-medium text-rose-700">
              Veuillez renseigner au minimum un titre, une entreprise et un montant valide.
            </p>
          }
        </form>
      </div>
    </div>
  `,
})
export class DealFormModalComponent {
  readonly store = inject(CRM_STORE);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly closed = output<void>();

  readonly stages = DEAL_STAGES;

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    contactId: [''],
    company: ['', [Validators.required]],
    amount: [15000, [Validators.required, Validators.min(0)]],
    stage: ['prospection' as DealStage],
    probability: [15, [Validators.required, Validators.min(0), Validators.max(100)]],
    expectedCloseDate: [new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)],
  });

  onContactChange(): void {
    const contactId = this.form.controls.contactId.value;
    const contact = this.store.contacts().find((c) => c.id === contactId);
    if (contact) {
      this.form.controls.company.setValue(contact.company);
    }
  }

  onStageChange(): void {
    const stageId = this.form.controls.stage.value;
    const stageMeta = DEAL_STAGES.find((s) => s.id === stageId);
    if (stageMeta) {
      this.form.controls.probability.setValue(stageMeta.defaultProbability);
    }
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    await this.store.addDeal({
      title: raw.title.trim(),
      contactId: raw.contactId,
      company: raw.company.trim(),
      amount: Number(raw.amount),
      probability: Number(raw.probability),
      stage: raw.stage,
      expectedCloseDate: raw.expectedCloseDate,
    });
    this.closed.emit();
  }
}
