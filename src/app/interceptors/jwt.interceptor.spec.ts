import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authSpy: jasmine.SpyObj<AuthService>;
  const routerSpy = { navigate: jasmine.createSpy('navigate') };

  function setup(token: string | null) {
    authSpy = jasmine.createSpyObj('AuthService', ['cerrarSesion'], { token });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('debería adjuntar el header Authorization cuando hay token', () => {
    setup('mi-jwt-token');
    http.get('/api/datos').subscribe();
    const req = httpMock.expectOne('/api/datos');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mi-jwt-token');
    req.flush({});
  });

  it('NO debería adjuntar header si no hay token', () => {
    setup(null);
    http.get('/api/datos').subscribe();
    const req = httpMock.expectOne('/api/datos');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('NO debería adjuntar header en endpoints /auth/', () => {
    setup('mi-jwt-token');
    http.post('/auth/login', {}).subscribe();
    const req = httpMock.expectOne('/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('debería cerrar sesión y redirigir a / ante un 401', () => {
    setup('mi-jwt-token');
    http.get('/api/datos').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/datos');
    req.flush('No autorizado', { status: 401, statusText: 'Unauthorized' });
    expect(authSpy.cerrarSesion).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });
});
