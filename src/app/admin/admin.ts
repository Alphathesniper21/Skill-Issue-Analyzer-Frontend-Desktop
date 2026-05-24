/**
 * @fileoverview Componente del panel de administracion del sistema.
 * Centraliza la gestion de usuarios, solicitudes de admin, analisis globales
 * y estadisticas del sistema. Solo accesible para usuarios con rol ADMIN.
 */

import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { Router }         from '@angular/router';
import { AuthService }    from '../services/auth.service';
import { AdminService, EstadisticasAdmin } from '../services/admin.service';
import { Usuario, labelRol } from '../models/usuario.model';
import { Analisis }       from '../models/analisis.model';

/** Pestanas disponibles en el panel de administracion. */
type Tab = 'overview' | 'usuarios' | 'solicitudes' | 'analisis';

/** Tipos de alerta para retroalimentacion visual. */
type TipoAlerta = 'error' | 'success' | 'warning';

/** Estructura de una notificacion de alerta en pantalla. */
interface Alerta {
  tipo: TipoAlerta;
  mensaje: string;
}

/**
 * @class AdminPanel
 * @description Componente standalone del panel de administracion.
 *
 * Funcionalidades:
 * - **Overview**: estadisticas globales del sistema (usuarios, analisis, pendientes, promedio).
 * - **Usuarios**: listado con filtro, activacion/desactivacion y eliminacion de cuentas.
 * - **Solicitudes**: revision y aprobacion/rechazo de solicitudes de rol administrador.
 * - **Analisis**: visualizacion de todos los analisis realizados en el sistema.
 *
 * Utiliza `ChangeDetectorRef` para forzar la deteccion de cambios en modo zoneless.
 */
@Component({
  selector:    'app-admin',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls:   ['./admin.css'],
})
export class AdminPanel implements OnInit {
  private auth   = inject(AuthService);
  private admin  = inject(AdminService);
  private router = inject(Router);
  private cdr    = inject(ChangeDetectorRef);

  /** Pestana activa en el panel. */
  tab: Tab = 'overview';
  /** Alerta activa en pantalla, o `null` si no hay ninguna. */
  alerta: Alerta | null = null;
  /** Referencia al temporizador de autocierre de alertas. */
  private alertaTimer: any;

  // ── Data ──────────────────────────────────────────────────────────────────
  /** Estadisticas globales del sistema, o `null` mientras se cargan. */
  estadisticas:  EstadisticasAdmin | null = null;
  /** Lista de todos los usuarios registrados en el sistema. */
  usuarios:      Usuario[] = [];
  /** Lista de solicitudes de rol administrador pendientes de revision. */
  solicitudes:   Usuario[] = [];
  /** Lista de todos los analisis realizados en el sistema. */
  analisis:      Analisis[] = [];

  // ── Loading ───────────────────────────────────────────────────────────────
  /** Indica si las estadisticas se estan cargando. */
  cargandoStats       = false;
  /** Indica si la lista de usuarios se esta cargando. */
  cargandoUsuarios    = false;
  /** Indica si las solicitudes se estan cargando. */
  cargandoSolicitudes = false;
  /** Indica si los analisis se estan cargando. */
  cargandoAnalisis    = false;

  // ── Filtro ────────────────────────────────────────────────────────────────
  /** Texto ingresado en el campo de filtro de la tabla de usuarios. */
  filtroUsuario = '';

