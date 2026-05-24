import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rutas que requieren autenticacion.
 * Si el usuario no esta autenticado, redirige a la ruta raiz `/`.
 *
 * @returns `true` si el usuario esta autenticado, o un `UrlTree` que redirige a `/`.
 */
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.estaLogueado) return true;
  return router.createUrlTree(['/']);
};
