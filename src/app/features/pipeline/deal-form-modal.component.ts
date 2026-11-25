import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DEAL_STAGES, DealStage } from '../../core/models/crm.model';
import { CRM_STORE } from '../../core/state/crm.store';

@Component({
  selector: 'app-deal-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      (click)="closed.emit()"
    >
      <div
        class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <header class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 class="text-base font-semibold text-slate-900">Nouvelle opportunité</h2>
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

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4 p-6">
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-700">Titre du deal *</label>
            <input
              type="text"
              formControlName="title"
              placeholder="Ex: Licence Enterprise 50 utilisateurs"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-700">Contact associé</label>
              <select
                formControlName="contactId"
                (change)="onContactChange()"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              <label class="mb-1 block text-xs font-semibold text-slate-700">Entreprise *</label>
              <input
                type="text"
                formControlName="company"
                placeholder="Ex: NovaTech SAS"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-700">Montant (€) *</label>
              <input
                type="number"
                min="0"
                step="500"
                formControlName="amount"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-700">Étape</label>
              <select
                formControlName="stage"
                (change)="onStageChange()"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                @for (stage of stages; track stage.id) {
                  <option [value]="stage.id">{{ stage.label }}</option>
                }
              </select>
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-700">Probabilité (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                formControlName="probability"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-700">Date de closing estimée</label>
            <input
              type="date"
              formControlName="expectedCloseDate"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <footer class="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              (click)="closed.emit()"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              [disabled]="form.invalid"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Créer l’opportunité
            </button>
          </footer>
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
