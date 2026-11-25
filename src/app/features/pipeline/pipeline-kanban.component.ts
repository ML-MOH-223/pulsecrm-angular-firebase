import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DEAL_STAGES, Deal, DealStage } from '../../core/models/crm.model';
import { CRM_STORE } from '../../core/state/crm.store';
import { DealFormModalComponent } from './deal-form-modal.component';

@Component({
  selector: 'app-pipeline-kanban',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DealFormModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-slate-900">Pipeline Commercial</h2>
          <p class="text-xs text-slate-500">
            Glissez-déposez une carte ou utilisez le sélecteur d’étape pour mettre à jour le pipeline en temps réel.
          </p>
        </div>

        <button
          type="button"
          (click)="showCreateModal.set(true)"
          class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouvelle opportunité
        </button>
      </div>

      <!-- Kanban Columns -->
      <div class="kanban-scroll flex gap-4 overflow-x-auto pb-4">
        @for (col of store.kanbanColumns(); track col.stage.id) {
          <section
            class="flex w-80 shrink-0 flex-col rounded-xl border border-slate-200/90 border-t-4 bg-slate-100/70 transition"
            [class]="col.stage.accentClass + (dragOverStage() === col.stage.id ? ' ring-2 ring-indigo-500 bg-indigo-50/40' : '')"
            (dragover)="onDragOver($event, col.stage.id)"
            (dragleave)="onDragLeave(col.stage.id)"
            (drop)="onDrop($event, col.stage.id)"
          >
            <!-- Column Header -->
            <header class="border-b border-slate-200/80 bg-white/80 px-3.5 py-3 rounded-t-lg">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-semibold text-slate-800">{{ col.stage.label }}</h3>
                  <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200/80 px-1.5 text-[11px] font-semibold text-slate-700">
                    {{ col.deals.length }}
                  </span>
                </div>
                <span class="text-sm font-bold text-slate-900 tabular-nums">
                  {{ col.totalAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                </span>
              </div>
              @if (col.stage.id !== 'gagne' && col.stage.id !== 'perdu') {
                <p class="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                  Pondéré : {{ col.weightedAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                </p>
              }
            </header>

            <!-- Cards -->
            <div class="kanban-scroll flex flex-1 flex-col gap-2.5 overflow-y-auto p-2.5 max-h-[62vh]">
              @for (deal of col.deals; track deal.id) {
                <article
                  draggable="true"
                  (dragstart)="onDragStart($event, deal.id)"
                  (dragend)="onDragEnd()"
                  class="group cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-indigo-300 hover:shadow-md active:cursor-grabbing"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-xs font-medium text-indigo-600">{{ deal.company }}</p>
                      <h4 class="mt-0.5 text-sm font-semibold leading-snug text-slate-900">
                        {{ deal.title }}
                      </h4>
                    </div>
                    <button
                      type="button"
                      (click)="store.deleteDeal(deal.id)"
                      class="rounded p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                      title="Supprimer l’opportunité"
                      aria-label="Supprimer l’opportunité"
                    >
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  <div class="mt-3 flex items-baseline justify-between">
                    <span class="text-base font-bold text-slate-900 tabular-nums">
                      {{ deal.amount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                    </span>
                    <span
                      class="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                      [class]="col.stage.badgeClass"
                    >
                      {{ deal.probability }}%
                    </span>
                  </div>

                  <div class="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    @if (deal.contactId) {
                      <button
                        type="button"
                        (click)="store.selectContact(deal.contactId)"
                        class="inline-flex items-center gap-1 truncate font-medium text-slate-600 hover:text-indigo-600"
                      >
                        <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <span class="truncate">{{ getContactName(deal) }}</span>
                      </button>
                    } @else {
                      <span>Sans contact</span>
                    }

                    @if (deal.expectedCloseDate) {
                      <span class="shrink-0 tabular-nums">
                        {{ deal.expectedCloseDate | date:'dd MMM':'':'fr' }}
                      </span>
                    }
                  </div>

                  <!-- Quick Stage Switcher -->
                  <div class="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                    <select
                      [value]="deal.stage"
                      (change)="onStageSelect(deal.id, $event)"
                      aria-label="Changer d’étape"
                      class="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    >
                      @for (s of stages; track s.id) {
                        <option [value]="s.id">{{ s.label }}</option>
                      }
                    </select>

                    @if (getNextStage(deal.stage); as nextStage) {
                      <button
                        type="button"
                        (click)="store.moveDealStage(deal.id, nextStage)"
                        class="inline-flex items-center rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-indigo-600"
                        [title]="'Passer à ' + getStageLabel(nextStage)"
                      >
                        →
                      </button>
                    }
                  </div>
                </article>
              } @empty {
                <div class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300/80 py-10 text-xs text-slate-400">
                  Aucune opportunité
                </div>
              }
            </div>
          </section>
        }
      </div>
    </div>

    @if (showCreateModal()) {
      <app-deal-form-modal (closed)="showCreateModal.set(false)" />
    }
  `,
})
export class PipelineKanbanComponent {
  readonly store = inject(CRM_STORE);
  readonly stages = DEAL_STAGES;

  readonly showCreateModal = signal(false);
  readonly draggedDealId = signal<string | null>(null);
  readonly dragOverStage = signal<DealStage | null>(null);

  getContactName(deal: Deal): string {
    const contact = this.store.contacts().find((c) => c.id === deal.contactId);
    return contact ? `${contact.firstName} ${contact.lastName}` : 'Voir contact';
  }

  getStageLabel(stage: DealStage): string {
    return DEAL_STAGES.find((s) => s.id === stage)?.label ?? stage;
  }

  getNextStage(current: DealStage): DealStage | null {
    const progression: DealStage[] = [
      'prospection',
      'qualification',
      'proposition',
      'negociation',
      'gagne',
    ];
    const idx = progression.indexOf(current);
    if (idx === -1 || idx >= progression.length - 1) return null;
    return progression[idx + 1];
  }

  onStageSelect(dealId: string, event: Event): void {
    const nextStage = (event.target as HTMLSelectElement).value as DealStage;
    void this.store.moveDealStage(dealId, nextStage);
  }

  onDragStart(event: DragEvent, dealId: string): void {
    this.draggedDealId.set(dealId);
    event.dataTransfer?.setData('text/plain', dealId);
  }

  onDragEnd(): void {
    this.draggedDealId.set(null);
    this.dragOverStage.set(null);
  }

  onDragOver(event: DragEvent, stage: DealStage): void {
    event.preventDefault();
    this.dragOverStage.set(stage);
  }

  onDragLeave(stage: DealStage): void {
    if (this.dragOverStage() === stage) {
      this.dragOverStage.set(null);
    }
  }

  onDrop(event: DragEvent, targetStage: DealStage): void {
    event.preventDefault();
    const dealId =
      this.draggedDealId() || event.dataTransfer?.getData('text/plain') || null;
    this.draggedDealId.set(null);
    this.dragOverStage.set(null);
    if (dealId) {
      void this.store.moveDealStage(dealId, targetStage);
    }
  }
}
