import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Read token directly from localStorage to avoid circular dependency
  // with AuthService (which itself depends on HttpClient → this interceptor).
  const token = localStorage.getItem('auth_token');

  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(authReq);
  }

  return next(req);
};
