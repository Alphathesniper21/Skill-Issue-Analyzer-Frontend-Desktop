import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { AuthResponseModel } from '../models/auth-response.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockResponse: AuthResponseModel = {
    token: 'mock-token',
    username: 'testuser',
    nombreCompleto: 'Test User',
    rol: 'USUARIO',
  };

  beforeEach(() => {
    // Limpiamos localStorage para no tocar tokens reales
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem').and.stub();
    spyOn(localStorage, 'removeItem').and.stub();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('estaLogueado debería ser false si no hay sesión', () => {
    expect(service.estaLogueado).toBeFalse();
  });

  it('esAdmin debería ser false sin sesión', () => {
    expect(service.esAdmin).toBeFalse();
  });

  it('token debería ser null sin sesión', () => {
    expect(service.token).toBeNull();
  });

  it('username y nombreCompleto deberían ser cadena vacía sin sesión', () => {
    expect(service.username).toBe('');
    expect(service.nombreCompleto).toBe('');
  });

  describe('guardarSesion', () => {
    it('debería activar estaLogueado tras guardar sesión', () => {
      service.guardarSesion(mockResponse);
      expect(service.estaLogueado).toBeTrue();
    });

    it('debería exponer el token correcto', () => {
      service.guardarSesion(mockResponse);
      expect(service.token).toBe('mock-token');
    });

    it('debería exponer el username correcto', () => {
      service.guardarSesion(mockResponse);
      expect(service.username).toBe('testuser');
    });

    it('esAdmin debería ser false para rol USUARIO', () => {
      service.guardarSesion(mockResponse);
      expect(service.esAdmin).toBeFalse();
    });

    it('esAdmin debería ser true para rol ADMINISTRADOR', () => {
      service.guardarSesion({ ...mockResponse, rol: 'ADMINISTRADOR' });
      expect(service.esAdmin).toBeTrue();
    });
  });

  describe('cerrarSesion', () => {
    it('debería limpiar la sesión', () => {
      service.guardarSesion(mockResponse);
      service.cerrarSesion();
      expect(service.estaLogueado).toBeFalse();
      expect(service.token).toBeNull();
    });
  });

  describe('postLogin', () => {
    it('debería hacer POST a /auth/login', () => {
      service.postLogin('user', 'pass').subscribe();
      const req = httpMock.expectOne('http://localhost:8081/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'user', contrasena: 'pass' });
      req.flush(mockResponse);
    });
  });

  describe('postRegistro', () => {
    it('debería hacer POST a /auth/registro', () => {
      const dto = {
        username: 'nuevo',
        contrasena: '1234',
        nombreCompleto: 'Nuevo',
        email: 'nuevo@test.com',
        rol: 'USUARIO' as const,
      };
      service.postRegistro(dto).subscribe();
      const req = httpMock.expectOne('http://localhost:8081/auth/registro');
      expect(req.request.method).toBe('POST');
      req.flush('ok');
    });
  });
});
