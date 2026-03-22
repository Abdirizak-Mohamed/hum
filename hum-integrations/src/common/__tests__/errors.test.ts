import { describe, it, expect } from 'vitest';
import { IntegrationError, IntegrationErrorCode } from '../errors.js';

describe('IntegrationErrorCode', () => {
  it('defines all expected error codes', () => {
    expect(IntegrationErrorCode.AUTH_EXPIRED).toBe('AUTH_EXPIRED');
    expect(IntegrationErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(IntegrationErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
    expect(IntegrationErrorCode.PROVIDER_ERROR).toBe('PROVIDER_ERROR');
    expect(IntegrationErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(IntegrationErrorCode.NOT_FOUND).toBe('NOT_FOUND');
  });
});

describe('IntegrationError', () => {
  it('creates error with all fields', () => {
    const error = new IntegrationError({
      provider: 'openai',
      code: IntegrationErrorCode.RATE_LIMITED,
      message: 'Rate limit exceeded',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('IntegrationError');
    expect(error.provider).toBe('openai');
    expect(error.code).toBe(IntegrationErrorCode.RATE_LIMITED);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.retryable).toBe(true);
  });

  it('sets retryable=true for RATE_LIMITED', () => {
    const error = new IntegrationError({
      provider: 'ayrshare',
      code: IntegrationErrorCode.RATE_LIMITED,
      message: 'Too many requests',
    });
    expect(error.retryable).toBe(true);
  });

  it('sets retryable=true for NETWORK_ERROR', () => {
    const error = new IntegrationError({
      provider: 'ayrshare',
      code: IntegrationErrorCode.NETWORK_ERROR,
      message: 'Connection refused',
    });
    expect(error.retryable).toBe(true);
  });

  it('sets retryable=false for other codes', () => {
    const nonRetryable = [
      IntegrationErrorCode.AUTH_EXPIRED,
      IntegrationErrorCode.INVALID_INPUT,
      IntegrationErrorCode.PROVIDER_ERROR,
      IntegrationErrorCode.NOT_FOUND,
    ];
    for (const code of nonRetryable) {
      const error = new IntegrationError({ provider: 'test', code, message: 'test' });
      expect(error.retryable).toBe(false);
    }
  });

  it('preserves providerError when provided', () => {
    const originalError = new Error('SDK error');
    const error = new IntegrationError({
      provider: 'openai',
      code: IntegrationErrorCode.PROVIDER_ERROR,
      message: 'Unexpected error',
      providerError: originalError,
    });
    expect(error.providerError).toBe(originalError);
  });

  it('providerError defaults to undefined', () => {
    const error = new IntegrationError({
      provider: 'openai',
      code: IntegrationErrorCode.PROVIDER_ERROR,
      message: 'Unexpected error',
    });
    expect(error.providerError).toBeUndefined();
  });
});
