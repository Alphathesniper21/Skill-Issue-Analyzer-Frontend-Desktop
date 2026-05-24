import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rutas exclusivas para administradores.
 * - Si es admin → permite el acceso.
 * - Si esta autenticado pero no es admin → redirige a `/dashboard`.
 * - Si no esta autenticado → redirige a `/`.
 *
 * @returns `true` si es admin, o un `UrlTree` de redireccion segun el estado de sesion.
 */
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.esAdmin) return true;
  if (auth.estaLogueado) return router.createUrlTree(['/dashboard']);
  return router.createUrlTree(['/']);
};
