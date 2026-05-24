/**
 * @fileoverview Componente del panel de usuario autenticado.
 * Permite analizar codigo fuente (ZIP o GitHub) y consultar el historial
 * de analisis previos. Accesible unicamente para usuarios autenticados.
 */

import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { RouterLink }      from '@angular/router';
import { Router }          from '@angular/router';
import { AuthService }     from '../services/auth.service';
import { AnalisisService } from '../services/analisis.service';
import { Analisis, MalaPractica, Severidad, SEVERIDAD_LABEL } from '../models/analisis.model';

/** Pestanas disponibles en el dashboard. */
type Tab = 'analizar' | 'historial';

/** Tipos de alerta para retroalimentacion visual. */
type TipoAlerta = 'error' | 'success' | 'warning';

/** Estructura de una notificacion de alerta en pantalla. */
interface Alerta {
  tipo: TipoAlerta;
  mensaje: string;
}

/**
 * @class Dashboard
 * @description Componente standalone del panel principal del usuario autenticado.
 *
 * Funcionalidades:
 * - **Analisis ZIP**: carga y envia un archivo `.zip` al backend para su analisis.
 * - **Analisis GitHub**: envia la URL de un repositorio publico al backend.
 * - **Historial**: lista y gestiona los analisis previos del usuario.
 * - **Detalle**: visualiza las malas practicas detectadas en un analisis especifico.
 *
 * Utiliza `ChangeDetectorRef` para forzar la deteccion de cambios en modo zoneless.
 */
