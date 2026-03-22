export enum IntegrationErrorCode {
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_INPUT = 'INVALID_INPUT',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOT_FOUND = 'NOT_FOUND',
}

const RETRYABLE_CODES = new Set<IntegrationErrorCode>([
  IntegrationErrorCode.RATE_LIMITED,
  IntegrationErrorCode.NETWORK_ERROR,
]);

type IntegrationErrorOptions = {
  provider: string;
  code: IntegrationErrorCode;
  message: string;
  providerError?: unknown;
};

export class IntegrationError extends Error {
  readonly provider: string;
  readonly code: IntegrationErrorCode;
  readonly retryable: boolean;
  readonly providerError?: unknown;

  constructor(options: IntegrationErrorOptions) {
    super(options.message);
    this.name = 'IntegrationError';
    this.provider = options.provider;
    this.code = options.code;
    this.retryable = RETRYABLE_CODES.has(options.code);
    this.providerError = options.providerError;
  }
}
