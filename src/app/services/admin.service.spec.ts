import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AdminService } from './admin.service';
import { Usuario } from '../models/usuario.model';
import { Analisis } from '../models/analisis.model';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;
  const BASE = 'http://localhost:8081';

  const mockUsuario: Usuario = {
    id: 1,
    username: 'admin',
    nombreCompleto: 'Admin User',
    email: 'admin@test.com',
    rol: 'ADMINISTRADOR',
    activo: true,
    estadoSolicitud: null,
    fechaCreacion: '2024-01-01',
  };

  const mockAnalisis: Analisis = {
    id: 10,
    codigoFuente: 'Main.java',
    fechaAnalisis: '2024-06-01',
    nombreUsuarioAutor: 'dev',
    malasPracticas: [],
    totalProblemas: 0,
    puntuacion: 100,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AdminService],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debería crearse', () => expect(service).toBeTruthy());

  describe('getUsuarios', () => {
    it('debería hacer GET /admin/usuarios', () => {
      service.getUsuarios().subscribe(res => expect(res).toEqual([mockUsuario]));
      const req = httpMock.expectOne(`${BASE}/admin/usuarios`);
      expect(req.request.method).toBe('GET');
      req.flush([mockUsuario]);
    });
  });

  describe('eliminarUsuario', () => {
    it('debería hacer DELETE /admin/usuarios/:id', () => {
      service.eliminarUsuario(1).subscribe(res => expect(res).toBe('ok'));
      const req = httpMock.expectOne(`${BASE}/admin/usuarios/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush('ok');
    });
  });

  describe('cambiarEstado', () => {
    it('debería hacer PATCH con el estado correcto', () => {
      service.cambiarEstado(1, false).subscribe();
      const req = httpMock.expectOne(`${BASE}/admin/usuarios/1/estado`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ activo: false });
      req.flush('ok');
    });
  });

  describe('getSolicitudesPendientes', () => {
    it('debería hacer GET /admin/solicitudes', () => {
      service.getSolicitudesPendientes().subscribe(res => expect(res).toEqual([]));
      const req = httpMock.expectOne(`${BASE}/admin/solicitudes`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('aprobarSolicitud', () => {
    it('debería hacer POST /admin/solicitudes/:id/aprobar', () => {
      service.aprobarSolicitud(5).subscribe();
      const req = httpMock.expectOne(`${BASE}/admin/solicitudes/5/aprobar`);
      expect(req.request.method).toBe('POST');
      req.flush('aprobado');
    });
  });

  describe('rechazarSolicitud', () => {
    it('debería hacer POST /admin/solicitudes/:id/rechazar', () => {
      service.rechazarSolicitud(5).subscribe();
      const req = httpMock.expectOne(`${BASE}/admin/solicitudes/5/rechazar`);
      expect(req.request.method).toBe('POST');
      req.flush('rechazado');
    });
  });

  describe('getTodosAnalisis', () => {
    it('debería hacer GET /admin/analisis', () => {
      service.getTodosAnalisis().subscribe(res => expect(res).toEqual([mockAnalisis]));
      const req = httpMock.expectOne(`${BASE}/admin/analisis`);
      expect(req.request.method).toBe('GET');
      req.flush([mockAnalisis]);
    });
  });

  describe('getEstadisticas', () => {
    it('debería hacer GET /admin/estadisticas', () => {
      const stats = { totalUsuarios: 5, totalAnalisis: 10, solicitudesPendientes: 2, promedioProblemas: 3.5 };
      service.getEstadisticas().subscribe(res => expect(res).toEqual(stats));
      const req = httpMock.expectOne(`${BASE}/admin/estadisticas`);
      expect(req.request.method).toBe('GET');
      req.flush(stats);
    });
  });
});
