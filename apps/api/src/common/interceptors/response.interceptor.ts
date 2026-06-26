import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
  data: T;
  error: null;
  meta: {
    requestId: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId =
      (request.headers['x-request-id'] as string) || crypto.randomUUID();

    return next.handle().pipe(
      map((value) => {
        // If a service already returned a paginated envelope ({ data, meta }),
        // unwrap it so we don't double-nest data. Merge its meta into the response meta.
        if (
          value &&
          typeof value === 'object' &&
          'data' in value &&
          'meta' in value
        ) {
          const inner = value as { data: T; meta: Record<string, unknown> };
          return {
            data: inner.data,
            error: null,
            meta: {
              ...inner.meta,
              requestId,
              timestamp: new Date().toISOString(),
            },
          } as unknown as ApiResponse<T>;
        }

        return {
          data: value as T,
          error: null,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
