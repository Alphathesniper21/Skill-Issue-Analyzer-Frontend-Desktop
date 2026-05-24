/**
 * @fileoverview Interceptor HTTP que adjunta el token JWT a las peticiones protegidas
 * y gestiona automaticamente el cierre de sesion ante respuestas 401.
 */

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor funcional de Angular que actua como middleware HTTP para:
 *
 * 1. **Inyectar el token JWT** en el header `Authorization: Bearer <token>`
 *    de todas las peticiones a rutas protegidas.
 * 2. **Omitir el token** en rutas publicas que contengan `/auth/` en su URL,
 *    como los endpoints de login y registro.
 * 3. **Manejar el error 401** cerrando la sesion automaticamente y redirigiendo
 *    al usuario a la pantalla de login cuando el token ha expirado o es invalido.
 *
 * Se registra globalmente en {@link appConfig} mediante `withInterceptors`.
 *
 * @param req  - La peticion HTTP original que sera clonada y modificada.
 * @param next - Funcion que pasa la peticion al siguiente handler de la cadena.
 * @returns Observable de la respuesta HTTP, con manejo de errores 401.
 *
 * @example
 * // Registro en app.config.ts:
 * provideHttpClient(withInterceptors([jwtInterceptor]))
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const token  = auth.token;

  // Endpoints publicos: login y registro no requieren token
  if (!token || req.url.includes('/auth/')) {
    return next(req);
  }

  // Clonar la peticion agregando el header de autorizacion
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq).pipe(
    catchError(err => {
      // Token expirado o invalido: cerrar sesion y redirigir al login
      if (err.status === 401) {
        auth.cerrarSesion();
        router.navigate(['/']);
      }
      return throwError(() => err);
    })
  );
};
