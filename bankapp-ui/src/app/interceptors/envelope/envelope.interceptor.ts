import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

interface SuccessEnvelope<T = unknown> {
  success: true;
  message?: string;
  data?: T;
  meta?: unknown;
}

function isSuccessEnvelope(body: unknown): body is SuccessEnvelope {
  return !!body && typeof body === 'object' && (body as SuccessEnvelope).success === true;
}

export const envelopeInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event: HttpEvent<unknown>) => {
      if (!(event instanceof HttpResponse)) return event;
      const body = event.body;
      if (!isSuccessEnvelope(body)) return event;

      if (body.data !== undefined) {
        return event.clone({ body: body.data });
      }

      return event;
    }),
  );
};
