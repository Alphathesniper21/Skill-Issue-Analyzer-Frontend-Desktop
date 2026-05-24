import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AnalisisService } from './analisis.service';
import { Analisis } from '../models/analisis.model';

describe('AnalisisService', () => {
  let service: AnalisisService;
  let httpMock: HttpTestingController;
  const BASE = 'http://localhost:8081';

  const mockAnalisis: Analisis = {
    id: 1,
    codigoFuente: 'App.java',
    fechaAnalisis: '2024-06-01',
    nombreUsuarioAutor: 'dev',
    malasPracticas: [
      { linea: 10, tipo: 'Magic Number', descripcion: 'Uso de número mágico', severidad: 'BAJA', sugerencia: 'Usa constantes' },
    ],
    totalProblemas: 1,
    puntuacion: 80,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AnalisisService],
    });
    service = TestBed.inject(AnalisisService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debería crearse', () => expect(service).toBeTruthy());

  describe('analizarZip', () => {
    it('debería hacer POST /analisis/zip con FormData', () => {
      const formData = new FormData();
      service.analizarZip(formData).subscribe(res => expect(res).toEqual(mockAnalisis));
      const req = httpMock.expectOne(`${BASE}/analisis/zip`);
      expect(req.request.method).toBe('POST');
      req.flush(mockAnalisis);
    });
  });

  describe('analizarGithub', () => {
    it('debería hacer POST /analisis/github con parámetro repoUrl', () => {
      service.analizarGithub('https://github.com/user/repo').subscribe();
      const req = httpMock.expectOne(r => r.url === `${BASE}/analisis/github`);
      expect(req.request.method).toBe('POST');
      expect(req.request.params.get('repoUrl')).toBe('https://github.com/user/repo');
      req.flush(mockAnalisis);
    });
  });

  describe('getMisAnalisis', () => {
    it('debería hacer GET /analisis', () => {
      service.getMisAnalisis().subscribe(res => expect(res.length).toBe(1));
      const req = httpMock.expectOne(`${BASE}/analisis`);
      expect(req.request.method).toBe('GET');
      req.flush([mockAnalisis]);
    });
  });

  describe('getById', () => {
    it('debería hacer GET /analisis/:id', () => {
      service.getById(1).subscribe(res => expect(res.id).toBe(1));
      const req = httpMock.expectOne(`${BASE}/analisis/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAnalisis);
    });
  });

  describe('eliminar', () => {
    it('debería hacer DELETE /analisis/:id', () => {
      service.eliminar(1).subscribe(res => expect(res).toBe('eliminado'));
      const req = httpMock.expectOne(`${BASE}/analisis/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush('eliminado');
    });
  });
});
