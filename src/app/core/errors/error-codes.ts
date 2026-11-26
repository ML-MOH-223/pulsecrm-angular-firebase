export interface ErrorCodeDefinition {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly defaultUserMessage: string;
  readonly cause: string;
  readonly description: string;
  readonly diagnosticLocation: string;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'DATABASE_ERROR'
  | 'AUTH_ERROR'
  | 'AUTH_UNAUTHORIZED_DOMAIN'
  | 'AUTH_POPUP_BLOCKED'
  | 'FIRESTORE_LISTENER_ERROR'
  | 'FORECAST_FALLBACK'
  | 'STORAGE_ERROR'
  | 'BOOTSTRAP_ERROR'
  | 'UNKNOWN_ERROR';

export const ERROR_CATALOG: Record<ErrorCode, ErrorCodeDefinition> = {
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    statusCode: 400,
    defaultUserMessage: 'Certains champs sont invalides. Vérifiez votre saisie et réessayez.',
    cause: 'Payload utilisateur, document Firestore ou configuration invalide selon le schéma Zod.',
    description: 'Rejet explicite lors de la validation des entrées ou des données externes.',
    diagnosticLocation: 'src/app/core/schemas/ & src/app/core/config/env.ts',
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    statusCode: 404,
    defaultUserMessage: 'La ressource demandée est introuvable ou a été supprimée.',
    cause: 'Identifiant inexistant dans Firestore ou le store local.',
    description: 'Ressource contact, opportunité ou activité introuvable.',
    diagnosticLocation: 'src/app/core/state/crm.store.ts',
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    statusCode: 403,
    defaultUserMessage: 'Vous n’avez pas les droits nécessaires pour effectuer cette opération.',
    cause: 'Règle de sécurité Firestore (ownerId != request.auth.uid) ou session expirée.',
    description: 'Accès refusé par Firestore Rules ou par le garde d’authentification Cloud Functions.',
    diagnosticLocation: 'firestore.rules & functions/src/index.ts',
  },
  CONFLICT: {
    code: 'CONFLICT',
    statusCode: 409,
    defaultUserMessage: 'Cette ressource existe déjà ou est en conflit avec une modification récente.',
    cause: 'Doublon détecté ou écriture concurrente.',
    description: 'Conflit d’état lors d’une création ou mise à jour.',
    diagnosticLocation: 'src/app/core/state/crm.store.ts',
  },
  EXTERNAL_SERVICE_ERROR: {
    code: 'EXTERNAL_SERVICE_ERROR',
    statusCode: 502,
    defaultUserMessage: 'Le service externe est temporairement indisponible. Réessayez dans un instant.',
    cause: 'Perte réseau, timeout Firebase Cloud Functions ou indisponibilité Google Auth.',
    description: 'Échec d’appel vers Firebase Auth, Functions ou un service tiers.',
    diagnosticLocation: 'src/app/core/firebase/firebase.service.ts & functions/src/index.ts',
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    statusCode: 500,
    defaultUserMessage: 'Erreur lors de la synchronisation avec la base de données. Réessayez.',
    cause: 'Échec lecture/écriture Firestore (quota, réseau, index manquant ou payload rejeté).',
    description: 'Erreur de persistance sur les collections contacts, deals ou activities.',
    diagnosticLocation: 'src/app/core/state/crm.store.ts',
  },
  AUTH_ERROR: {
    code: 'AUTH_ERROR',
    statusCode: 401,
    defaultUserMessage: 'Impossible de finaliser l’authentification pour le moment. Réessayez.',
    cause: 'Identifiants invalides, compte inexistant ou erreur Firebase Auth.',
    description: 'Échec d’un flux de connexion, inscription ou réinitialisation de mot de passe.',
    diagnosticLocation: 'src/app/core/auth/auth.store.ts',
  },
  AUTH_UNAUTHORIZED_DOMAIN: {
    code: 'AUTH_UNAUTHORIZED_DOMAIN',
    statusCode: 403,
    defaultUserMessage:
      'Ce domaine n’est pas autorisé dans Firebase Auth. Ajoutez-le dans Firebase Console → Authentication → Settings → Authorized domains.',
    cause: 'Domaine Vercel ou preview absent des Authorized Domains Firebase.',
    description: 'Blocage immédiat de la popup OAuth Google par Firebase Auth.',
    diagnosticLocation: 'src/app/core/auth/auth.store.ts & VERCEL_ENV_CHECKLIST.md',
  },
  AUTH_POPUP_BLOCKED: {
    code: 'AUTH_POPUP_BLOCKED',
    statusCode: 409,
    defaultUserMessage:
      'Votre navigateur a bloqué la fenêtre Google. Redirection automatique en cours...',
    cause: 'Bloqueur de pop-ups navigateur actif.',
    description: 'Bascule automatique vers signInWithRedirect.',
    diagnosticLocation: 'src/app/core/auth/auth.store.ts',
  },
  FIRESTORE_LISTENER_ERROR: {
    code: 'FIRESTORE_LISTENER_ERROR',
    statusCode: 500,
    defaultUserMessage: 'La synchronisation temps réel a été interrompue. Vérifiez votre connexion.',
    cause: 'Erreur onSnapshot (permission-denied, index manquant ou déconnexion prolongée).',
    description: 'Interruption d’un abonnement temps réel Firestore.',
    diagnosticLocation: 'src/app/core/state/crm.store.ts',
  },
  FORECAST_FALLBACK: {
    code: 'FORECAST_FALLBACK',
    statusCode: 503,
    defaultUserMessage: 'Prévisions calculées localement (Cloud Function indisponible).',
    cause: 'Cloud Function calculateMonthlyForecast non déployée, hors ligne ou en timeout.',
    description: 'Dégradation gracieuse vers buildMonthlyForecastLocal.',
    diagnosticLocation: 'src/app/core/state/crm.store.ts & functions/src/index.ts',
  },
  STORAGE_ERROR: {
    code: 'STORAGE_ERROR',
    statusCode: 500,
    defaultUserMessage: 'Impossible d’enregistrer vos préférences locales dans ce navigateur.',
    cause: 'Mode navigation privée strict ou quota localStorage/IndexedDB dépassé.',
    description: 'Erreur d’accès au stockage local navigateur.',
    diagnosticLocation: 'src/app/core/state/theme.store.ts & firebase.service.ts',
  },
  BOOTSTRAP_ERROR: {
    code: 'BOOTSTRAP_ERROR',
    statusCode: 500,
    defaultUserMessage: 'Impossible de démarrer l’application. Rechargez la page.',
    cause: 'Exception critique lors de bootstrapApplication().',
    description: 'Échec d’initialisation Angular au démarrage.',
    diagnosticLocation: 'src/main.ts & src/app/app.config.ts',
  },
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
    defaultUserMessage: 'Une erreur inattendue est survenue. Réessayez dans un instant.',
    cause: 'Exception non catégorisée.',
    description: 'Erreur capturée par le gestionnaire global sans code spécifique.',
    diagnosticLocation: 'src/app/core/errors/global-error-handler.ts',
  },
};