  /**
   * Devuelve la lista de usuarios filtrada por el texto en `filtroUsuario`.
   * Busca coincidencias en username, nombre y correo (sin distincion de mayusculas).
   *
   * @returns Array de {@link Usuario} que coinciden con el filtro, o todos si el filtro esta vacio.
   */
  get usuariosFiltrados(): Usuario[] {
    const q = this.filtroUsuario.toLowerCase();
    return q
      ? this.usuarios.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.nombre.toLowerCase().includes(q) ||
        u.correo.toLowerCase().includes(q))
      : this.usuarios;
  }

  /** Nombre de usuario del admin autenticado, delegado a {@link AuthService}. */
  get username():       string { return this.auth.username; }
  /** Nombre completo del admin autenticado, delegado a {@link AuthService}. */
  get nombreCompleto(): string { return this.auth.nombreCompleto; }

  /** Funcion utilitaria para convertir el rol a label legible en la plantilla. */
  labelRol = labelRol;

  /**
   * Ciclo de vida Angular: carga todos los datos del panel al inicializar.
   */
  ngOnInit() { this.cargarTodo(); }

  /**
   * Cambia la pestana activa del panel y limpia las alertas.
   *
   * @param t - La pestana destino ('overview' | 'usuarios' | 'solicitudes' | 'analisis').
   */
  cambiarTab(t: Tab) {
    this.tab    = t;
    this.alerta = null;
    this.cdr.detectChanges();
  }

  /**
   * Cierra la sesion del administrador y redirige a la pantalla de login.
   */
  logout() { this.auth.cerrarSesion(); this.router.navigate(['/']); }

  // ── Alertas ───────────────────────────────────────────────────────────────

  /**
   * Muestra una alerta de feedback con autocierre a los 4500ms.
   *
   * @param tipo    - Categoria visual de la alerta.
   * @param mensaje - Mensaje a mostrar al usuario.
   * @private
   */
  private mostrarAlerta(tipo: TipoAlerta, mensaje: string) {
    if (this.alertaTimer) clearTimeout(this.alertaTimer);
    this.alerta = { tipo, mensaje };
    this.cdr.detectChanges();
    this.alertaTimer = setTimeout(() => {
      this.alerta = null;
      this.cdr.detectChanges();
    }, 4500);
  }

  /**
   * Extrae el mensaje de error mas descriptivo de una respuesta HTTP fallida.
   *
   * @param err      - Objeto de error HTTP de Angular.
   * @param fallback - Mensaje de reserva si no se puede extraer uno especifico.
   * @returns Mensaje de error legible para el usuario.
   * @private
   */
  private extraerError(err: any, fallback: string): string {
    if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();
    if (err.error?.message) return err.error.message;
    if (err.status === 0) return 'No se puede conectar al servidor.';
    return fallback;
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  /**
   * Dispara la carga de todas las secciones del panel en paralelo:
   * estadisticas, usuarios, solicitudes y analisis.
   */
  cargarTodo() {
    this.cargarEstadisticas();
    this.cargarUsuarios();
    this.cargarSolicitudes();
    this.cargarAnalisis();
  }

  /**
   * Carga las estadisticas globales del sistema desde el backend.
   * Actualiza `estadisticas` y el estado de carga `cargandoStats`.
   */
  cargarEstadisticas() {
    this.cargandoStats = true;
    this.cdr.detectChanges();
    this.admin.getEstadisticas().subscribe({
      next:  r => { this.estadisticas = r; this.cargandoStats = false; this.cdr.detectChanges(); },
      error: _ => { this.cargandoStats = false; this.cdr.detectChanges(); },
    });
  }

  /**
   * Carga la lista de todos los usuarios registrados en el sistema.
   * Actualiza `usuarios` y el estado de carga `cargandoUsuarios`.
   */
  cargarUsuarios() {
    this.cargandoUsuarios = true;
    this.cdr.detectChanges();
    this.admin.getUsuarios().subscribe({
      next:  r   => { this.usuarios = r; this.cargandoUsuarios = false; this.cdr.detectChanges(); },
      error: err => {
        this.mostrarAlerta('error', this.extraerError(err, 'Error al cargar usuarios.'));
        this.cargandoUsuarios = false;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Carga las solicitudes de rol administrador pendientes de revision.
   * Actualiza `solicitudes` y el estado de carga `cargandoSolicitudes`.
   */
  cargarSolicitudes() {
    this.cargandoSolicitudes = true;
    this.cdr.detectChanges();
    this.admin.getSolicitudesPendientes().subscribe({
      next:  r   => { this.solicitudes = r; this.cargandoSolicitudes = false; this.cdr.detectChanges(); },
      error: err => {
        this.mostrarAlerta('error', this.extraerError(err, 'Error al cargar solicitudes.'));
        this.cargandoSolicitudes = false;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Carga todos los analisis realizados en el sistema (de todos los usuarios).
   * Actualiza `analisis` y el estado de carga `cargandoAnalisis`.
   */
  cargarAnalisis() {
    this.cargandoAnalisis = true;
    this.cdr.detectChanges();
    this.admin.getTodosAnalisis().subscribe({
      next:  r => { this.analisis = r; this.cargandoAnalisis = false; this.cdr.detectChanges(); },
      error: _ => { this.cargandoAnalisis = false; this.cdr.detectChanges(); },
    });
  }

  // ── Acciones sobre usuarios ───────────────────────────────────────────────

  /**
   * Alterna el estado activo/inactivo de un usuario.
   * Actualiza el estado localmente sin recargar la lista completa.
   * Refresca las estadisticas tras el cambio.
   *
   * @param u - El {@link Usuario} cuyo estado se va a cambiar.
   */
  toggleEstado(u: Usuario) {
    const nuevoEstado = !u.activo;
    this.admin.cambiarEstado(u.id, nuevoEstado).subscribe({
      next: () => {
        u.activo = nuevoEstado;
        this.mostrarAlerta('success',
          `Usuario ${u.username} ${nuevoEstado ? 'activado' : 'desactivado'}.`);
        this.cargarEstadisticas();
        this.cdr.detectChanges();
      },
      error: err => this.mostrarAlerta('error', this.extraerError(err, 'Error al cambiar estado.')),
    });
  }

  /**
   * Solicita confirmacion y elimina permanentemente un usuario del sistema.
   * Actualiza la lista local filtrando el usuario eliminado y refresca las estadisticas.
   *
   * @param u - El {@link Usuario} a eliminar.
   */
  eliminarUsuario(u: Usuario) {
    if (!confirm(`Eliminar permanentemente a ${u.username}?`)) return;
    this.admin.eliminarUsuario(u.id).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter(x => x.id !== u.id);
        this.mostrarAlerta('success', `Usuario ${u.username} eliminado.`);
        this.cargarEstadisticas();
        this.cdr.detectChanges();
      },
      error: err => this.mostrarAlerta('error', this.extraerError(err, 'Error al eliminar usuario.')),
    });
  }

  // ── Acciones sobre solicitudes ────────────────────────────────────────────

  /**
   * Aprueba la solicitud de administrador del usuario indicado.
   * Activa su cuenta, le asigna el rol ADMINISTRADOR y la remueve de la lista de solicitudes.
   * Refresca las estadisticas y la lista de usuarios.
   *
   * @param s - El {@link Usuario} solicitante a aprobar.
   */
  aprobar(s: Usuario) {
    this.admin.aprobarSolicitud(s.id).subscribe({
      next: () => {
        this.solicitudes = this.solicitudes.filter(x => x.id !== s.id);
        this.mostrarAlerta('success', `Solicitud de ${s.username} aprobada.`);
        this.cargarEstadisticas();
        this.cargarUsuarios();
        this.cdr.detectChanges();
      },
      error: err => this.mostrarAlerta('error', this.extraerError(err, 'Error al aprobar.')),
    });
  }

  /**
   * Solicita confirmacion y rechaza la solicitud de administrador del usuario indicado.
   * Elimina al solicitante del sistema y lo remueve de la lista de solicitudes.
   * Refresca las estadisticas.
   *
   * @param s - El {@link Usuario} solicitante a rechazar.
   */
  rechazar(s: Usuario) {
    if (!confirm(`Rechazar y eliminar la solicitud de ${s.username}?`)) return;
    this.admin.rechazarSolicitud(s.id).subscribe({
      next: () => {
        this.solicitudes = this.solicitudes.filter(x => x.id !== s.id);
        this.mostrarAlerta('success', `Solicitud de ${s.username} rechazada.`);
        this.cargarEstadisticas();
        this.cdr.detectChanges();
      },
      error: err => this.mostrarAlerta('error', this.extraerError(err, 'Error al rechazar.')),
    });
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  /**
   * Formatea una fecha ISO 8601 al formato legible en espanol: "dd mmm yyyy".
   *
   * @param iso - Cadena de fecha en formato ISO 8601 (ej. "2026-05-24T10:30:00").
   * @returns Fecha formateada para mostrar en tablas del panel de administracion.
   */
  formatearFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  /**
   * Devuelve la clase CSS correspondiente al puntaje de skill issues de un analisis.
   *
   * @param score - Puntaje numerico del analisis (0-100+).
   * @returns Nombre de la clase CSS: 'score--critical', 'score--high', 'score--medium' o 'score--ok'.
   */
  scoreClass(score: number): string {
    if (score >= 70) return 'score--critical';
    if (score >= 40) return 'score--high';
    if (score >= 15) return 'score--medium';
    return 'score--ok';
  }
}
