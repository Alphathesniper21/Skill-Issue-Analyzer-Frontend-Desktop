import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { Analisis } from '../models/analisis.model';

export interface EstadisticasAdmin {
  totalUsuarios:  number;
  totalAnalisis:  number;
  solicitudesPendientes: number;
  promedioProblemas: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {

  private readonly urlBase = 'https://gpcueb.org/skillissueanalyzer';

  constructor(private http: HttpClient) {}

  // ── Usuarios ─────────────────────────────────────────────────────────────

  /**
   * Obtiene la lista completa de todos los usuarios registrados en el sistema.
   *
   * @returns Observable que emite un array con todos los {@link Usuario} del sistema.
   */
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.urlBase}/admin/usuarios`);
  }

  /**
   * Elimina permanentemente un usuario del sistema junto con todos sus datos asociados.
   *
   * @param id - Identificador unico del usuario a eliminar.
   * @returns Observable que emite la respuesta en texto plano del backend.
   */
  eliminarUsuario(id: number): Observable<string> {
    return this.http.delete(`${this.urlBase}/admin/usuarios/${id}`, { responseType: 'text' });
  }

  /**
   * Activa o desactiva la cuenta de un usuario sin eliminarla.
   *
   * @param id     - Identificador unico del usuario a modificar.
   * @param activo - `true` para activar la cuenta, `false` para desactivarla.
   * @returns Observable que emite la respuesta en texto plano del backend.
   */
  cambiarEstado(id: number, activo: boolean): Observable<string> {
    return this.http.patch(
      `${this.urlBase}/admin/usuarios/${id}/estado`,
      { activo },
      { responseType: 'text' }
    );
  }

  // ── Solicitudes de Admin ──────────────────────────────────────────────────

  /** Devuelve las solicitudes de cuenta ADMINISTRADOR pendientes de aprobación. */
  getSolicitudesPendientes(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.urlBase}/admin/solicitudes`);
  }

  /** Aprueba una solicitud de admin. Activa la cuenta y le asigna rol ADMINISTRADOR. */
  aprobarSolicitud(id: number): Observable<string> {
    return this.http.post(
      `${this.urlBase}/admin/solicitudes/${id}/aprobar`,
      {},
      { responseType: 'text' }
    );
  }

  /** Rechaza y elimina la solicitud de admin. */
  rechazarSolicitud(id: number): Observable<string> {
    return this.http.post(
      `${this.urlBase}/admin/solicitudes/${id}/rechazar`,
      {},
      { responseType: 'text' }
    );
  }

  // ── Análisis ──────────────────────────────────────────────────────────────

  /**
   * Obtiene la lista completa de todos los analisis realizados en el sistema.
   *
   * @returns Observable que emite un array con todos los {@link Analisis} del sistema.
   */
  getTodosAnalisis(): Observable<Analisis[]> {
    return this.http.get<Analisis[]>(`${this.urlBase}/admin/analisis`);
  }

  // ── Estadísticas ──────────────────────────────────────────────────────────

  /**
   * Obtiene las estadisticas globales del sistema para el dashboard del administrador.
   *
   * @returns Observable que emite el objeto {@link EstadisticasAdmin} con los datos agregados.
   */
  getEstadisticas(): Observable<EstadisticasAdmin> {
    return this.http.get<EstadisticasAdmin>(`${this.urlBase}/admin/estadisticas`);
  }
}
