import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DEAL_STAGES, Deal, DealStage } from '../../core/models/crm.model';
import { CRM_STORE } from '../../core/state/crm.store';
import { DealFormModalComponent } from './deal-form-modal.component';

const STAGE_DOT_CLASS: Record<DealStage, string> = {
  prospection: 'bg-slate-400',
  qualification: 'bg-sky-500',
  proposition: 'bg-indigo-500',
  negociation: 'bg-amber-500',
  gagne: 'bg-emerald-500',
  perdu: 'bg-rose-500',
};

@Component({
  selector: 'app-pipeline-kanban',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DealFormModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .kanban-grid {
        display: grid;
        grid-template-columns: repeat(1, minmax(0, 1fr));
        gap: 1rem;
        align-items: start;
      }
      @media (min-width: 768px) {
        .kanban-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (min-width: 1280px) {
        .kanban-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    `,
  ],
  template: `
    <div class="space-y-4">
      <!-- Section Action Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <span class="inline-flex h-2 w-2 shrink-0 rounded-full bg-indigo-500"></span>
          <p class="text-xs font-medium text-slate-500">
            Glissez-déposez vos opportunités ou utilisez le bouton d’avancement rapide.
          </p>
        </div>

        <button
          type="button"
          (click)="showCreateModal.set(true)"
          class="ds-btn ds-btn-primary w-full sm:w-auto"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouvelle opportunité
        </button>
      </div>

      <!-- No-Scroll Responsive Stage Grid (1 col mobile / 2 col tablet / 3 col desktop) -->
      <div class="kanban-grid">
        @for (col of store.kanbanColumns(); track col.stage.id) {
          <section
            [class]="dragOverStage() === col.stage.id
              ? 'flex flex-col rounded-2xl bg-indigo-50/70 p-2.5 ring-2 ring-indigo-500 transition dark:bg-indigo-950/40'
              : 'flex flex-col rounded-2xl bg-slate-200/50 p-2.5 ring-1 ring-slate-900/5 transition dark:bg-slate-800/40 dark:ring-slate-700/60'"
            (dragover)="onDragOver($event, col.stage.id)"
            (dragleave)="onDragLeave(col.stage.id)"
            (drop)="onDrop($event, col.stage.id)"
          >
            <!-- Column Header -->
            <header class="mb-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-2xs ring-1 ring-slate-900/5 dark:bg-[#162033] dark:ring-slate-700/70">
              <div class="flex items-center justify-between gap-2">
                <div class="flex min-w-0 items-center gap-2">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" [class]="getStageDot(col.stage.id)"></span>
                  <h3 class="truncate font-display text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {{ col.stage.label }}
                  </h3>
                  <span class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 tabular-nums">
                    {{ col.deals.length }}
                  </span>
                </div>
                <span class="shrink-0 font-display text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {{ col.totalAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                </span>
              </div>

              @if (col.stage.id !== 'gagne' && col.stage.id !== 'perdu') {
                <div class="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Pondéré</span>
                  <span class="font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {{ col.weightedAmount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                  </span>
                </div>
              }
            </header>

            <!-- Cards Stack (no internal scroll) -->
            <div class="flex flex-col gap-2.5">
              @for (deal of col.deals; track deal.id) {
                <article
                  draggable="true"
                  (dragstart)="onDragStart($event, deal.id)"
                  (dragend)="onDragEnd()"
                  class="ds-card ds-card-interactive group cursor-grab p-3.5 active:cursor-grabbing"
                >
                  <!-- Company + Delete -->
                  <div class="flex items-start justify-between gap-2">
                    <span class="inline-flex max-w-[82%] items-center gap-1.5 rounded-md bg-indigo-50/80 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                      <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"></span>
                      <span class="truncate">{{ deal.company }}</span>
                    </span>

                    <button
                      type="button"
                      (click)="confirmDeleteDeal(deal)"
                      class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 sm:h-8 sm:w-8"
                      title="Supprimer l’opportunité"
                      aria-label="Supprimer l’opportunité"
                    >
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  <!-- Title -->
                  <h4 class="mt-2 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                    {{ deal.title }}
                  </h4>

                  <!-- Amount & Probability -->
                  <div class="mt-2.5 flex items-end justify-between gap-2">
                    <span class="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                      {{ deal.amount | currency:'EUR':'symbol':'1.0-0':'fr' }}
                    </span>
                    <span
                      class="inline-flex shrink-0 items-center rounded-lg border px-2 py-0.5 text-[11px] font-bold tabular-nums"
                      [class]="col.stage.badgeClass"
                    >
                      {{ deal.probability }}%
                    </span>
                  </div>

                  <!-- Mini probability bar -->
                  <div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      class="h-full rounded-full transition-all"
                      [class]="getStageDot(deal.stage)"
                      [style.width.%]="deal.probability"
                    ></div>
                  </div>

                  <!-- Contact & Close Date -->
                  <div class="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    @if (deal.contactId) {
                      <button
                        type="button"
                        (click)="store.selectContact(deal.contactId)"
                        class="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300"
                      >
                        <svg class="h-3 w-3 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <span class="truncate">{{ getContactName(deal) }}</span>
                      </button>
                    } @else {
                      <span class="text-slate-400">Sans contact</span>
                    }

                    @if (deal.expectedCloseDate) {
                      <span class="inline-flex shrink-0 items-center gap-1 text-slate-400 tabular-nums">
                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        {{ deal.expectedCloseDate | date:'dd MMM':'':'fr' }}
                      </span>
                    }
                  </div>

                  <!-- Quick Stage Controls -->
                  <div class="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <select
                      [value]="deal.stage"
                      (change)="onStageSelect(deal.id, $event)"
                      aria-label="Changer d’étape"
                      class="min-h-[44px] min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-base font-medium text-slate-700 transition focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:min-h-[34px] sm:text-xs"
                    >
                      @for (s of stages; track s.id) {
                        <option [value]="s.id">{{ s.label }}</option>
                      }
                    </select>

                    @if (getNextStage(deal.stage); as nextStage) {
                      <button
                        type="button"
                        (click)="store.moveDealStage(deal.id, nextStage)"
                        class="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 sm:min-h-[34px] sm:px-2.5 sm:text-[11px]"
                        [title]="'Passer à ' + getStageLabel(nextStage)"
                      >
                        <span>Avancer</span>
                        <span>→</span>
                      </button>
                    }
                  </div>
                </article>
              } @empty {
                <div class="flex items-center justify-center rounded-xl border border-dashed border-slate-300/90 bg-white/40 py-8 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900/30">
                  <span>Aucune opportunité</span>
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

  getStageDot(stage: DealStage): string {
    return STAGE_DOT_CLASS[stage] ?? 'bg-slate-400';
  }

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

  confirmDeleteDeal(deal: Deal): void {
    if (confirm(`Supprimer définitivement l’opportunité « ${deal.title} » ?`)) {
      void this.store.deleteDeal(deal.id);
    }
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
