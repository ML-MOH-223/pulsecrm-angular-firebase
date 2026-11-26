import { z } from 'zod';
import { ValidationError } from '../errors/app-error';

export const ContactStatusSchema = z.enum(['lead', 'qualified', 'customer', 'churned']);

export const DealStageSchema = z.enum([
  'prospection',
  'qualification',
  'proposition',
  'negociation',
  'gagne',
  'perdu',
]);

export const ActivityTypeSchema = z.enum(['appel', 'email', 'reunion', 'note']);

export const NewContactPayloadSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis.'),
  lastName: z.string().trim().min(1, 'Le nom est requis.'),
  email: z.string().trim().email('Adresse email invalide.'),
  phone: z.string().trim().default(''),
  company: z.string().trim().default(''),
  status: ContactStatusSchema.default('lead'),
  ownerId: z.string().trim().default(''),
});

export const NewDealPayloadSchema = z.object({
  title: z.string().trim().min(1, 'Le titre de l’opportunité est requis.'),
  contactId: z.string().trim().default(''),
  company: z.string().trim().default(''),
  amount: z.number().finite('Montant invalide.').min(0, 'Le montant doit être positif ou nul.'),
  probability: z
    .number()
    .finite('Probabilité invalide.')
    .min(0, 'La probabilité doit être comprise entre 0 et 100.')
    .max(100, 'La probabilité doit être comprise entre 0 et 100.'),
  stage: DealStageSchema.default('prospection'),
  expectedCloseDate: z.string().trim().default(''),
  ownerId: z.string().trim().optional(),
  ownerName: z.string().trim().optional(),
});

export const NewActivityPayloadSchema = z.object({
  dealId: z.string().nullable().default(null),
  contactId: z.string().trim().min(1, 'Le contact associé est requis.'),
  type: ActivityTypeSchema.default('note'),
  summary: z.string().trim().min(1, 'Le résumé de l’activité est requis.'),
  authorName: z.string().trim().default('Commercial'),
  ownerId: z.string().trim().optional(),
});

export const RepForecastSchema = z.object({
  ownerId: z.string(),
  ownerName: z.string(),
  openDealsCount: z.number().min(0),
  pipelineAmount: z.number().min(0),
  weightedForecast: z.number().min(0),
  wonAmount: z.number().min(0),
});

export const MonthlyForecastReportSchema = z.object({
  requestId: z.string().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Format de mois attendu : YYYY-MM'),
  generatedAt: z.string(),
  totalPipelineAmount: z.number().min(0),
  totalWeightedForecast: z.number().min(0),
  totalWonAmount: z.number().min(0),
  byRep: z.array(RepForecastSchema),
});

export type ValidatedNewContact = z.infer<typeof NewContactPayloadSchema>;
export type ValidatedNewDeal = z.infer<typeof NewDealPayloadSchema>;
export type ValidatedNewActivity = z.infer<typeof NewActivityPayloadSchema>;
export type ValidatedMonthlyForecastReport = z.infer<typeof MonthlyForecastReportSchema>;

export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
  requestId: string,
  entityName: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || entityName;
      if (!fields[key]) {
        fields[key] = issue.message;
      }
    }
    throw new ValidationError(`Validation failed for ${entityName}`, {
      requestId,
      fields,
      context: { entityName, fields },
    });
  }
  return result.data;
}
