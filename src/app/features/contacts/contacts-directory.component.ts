import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CONTACT_STATUS_LABELS, ContactStatus } from '../../core/models/crm.model';
import { CRM_STORE } from '../../core/state/crm.store';

@Component({
  selector: 'app-contacts-directory',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-slate-900">
            Répertoire Contacts ({{ store.filteredContacts().length }})
          </h2>
          <p class="text-xs text-slate-500">
            Score d’engagement calculé automatiquement selon le statut et les activités récentes.
          </p>
        </div>

        <button
          type="button"
          (click)="showQuickAdd.set(!showQuickAdd())"
          class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {{ showQuickAdd() ? 'Fermer le formulaire' : 'Ajouter un contact' }}
        </button>
      </div>

      <!-- Quick Add Typed Reactive Form -->
      @if (showQuickAdd()) {
        <form
          [formGroup]="contactForm"
          (ngSubmit)="submitContact()"
          class="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-xs"
        >
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-800">
            Ajout rapide d’un contact
          </h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input
              type="text"
              formControlName="firstName"
              placeholder="Prénom *"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              formControlName="lastName"
              placeholder="Nom *"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="email"
              formControlName="email"
              placeholder="Email professionnel *"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              formControlName="phone"
              placeholder="Téléphone"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              formControlName="company"
              placeholder="Entreprise *"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <div class="flex gap-2">
              <select
                formControlName="status"
                class="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="lead">Lead</option>
                <option value="qualified">Qualifié</option>
                <option value="customer">Client</option>
                <option value="churned">Perdu</option>
              </select>
              <button
                type="submit"
                [disabled]="contactForm.invalid"
                class="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </div>
        </form>
      }

      <!-- Dense SaaS Table -->
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-4 py-3">Contact</th>
                <th class="px-4 py-3">Entreprise</th>
                <th class="px-4 py-3">Statut</th>
                <th class="px-4 py-3">Lead Score</th>
                <th class="px-4 py-3">Téléphone</th>
                <th class="px-4 py-3">Créé le</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              @for (contact of store.filteredContacts(); track contact.id) {
                @let score = store.leadScores().get(contact.id) ?? 0;
                <tr
                  (click)="store.selectContact(contact.id)"
                  [class]="store.selectedContactId() === contact.id ? 'cursor-pointer transition bg-indigo-50/40 hover:bg-slate-50' : 'cursor-pointer transition hover:bg-slate-50'"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {{ contact.firstName.charAt(0) }}{{ contact.lastName.charAt(0) }}
                      </span>
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-slate-900">
                          {{ contact.firstName }} {{ contact.lastName }}
                        </p>
                        <p class="truncate text-xs text-slate-500">{{ contact.email }}</p>
                      </div>
                    </div>
                  </td>

                  <td class="px-4 py-3 font-medium text-slate-700">{{ contact.company }}</td>

                  <td class="px-4 py-3">
                    @switch (contact.status) {
                      @case ('customer') {
                        <span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          {{ statusLabels[contact.status] }}
                        </span>
                      }
                      @case ('qualified') {
                        <span class="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                          {{ statusLabels[contact.status] }}
                        </span>
                      }
                      @case ('lead') {
                        <span class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                          {{ statusLabels[contact.status] }}
                        </span>
                      }
                      @default {
                        <span class="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                          {{ statusLabels[contact.status] }}
                        </span>
                      }
                    }
                  </td>

                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                        <div
                          class="h-full rounded-full transition-all"
                          [style.width.%]="score"
                          [class]="score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-indigo-500' : 'bg-amber-400'"
                        ></div>
                      </div>
                      <span class="text-xs font-semibold tabular-nums text-slate-700">{{ score }}/100</span>
                    </div>
                  </td>

                  <td class="px-4 py-3 text-xs tabular-nums text-slate-600">
                    {{ contact.phone || '—' }}
                  </td>

                  <td class="px-4 py-3 text-xs tabular-nums text-slate-500">
                    {{ contact.createdAt | date:'dd MMM yyyy':'':'fr' }}
                  </td>

                  <td class="px-4 py-3 text-right" (click)="$event.stopPropagation()">
                    <button
                      type="button"
                      (click)="store.selectContact(contact.id)"
                      class="mr-2 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      Fiche
                    </button>
                    <button
                      type="button"
                      (click)="store.deleteContact(contact.id)"
                      class="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      Suppr.
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-4 py-12 text-center text-sm text-slate-500">
                    Aucun contact ne correspond aux filtres actuels.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class ContactsDirectoryComponent {
  readonly store = inject(CRM_STORE);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly statusLabels = CONTACT_STATUS_LABELS;
  readonly showQuickAdd = signal(false);

  readonly contactForm = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    company: ['', [Validators.required]],
    status: ['lead' as ContactStatus],
  });

  async submitContact(): Promise<void> {
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
