import { isFirebaseConfigReady, parseAppEnv } from '../config/env';
import { ValidationError } from '../errors/app-error';
import {
  MonthlyForecastReportSchema,
  NewActivityPayloadSchema,
  NewContactPayloadSchema,
  NewDealPayloadSchema,
  parseWithSchema,
} from './crm.schemas';

describe('Zod schemas & centralized env config', () => {
  it('validates valid contact, deal, and activity payloads', () => {
    const contact = parseWithSchema(
      NewContactPayloadSchema,
      {
        firstName: '  Claire ',
        lastName: 'Moreau',
        email: 'claire@novatech.fr',
        phone: '+33600000000',
        company: 'NovaTech',
        status: 'qualified',
        ownerId: 'uid-1',
      },
      'req_1',
      'Contact'
    );
    expect(contact.firstName).toBe('Claire');

    const deal = parseWithSchema(
      NewDealPayloadSchema,
      {
        title: 'Extension SaaS',
        contactId: 'c1',
        company: 'NovaTech',
        amount: 15000,
        probability: 60,
        stage: 'proposition',
        expectedCloseDate: '2026-12-31',
      },
      'req_2',
      'Deal'
    );
    expect(deal.amount).toBe(15000);

    const activity = parseWithSchema(
      NewActivityPayloadSchema,
      {
        dealId: null,
        contactId: 'c1',
        type: 'appel',
        summary: 'Appel de découverte',
        authorName: 'Camille',
      },
      'req_3',
      'Activity'
    );
    expect(activity.type).toBe('appel');
  });

  it('throws typed ValidationError with field messages on invalid inputs', () => {
    expect(() =>
      parseWithSchema(
        NewDealPayloadSchema,
        {
          title: '',
          amount: -100,
          probability: 150,
          stage: 'invalid-stage',
        },
        'req_bad',
        'Deal'
      )
    ).toThrowError(ValidationError);

    try {
      parseWithSchema(
        NewContactPayloadSchema,
        { firstName: '', lastName: 'Test', email: 'not-an-email' },
        'req_bad_2',
        'Contact'
      );
    } catch (err) {
      expect(err instanceof ValidationError).toBeTrue();
      const valErr = err as ValidationError;
      expect(valErr.fields?.['firstName']).toContain('prénom');
      expect(valErr.fields?.['email']).toContain('email');
      expect(valErr.requestId).toBe('req_bad_2');
    }
  });

  it('validates MonthlyForecastReport contract', () => {
    const report = parseWithSchema(
      MonthlyForecastReportSchema,
      {
        requestId: 'fcst_123',
        month: '2026-11',
        generatedAt: '2026-11-26T00:00:00.000Z',
        totalPipelineAmount: 50000,
        totalWeightedForecast: 22000,
        totalWonAmount: 30000,
        byRep: [],
      },
      'fcst_123',
      'MonthlyForecastReport'
    );
    expect(report.month).toBe('2026-11');
  });

  it('validates environment config and detects placeholder Firebase keys', () => {
    const valid = parseAppEnv({
      production: false,
      useEmulators: false,
      firebase: {
        apiKey: 'YOUR_API_KEY',
        authDomain: 'example.firebaseapp.com',
        projectId: 'YOUR_PROJECT',
        storageBucket: '',
        messagingSenderId: '',
        appId: 'YOUR_APP_ID',
      },
    });
    expect(isFirebaseConfigReady(valid.firebase)).toBeFalse();
    expect(
      isFirebaseConfigReady({
        ...valid.firebase,
        apiKey: 'AIzaRealKey',
        projectId: 'pulsecrm-prod',
        appId: '1:123:web:abc',
      })
    ).toBeTrue();

    expect(() => parseAppEnv({ production: 'nope' })).toThrowError(ValidationError);
  });
});