@Component({
  selector:    'app-dashboard',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls:   ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  private auth     = inject(AuthService);
  private analisis = inject(AnalisisService);
  private router   = inject(Router);
  private cdr      = inject(ChangeDetectorRef);

  /** Pestana activa en el dashboard. */
  tab: Tab = 'analizar';
  /** Alerta activa en pantalla, o `null` si no hay ninguna. */
  alerta: Alerta | null = null;
  /** Referencia al temporizador de autocierre de alertas. */
  private alertaTimer: any;

  // ── Analisis ZIP ──────────────────────────────────────────────────────────
  /** Archivo ZIP seleccionado para analisis, o `null` si no hay ninguno. */
  archivoZip: File | null = null;
  /** Nombre del archivo ZIP seleccionado para mostrar en la UI. */
  nombreArchivo = '';
  /** Indica si hay un analisis ZIP en progreso. */
  analizando = false;
  /** Resultado del ultimo analisis realizado, o `null` si no hay ninguno. */
  resultado: Analisis | null = null;
  /** Indice de la linea de codigo seleccionada en el visor de detalle. */
  lineaSeleccionada: number | null = null;

  /**
   * Maneja el evento de seleccion de archivo en el input de tipo file.
   * Valida que el archivo tenga extension `.zip` antes de asignarlo.
   *
   * @param event - Evento del input file con el archivo seleccionado por el usuario.
   */
  onArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (!file.name.endsWith('.zip')) {
      this.mostrarAlerta('warning', 'Solo se aceptan archivos .zip');
      return;
    }
    this.archivoZip    = file;
    this.nombreArchivo = file.name;
    this.resultado     = null;
    this.cdr.detectChanges();
  }

  /**
   * Envia el archivo ZIP seleccionado al backend para su analisis.
   * Construye un `FormData` con el campo `archivo` y llama a {@link AnalisisService.analizarZip}.
   * Al completarse, refresca el historial automaticamente.
   */
  analizar() {
    if (!this.archivoZip) {
      this.mostrarAlerta('warning', 'Selecciona un archivo .zip antes de analizar.');
      return;
    }
    this.analizando = true;
    this.resultado  = null;
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('archivo', this.archivoZip);

    this.analisis.analizarZip(formData).subscribe({
      next: res => {
        this.resultado  = res;
        this.analizando = false;
        this.cdr.detectChanges();
        this.cargarHistorial();
      },
      error: err => {
        this.mostrarAlerta('error', this.extraerError(err, 'Error al analizar el archivo.'));
        this.analizando = false;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Limpia el estado del panel de analisis ZIP:
   * elimina el archivo seleccionado, el nombre y el resultado previo.
   */
  limpiar() {
    this.archivoZip    = null;
    this.nombreArchivo = '';
    this.resultado     = null;
    this.cdr.detectChanges();
  }

  // ── Historial ─────────────────────────────────────────────────────────────
  /** Lista de analisis del historial del usuario. */
  historial: Analisis[] = [];
  /** Indica si el historial se esta cargando desde el backend. */
  cargandoHistorial = false;
  /** Analisis actualmente en vista de detalle, o `null` si el modal esta cerrado. */
  analisisDetalle: Analisis | null = null;

  /** Nombre de usuario del autenticado, delegado a {@link AuthService}. */
  get username():       string  { return this.auth.username; }
  /** Nombre completo del autenticado, delegado a {@link AuthService}. */
  get nombreCompleto(): string  { return this.auth.nombreCompleto; }
  /** Indica si el usuario autenticado es administrador. */
  get esAdmin():        boolean { return this.auth.esAdmin; }

  /**
   * Ciclo de vida Angular: carga el historial al inicializar el componente.
   */
  ngOnInit() { this.cargarHistorial(); }

  /**
   * Cambia la pestana activa del dashboard y limpia las alertas.
   * Si se cambia a 'historial', recarga los datos desde el backend.
   *
   * @param t - La pestana destino ('analizar' | 'historial').
   */
  cambiarTab(t: Tab) {
    this.tab    = t;
    this.alerta = null;
    if (t === 'historial') this.cargarHistorial();
    this.cdr.detectChanges();
  }

  /**
   * Cierra la sesion del usuario y redirige a la pantalla de login.
   */
  logout() { this.auth.cerrarSesion(); this.router.navigate(['/']); }

  /**
   * Muestra una alerta de feedback con autocierre despues de `duracion` ms.
   *
   * @param tipo    - Categoria visual de la alerta.
   * @param mensaje - Mensaje a mostrar al usuario.
   * @param duracion - Tiempo en milisegundos antes del autocierre (por defecto 4500ms).
   * @private
   */
  private mostrarAlerta(tipo: TipoAlerta, mensaje: string, duracion = 4500) {
    if (this.alertaTimer) clearTimeout(this.alertaTimer);
    this.alerta = { tipo, mensaje };
    this.cdr.detectChanges();
    this.alertaTimer = setTimeout(() => {
      this.alerta = null;
      this.cdr.detectChanges();
    }, duracion);
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
    if (err.status === 401) return 'Sesion expirada. Inicia sesion de nuevo.';
    if (err.status === 0)   return 'No se puede conectar al servidor.';
    return fallback;
  }

  /**
   * Carga el historial de analisis del usuario autenticado desde el backend.
   * Actualiza `historial` y gestiona el estado de carga.
   */
  cargarHistorial() {
    this.cargandoHistorial = true;
    this.cdr.detectChanges();

    this.analisis.getMisAnalisis().subscribe({
      next:  res => {
        this.historial         = res;
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.mostrarAlerta('error', this.extraerError(err, 'Error al cargar historial.'));
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Abre el modal de detalle para el analisis indicado.
   *
   * @param a - El objeto {@link Analisis} a mostrar en detalle.
   */
  verDetalle(a: Analisis) { this.analisisDetalle = a; this.cdr.detectChanges(); }

  /**
   * Cierra el modal de detalle del analisis.
   */
  cerrarDetalle() { this.analisisDetalle = null; this.cdr.detectChanges(); }

  /**
   * Solicita confirmacion al usuario y elimina el analisis indicado del historial.
   * Detiene la propagacion del evento para evitar abrir el detalle al eliminar.
   *
   * @param a  - El {@link Analisis} a eliminar.
   * @param ev - Evento del click, detenido para evitar propagacion al padre.
   */
  eliminar(a: Analisis, ev: Event) {
    ev.stopPropagation();
    if (!confirm(`Eliminar el analisis #${a.id}?`)) return;
    this.analisis.eliminar(a.id).subscribe({
      next: () => {
        this.historial = this.historial.filter(x => x.id !== a.id);
        if (this.analisisDetalle?.id === a.id) this.analisisDetalle = null;
        this.mostrarAlerta('success', 'Analisis eliminado.');
        this.cdr.detectChanges();
      },
      error: err => this.mostrarAlerta('error', this.extraerError(err, 'Error al eliminar.')),
    });
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  /**
   * Convierte un valor de severidad al label legible para el usuario.
   *
   * @param s - Valor de {@link Severidad} a convertir.
   * @returns Label de texto en espanol (ej. "Alta", "Media", "Baja").
   */
  severidadLabel(s: Severidad): string { return SEVERIDAD_LABEL[s]; }

  /**
   * Devuelve la clase CSS correspondiente al puntaje de skill issues del analisis.
   * Permite colorear el indicador de score segun su nivel de criticidad.
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

  /**
   * Devuelve un mensaje descriptivo con emoji segun el nivel del score del analisis.
   *
   * @param score - Puntaje numerico del analisis (0-100+).
   * @returns Mensaje descriptivo del nivel de calidad del codigo analizado.
   */
  scoreMsg(score: number): string {
    if (score >= 70) return 'Certified disaster 🔥';
    if (score >= 40) return 'Significant skill issues 😬';
    if (score >= 15) return 'Some issues found 🤔';
    return 'Looking clean! ✨';
  }

  /**
   * Filtra una lista de malas practicas por su nivel de severidad.
   *
   * @param lista - Array completo de {@link MalaPractica} a filtrar.
   * @param s     - Nivel de {@link Severidad} por el que filtrar.
   * @returns Subconjunto del array que coincide con la severidad indicada.
   */
  porSeveridad(lista: MalaPractica[], s: Severidad): MalaPractica[] {
    return lista.filter(p => p.severidad === s);
  }

  /**
   * Genera una vista previa truncada del fragmento de codigo de una mala practica.
   * Si el codigo supera 120 caracteres, se muestra solo los primeros 120 seguidos de '...'.
   *
   * @param codigo - Fragmento de codigo fuente a previsualizar, puede ser nulo o indefinido.
   * @returns Cadena de texto con la vista previa del codigo, o '(sin vista previa)' si esta vacio.
   */
  previsualizarCodigo(codigo: string | null | undefined): string {
    if (!codigo) return '(sin vista previa)';
    return codigo.length > 120 ? codigo.slice(0, 120) + '...' : codigo;
  }

  /**
   * Formatea una fecha ISO 8601 al formato legible en espanol: "dd mmm yyyy, hh:mm".
   *
   * @param iso - Cadena de fecha en formato ISO 8601 (ej. "2026-05-24T10:30:00").
   * @returns Fecha formateada para mostrar en la interfaz de usuario.
   */
  formatearFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ── GitHub ────────────────────────────────────────────────────────────────
  /** Tipo de entrada activo en el panel de analisis: archivo ZIP o URL de GitHub. */
  tipoInput: 'zip' | 'github' = 'zip';
  /** URL del repositorio de GitHub ingresada por el usuario. */
  repoUrl = '';
  /** Indica si hay un analisis de repositorio GitHub en progreso. */
  analizandoGithub = false;

  /**
   * Cambia el tipo de entrada del panel de analisis entre 'zip' y 'github'.
   * Limpia el resultado previo y las alertas activas.
   *
   * @param tipo - El tipo de entrada a activar ('zip' | 'github').
   */
  cambiarTipoInput(tipo: 'zip' | 'github') {
    this.tipoInput = tipo;
    this.resultado = null;
    this.alerta    = null;
    this.cdr.detectChanges();
  }

  /**
   * Valida la URL ingresada y envia la solicitud de analisis del repositorio GitHub al backend.
   * Validaciones del cliente:
   * - La URL no debe estar vacia.
   * - La URL debe comenzar con 'https://github.com/'.
   *
   * Al completarse, refresca el historial automaticamente.
   */
  analizarGithub() {
    if (!this.repoUrl.trim()) {
      this.mostrarAlerta('warning', 'Ingresa la URL del repositorio.');
      return;
    }
    if (!this.repoUrl.startsWith('https://github.com/')) {
      this.mostrarAlerta('warning', 'Solo se aceptan URLs de GitHub: https://github.com/owner/repo');
      return;
    }
    this.analizandoGithub = true;
    this.resultado        = null;
    this.cdr.detectChanges();

    this.analisis.analizarGithub(this.repoUrl).subscribe({
      next: res => {
        this.resultado        = res;
        this.analizandoGithub = false;
        this.cdr.detectChanges();
        this.cargarHistorial();
      },
      error: err => {
        this.mostrarAlerta('error', this.extraerError(err, 'Error al analizar el repositorio.'));
        this.analizandoGithub = false;
        this.cdr.detectChanges();
      },
    });
  }
}
