import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type Wrapped<T> = { data: T } | { data: unknown; meta: unknown };

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Wrapped<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<Wrapped<T>> {
    return next.handle().pipe(
      map((value) => {
        if (value !== null && typeof value === 'object' && 'data' in value) {
          return value as Wrapped<T>;
        }
        return { data: value };
      }),
    );
  }
}
