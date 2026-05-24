import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { adminGuard } from './admin.guard';
import { loginGuard } from './login.guard';

const fakeRoute = {} as ActivatedRouteSnapshot;
const fakeState = {} as RouterStateSnapshot;

const mockRouter = {
  createUrlTree: (commands: any[]) => commands as unknown as UrlTree,
  navigate: jasmine.createSpy('navigate'),
};

// ── authGuard ────────────────────────────────────────────────────────────────
describe('authGuard', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthService', [], { estaLogueado: false, esAdmin: false, token: null });
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('debería permitir acceso si el usuario está logueado', () => {
    // ASÍ SE CAMBIA EN JASMINE COMPATIBLE CON FIREFOX:
    (Object.getOwnPropertyDescriptor(authSpy, 'estaLogueado')?.get as jasmine.Spy).and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(fakeRoute, fakeState));
    expect(result).toBeTrue();
  });

  it('debería redirigir a / si no está logueado', () => {
    (Object.getOwnPropertyDescriptor(authSpy, 'estaLogueado')?.get as jasmine.Spy).and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard(fakeRoute, fakeState));
    expect(result).toEqual(['/'] as any);
  });
});

// ── adminGuard ───────────────────────────────────────────────────────────────
describe('adminGuard', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthService', [], { estaLogueado: false, esAdmin: false });
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('debería permitir acceso si es admin', () => {
    (Object.getOwnPropertyDescriptor(authSpy, 'esAdmin')?.get as jasmine.Spy).and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => adminGuard(fakeRoute, fakeState));
    expect(result).toBeTrue();
  });

  it('debería redirigir a /dashboard si está logueado pero no es admin', () => {
    (Object.getOwnPropertyDescriptor(authSpy, 'esAdmin')?.get as jasmine.Spy).and.returnValue(false);
    (Object.getOwnPropertyDescriptor(authSpy, 'estaLogueado')?.get as jasmine.Spy).and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => adminGuard(fakeRoute, fakeState));
    expect(result).toEqual(['/dashboard'] as any);
  });

  it('debería redirigir a / si no está logueado', () => {
    (Object.getOwnPropertyDescriptor(authSpy, 'esAdmin')?.get as jasmine.Spy).and.returnValue(false);
    (Object.getOwnPropertyDescriptor(authSpy, 'estaLogueado')?.get as jasmine.Spy).and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => adminGuard(fakeRoute, fakeState));
    expect(result).toEqual(['/'] as any);
  });
});

// ── loginGuard ───────────────────────────────────────────────────────────────
describe('loginGuard', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthService', [], { estaLogueado: false, esAdmin: false });
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('debería permitir acceso a / si no está logueado', () => {
    (Object.getOwnPropertyDescriptor(authSpy, 'estaLogueado')?.get as jasmine.Spy).and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => loginGuard(fakeRoute, fakeState));
    expect(result).toBeTrue();
  });

  it('debería redirigir a /admin si está logueado como admin', () => {
    (Object.getOwnPropertyDescriptor(authSpy, 'estaLogueado')?.get as jasmine.Spy).and.returnValue(true);
    (Object.getOwnPropertyDescriptor(authSpy, 'esAdmin')?.get as jasmine.Spy).and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => loginGuard(fakeRoute, fakeState));
    expect(result).toEqual(['/admin'] as any);
  });

  it('debería redirigir a /dashboard si está logueado como usuario normal', () => {
    (Object.getOwnPropertyDescriptor(authSpy, 'estaLogueado')?.get as jasmine.Spy).and.returnValue(true);
    (Object.getOwnPropertyDescriptor(authSpy, 'esAdmin')?.get as jasmine.Spy).and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => loginGuard(fakeRoute, fakeState));
    expect(result).toEqual(['/dashboard'] as any);
  });
});
