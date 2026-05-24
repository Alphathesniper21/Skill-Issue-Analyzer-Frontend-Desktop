import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard inverso que protege la ruta de login/registro.
 * Evita que un usuario ya autenticado vea la pantalla de inicio de sesion.
 * - Si no esta autenticado → permite el acceso.
 * - Si es admin → redirige a `/admin`.
 * - Si es usuario normal → redirige a `/dashboard`.
 *
 * @returns `true` si no esta autenticado, o un `UrlTree` de redireccion segun el rol.
 */
export const loginGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.estaLogueado) return true;
  return auth.esAdmin
    ? router.createUrlTree(['/admin'])
    : router.createUrlTree(['/dashboard']);
};
