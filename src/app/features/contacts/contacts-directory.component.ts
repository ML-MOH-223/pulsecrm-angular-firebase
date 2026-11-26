import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CONTACT_STATUS_LABELS, Contact, ContactStatus } from '../../core/models/crm.model';
import { CRM_STORE } from '../../core/state/crm.store';

type StatusFilter = ContactStatus | 'all';
type ContactsViewMode = 'cards' | 'table';

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
];

@Component({
  selector: 'app-contacts-directory',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .contacts-cards-grid {
        display: grid;
        grid-template-columns: repeat(1, minmax(0, 1fr));
        gap: 1rem;
      }
      @media (min-width: 640px) {
        .contacts-cards-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (min-width: 1280px) {
        .contacts-cards-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    `,
  ],
  template: `
    <div class="space-y-4">
      <!-- Top Segmentation Pills + View Switcher + CTA -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-1.5 rounded-xl bg-white p-1.5 shadow-card ring-1 ring-slate-900/5 dark:bg-[#162033] dark:ring-slate-700/70">
          @for (tab of statusTabs(); track tab.id) {
            <button
              type="button"
              (click)="statusFilter.set(tab.id)"
              [class]="statusFilter() === tab.id
                ? 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition dark:bg-indigo-600'
                : 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'"
            >
              <span>{{ tab.label }}</span>
              <span
                [class]="statusFilter() === tab.id
                  ? 'rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums'
                  : 'rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400 tabular-nums'"
              >
                {{ tab.count }}
              </span>
            </button>
          }
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Cards / Table View Toggle -->
          <div class="hidden items-center rounded-xl bg-white p-1 shadow-card ring-1 ring-slate-900/5 dark:bg-[#162033] dark:ring-slate-700/70 md:flex">
            <button
              type="button"
              (click)="viewMode.set('cards')"
              [class]="viewMode() === 'cards'
                ? 'inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition dark:bg-indigo-600'
                : 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition'"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Cartes
            </button>
            <button
              type="button"
              (click)="viewMode.set('table')"
              [class]="viewMode() === 'table'
                ? 'inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition dark:bg-indigo-600'
                : 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition'"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
              Tableau
            </button>
          </div>

          <button
            type="button"
            (click)="showQuickAdd.set(!showQuickAdd())"
            class="ds-btn ds-btn-primary w-full shrink-0 sm:w-auto"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {{ showQuickAdd() ? 'Fermer le formulaire' : 'Ajouter un contact' }}
          </button>
        </div>
      </div>

      <!-- Quick Add Typed Reactive Form -->
      @if (showQuickAdd()) {
        <form
          [formGroup]="contactForm"
          (ngSubmit)="submitContact()"
          class="animate-fade-in rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-white p-4 shadow-card sm:p-5"
        >
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-display text-xs font-bold uppercase tracking-wider text-indigo-800">
              Nouveau contact commercial
            </h3>
            <span class="text-[11px] text-slate-400">Champs requis marqués *</span>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input
              type="text"
              formControlName="firstName"
              placeholder="Prénom *"
              class="ds-input"
            />
            <input
              type="text"
              formControlName="lastName"
              placeholder="Nom *"
              class="ds-input"
            />
            <input
              type="email"
              formControlName="email"
              placeholder="Email professionnel *"
              class="ds-input"
            />
            <input
              type="text"
              formControlName="phone"
              placeholder="Téléphone"
              class="ds-input"
            />
            <input
              type="text"
              formControlName="company"
              placeholder="Entreprise *"
              class="ds-input"
            />
            <div class="flex flex-col gap-2 sm:flex-row">
              <select
                formControlName="status"
                class="ds-input flex-1"
              >
                <option value="lead">Lead</option>
                <option value="qualified">Qualifié</option>
                <option value="customer">Client</option>
                <option value="churned">Perdu</option>
              </select>
              <button
                type="submit"
                [disabled]="store.saving()"
                class="ds-btn ds-btn-primary shrink-0"
              >
                {{ store.saving() ? '...' : 'Créer' }}
              </button>
            </div>
          </div>
          @if (contactForm.touched && contactForm.invalid) {
            <p class="mt-2.5 text-xs font-medium text-rose-600">
              Veuillez renseigner un prénom, un nom, une entreprise et une adresse email valide.
            </p>
          }
        </form>
      }

      <!-- Default Modern Card Grid View (always on mobile, default on desktop) -->
      @if (viewMode() === 'cards') {
        <div class="contacts-cards-grid">
          @for (contact of displayedContacts(); track contact.id) {
            @let score = store.leadScores().get(contact.id) ?? 0;
            <article
              (click)="store.selectContact(contact.id)"
              [class]="store.selectedContactId() === contact.id
                ? 'ds-card ds-card-interactive group cursor-pointer p-5 ring-2 ring-indigo-500/60'
                : 'ds-card ds-card-interactive group cursor-pointer p-5'"
            >
              <!-- Card Header: Avatar + Name + Status Pill -->
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3.5">
                  <span
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-display text-xs font-bold text-white shadow-sm"
                    [class]="getAvatarGradient(contact.id)"
                  >
                    {{ contact.firstName.charAt(0) }}{{ contact.lastName.charAt(0) }}
                  </span>
                  <div class="min-w-0">
                    <h3 class="truncate font-display text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                      {{ contact.firstName }} {{ contact.lastName }}
                    </h3>
                    <p class="truncate text-xs font-semibold text-indigo-600 dark:text-indigo-400">{{ contact.company }}</p>
                  </div>
                </div>

                <span class="shrink-0">
                  @switch (contact.status) {
                    @case ('customer') {
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/80">
                        <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        {{ statusLabels[contact.status] }}
                      </span>
                    }
                    @case ('qualified') {
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200/80">
                        <span class="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                        {{ statusLabels[contact.status] }}
                      </span>
                    }
                    @case ('lead') {
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200/80">
                        <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        {{ statusLabels[contact.status] }}
                      </span>
                    }
                    @default {
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200/80">
                        <span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                        {{ statusLabels[contact.status] }}
                      </span>
                    }
                  }
                </span>
              </div>

              <!-- Contact Info Chips -->
              <div class="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div class="flex items-center gap-2 truncate">
                  <svg class="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <span class="truncate">{{ contact.email }}</span>
                </div>
                <div class="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                  <span class="flex items-center gap-2 truncate tabular-nums">
                    <svg class="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {{ contact.phone || 'Non renseigné' }}
                  </span>
                  <span class="shrink-0 text-[11px] text-slate-400 tabular-nums">
                    {{ contact.createdAt | date:'dd MMM yyyy':'':'fr' }}
                  </span>
                </div>
              </div>

              <!-- Lead Score Gauge -->
              <div class="mt-4 rounded-xl bg-slate-50/90 p-3 dark:bg-slate-800/70">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="font-semibold text-slate-500 dark:text-slate-400">Engagement (Lead Score)</span>
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold tabular-nums text-slate-800 dark:text-slate-100">{{ score }}/100</span>
                    <span
                      class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                      [class]="score >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : score >= 40 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'"
                    >
                      {{ score >= 70 ? 'Chaud' : score >= 40 ? 'Tiède' : 'Froid' }}
                    </span>
                  </div>
                </div>
                <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    [style.width.%]="score"
                    [class]="score >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : score >= 40 ? 'bg-gradient-to-r from-indigo-400 to-indigo-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'"
                  ></div>
                </div>
              </div>

              <!-- Card Footer Actions -->
              <div class="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800" (click)="$event.stopPropagation()">
                <button
                  type="button"
                  (click)="store.selectContact(contact.id)"
                  class="ds-btn ds-btn-secondary flex-1"
                >
                  Ouvrir la fiche
                </button>
                <button
                  type="button"
                  (click)="confirmDeleteContact(contact)"
                  title="Supprimer le contact"
                  aria-label="Supprimer le contact"
                  class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 sm:h-9 sm:w-9"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </article>
          } @empty {
            <div class="col-span-full rounded-2xl bg-white px-4 py-16 text-center shadow-card ring-1 ring-slate-900/5">
              <p class="text-sm font-semibold text-slate-600">Aucun contact trouvé</p>
              <p class="mt-1 text-xs text-slate-400">
                Modifiez vos filtres ou ajoutez un nouveau contact pour démarrer.
              </p>
            </div>
          }
        </div>
      } @else {
        <!-- Optional Dense Table View -->
        <div class="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
          <div class="kanban-scroll overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr class="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th class="px-5 py-3.5">Contact</th>
                  <th class="px-5 py-3.5">Entreprise</th>
                  <th class="px-5 py-3.5">Statut</th>
                  <th class="px-5 py-3.5">Engagement</th>
                  <th class="px-5 py-3.5">Téléphone</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                @for (contact of displayedContacts(); track contact.id) {
                  @let score = store.leadScores().get(contact.id) ?? 0;
                  <tr
                    (click)="store.selectContact(contact.id)"
                    [class]="store.selectedContactId() === contact.id
                      ? 'group cursor-pointer bg-indigo-50/50 transition hover:bg-indigo-50/80'
                      : 'group cursor-pointer transition hover:bg-slate-50/80'"
                  >
                    <td class="px-5 py-3.5">
                      <div class="flex items-center gap-3">
                        <span
                          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white shadow-xs"
                          [class]="getAvatarGradient(contact.id)"
                        >
                          {{ contact.firstName.charAt(0) }}{{ contact.lastName.charAt(0) }}
                        </span>
                        <div class="min-w-0">
                          <p class="truncate font-semibold text-slate-900 group-hover:text-indigo-700">
                            {{ contact.firstName }} {{ contact.lastName }}
                          </p>
                          <p class="truncate text-xs text-slate-500">{{ contact.email }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 font-medium text-slate-800">{{ contact.company }}</td>
                    <td class="px-5 py-3.5">
                      <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {{ statusLabels[contact.status] }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5">
                      <div class="flex items-center gap-2">
                        <div class="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            class="h-full rounded-full"
                            [style.width.%]="score"
                            [class]="score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-indigo-500' : 'bg-amber-400'"
                          ></div>
                        </div>
                        <span class="text-xs font-bold tabular-nums text-slate-800">{{ score }}/100</span>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-xs tabular-nums text-slate-600">{{ contact.phone || '—' }}</td>
                    <td class="px-5 py-3.5 text-right" (click)="$event.stopPropagation()">
                      <button
                        type="button"
                        (click)="store.selectContact(contact.id)"
                        class="mr-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Ouvrir
                      </button>
                      <button
                        type="button"
                        (click)="confirmDeleteContact(contact)"
                        class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Supprimer le contact"
                      >
                        Suppr.
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-5 py-14 text-center text-sm text-slate-500">
                      Aucun contact trouvé.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class ContactsDirectoryComponent {
  readonly store = inject(CRM_STORE);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly statusLabels = CONTACT_STATUS_LABELS;
  readonly showQuickAdd = signal(false);
  readonly statusFilter = signal<StatusFilter>('all');
  readonly viewMode = signal<ContactsViewMode>('cards');

  readonly statusTabs = computed(() => {
    const all = this.store.filteredContacts();
    return [
      { id: 'all' as StatusFilter, label: 'Tous', count: all.length },
      { id: 'lead' as StatusFilter, label: 'Leads', count: all.filter((c) => c.status === 'lead').length },
      { id: 'qualified' as StatusFilter, label: 'Qualifiés', count: all.filter((c) => c.status === 'qualified').length },
      { id: 'customer' as StatusFilter, label: 'Clients', count: all.filter((c) => c.status === 'customer').length },
      { id: 'churned' as StatusFilter, label: 'Perdus', count: all.filter((c) => c.status === 'churned').length },
    ];
  });

  readonly displayedContacts = computed(() => {
    const activeStatus = this.statusFilter();
    const list = this.store.filteredContacts();
    if (activeStatus === 'all') return list;
    return list.filter((c) => c.status === activeStatus);
  });

  readonly contactForm = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    company: ['', [Validators.required]],
    status: ['lead' as ContactStatus],
  });

  getAvatarGradient(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  }

  confirmDeleteContact(contact: Contact): void {
    if (confirm(`Supprimer définitivement ${contact.firstName} ${contact.lastName} ?`)) {
      void this.store.deleteContact(contact.id);
    }
  }

  async submitContact(): Promise<void> {
    this.contactForm.markAllAsTouched();
    if (this.contactForm.invalid) return;
    const raw = this.contactForm.getRawValue();
    await this.store.addContact({
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: raw.email.trim(),
      phone: raw.phone.trim(),
      company: raw.company.trim(),
      status: raw.status,
      ownerId: '',
    });
    this.contactForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      status: 'lead',
    });
    this.showQuickAdd.set(false);
  }
}
