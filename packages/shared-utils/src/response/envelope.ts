import type { PaginationMeta } from '@art-toys/shared-types';

export interface EnvelopeResponse<T> {
  data: T;
  error: null;
  meta: {
    requestId: string;
    timestamp: string;
    pagination?: PaginationMeta;
  };
}

export interface ErrorEnvelopeResponse {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
    timestamp: string;
    path?: string;
  };
}

export function envelope<T>(
  data: T,
  requestId?: string,
): EnvelopeResponse<T> {
  return {
    data,
    error: null,
    meta: {
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
  };
}

export function errorEnvelope(
  code: string,
  message: string,
  options?: {
    requestId?: string;
    path?: string;
    details?: unknown;
  },
): ErrorEnvelopeResponse {
  return {
    data: null,
    error: {
      code,
      message,
      ...(options?.details ? { details: options.details } : {}),
    },
    meta: {
      requestId: options?.requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...(options?.path ? { path: options.path } : {}),
    },
  };
}

export function paginatedEnvelope<T>(
  data: T,
  pagination: PaginationMeta,
  requestId?: string,
): EnvelopeResponse<T> {
  return {
    data,
    error: null,
    meta: {
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      pagination,
    },
  };
}
