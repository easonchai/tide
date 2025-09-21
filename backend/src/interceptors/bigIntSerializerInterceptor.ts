import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Recursively transforms any BigInt values in an object to strings
 * Handles nested objects, arrays, and primitive values
 * @param data - Any object or value that might contain BigInt values
 * @returns The same structure with all BigInt values converted to strings
 */
function serializeBigInt<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'bigint') {
    return data.toString() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeBigInt(item)) as unknown as T;
  }

  // Handle plain objects (but not Date or other special objects)
  if (typeof data === 'object' && data.constructor === Object) {
    const result = {} as Record<string, unknown>;

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = serializeBigInt((data as Record<string, unknown>)[key]);
      }
    }

    return result as unknown as T;
  }

  return data;
}

/**
 * Global interceptor that automatically serializes BigInt values to strings
 * in API response data to ensure JSON compatibility
 */
@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  /**
   * Intercepts the response and serializes any BigInt values to strings
   *
   * @param context - Execution context containing request/response information
   * @param next - Call handler to continue the request pipeline
   * @returns Observable with serialized response data
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return serializeBigInt(data);
      }),
    );
  }
}
