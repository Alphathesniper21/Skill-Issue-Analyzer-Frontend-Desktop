/**
 * @fileoverview Componente de la pantalla de inicio (login / registro).
 * Es la unica ruta publica de la aplicacion, protegida por {@link LoginGuard}
 * para redirigir al usuario autenticado a su panel correspondiente.
 */

import { Component, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { Router }        from '@angular/router';
import { AuthService }   from '../services/auth.service';
import { Rol }           from '../models/usuario.model';

/** Modos de visualizacion del formulario de la pantalla de inicio. */
type Modo = 'login' | 'registro';

/** Tipos de alerta para retroalimentacion visual al usuario. */
type TipoAlerta = 'error' | 'success' | 'warning' | 'info';

/** Estructura de una notificacion de alerta en pantalla. */
interface Alerta {
  /** Categoria visual de la alerta. */
  tipo: TipoAlerta;
  /** Mensaje principal de la alerta. */
  mensaje: string;
  /** Texto adicional opcional para detalles extra. */
  detalle?: string;
}

/**
 * @class Home
 * @description Componente standalone que renderiza el formulario de login
 * y el formulario de registro en la ruta raiz (`/`).
 *
 * Gestiona:
 * - Cambio entre los modos login y registro.
 * - Validaciones del lado del cliente antes de enviar al backend.
 * - Alertas de feedback con autocierre para notificaciones no criticas.
 * - Redireccion post-login segun el rol del usuario (ADMIN → /admin, USUARIO → /dashboard).
 */
@Component({
  selector:    'app-home',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls:   ['./home.css'],
})
export class Home {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private cdr    = inject(ChangeDetectorRef);

  /** Modo activo del formulario: 'login' o 'registro'. */
  modo: Modo = 'login';
  /** Indica si hay una peticion HTTP en curso para deshabilitar el formulario. */
  cargando = false;
  /** Alerta activa en pantalla, o `null` si no hay ninguna. */
  alerta: Alerta | null = null;
  /** Referencia al temporizador de autocierre de alertas. */
  private alertaTimer: any = null;

  // ── Campos del formulario de login ────────────────────────────────────
  loginUsername   = '';
  loginContrasena = '';
  mostrarPassLogin = false;

  // ── Campos del formulario de registro ────────────────────────────────
  regUsername       = '';
  regContrasena     = '';
  regNombreCompleto = '';
  regEmail          = '';
  regRol: Rol       = 'USUARIO';
  mostrarPassReg    = false;

  /**
   * Indica si el rol seleccionado en el registro es ADMIN.
   * Usado en la plantilla para mostrar advertencias sobre la aprobacion manual.
   *
   * @returns `true` si el rol seleccionado es 'ADMIN'.
   */
  get esRegistroAdmin(): boolean { return this.regRol === 'ADMIN'; }

  /**
   * Cambia el modo del formulario entre 'login' y 'registro',
   * limpiando las alertas y los campos del formulario previo.
   *
   * @param m - El nuevo modo a activar ('login' | 'registro').
   */
  cambiarModo(m: Modo) {
    this.modo   = m;
    this.alerta = null;
    this.limpiarCampos();
  }

  /**
   * Descarta manualmente la alerta activa en pantalla.
   */
  cerrarAlerta() { this.alerta = null; }

  /**
   * Muestra una alerta de feedback al usuario y programa su autocierre
   * para alertas de tipo 'success' e 'info'.
   *
   * @param tipo    - Categoria visual de la alerta.
   * @param mensaje - Mensaje principal a mostrar.
   * @param detalle - Texto adicional opcional (ej. instrucciones extra).
   * @private
   */
  private mostrarAlerta(tipo: TipoAlerta, mensaje: string, detalle?: string) {
    if (this.alertaTimer) clearTimeout(this.alertaTimer);
    this.alerta = { tipo, mensaje, detalle };
    this.cdr.detectChanges();
    if (tipo === 'success' || tipo === 'info') {
      this.alertaTimer = setTimeout(() => {
        this.alerta = null;
        this.cdr.detectChanges();
      }, 5500);
    }
  }

  /**
   * Extrae el mensaje de error mas descriptivo posible de una respuesta HTTP fallida.
   * Prioriza el cuerpo de texto del backend sobre mensajes genericos por codigo HTTP.
   *
   * @param err      - Objeto de error HTTP de Angular.
   * @param fallback - Mensaje de reserva si no se puede extraer uno especifico.
   * @returns Mensaje de error legible para mostrar al usuario.
   * @private
   */
  private extraerError(err: any, fallback: string): string {
    if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();
    if (err.error?.message) return err.error.message;
    if (err.status === 409) return 'El usuario o email ya existe.';
    if (err.status === 401) return 'Credenciales incorrectas o cuenta no activa.';
    if (err.status === 403) return 'Tu cuenta esta pendiente de aprobacion.';
    if (err.status === 0)   return 'No se puede conectar al servidor.';
    return fallback;
  }

  /**
   * Ejecuta el flujo de inicio de sesion:
   * 1. Valida que los campos no esten vacios.
   * 2. Llama al backend via {@link AuthService.postLogin}.
   * 3. Persiste la sesion y redirige al panel del usuario segun su rol.
   *
   * Si ya hay una peticion en curso (`cargando = true`), el metodo retorna inmediatamente
   * para evitar envios duplicados.
   */
  login() {
    if (this.cargando) return;
    if (!this.loginUsername.trim() || !this.loginContrasena.trim()) {
      this.mostrarAlerta('warning', 'Completa usuario y contrasena.');
      return;
    }
    this.alerta   = null;
    this.cargando = true;
    this.cdr.detectChanges();

    this.auth.postLogin(this.loginUsername.trim(), this.loginContrasena).subscribe({
      next: resp => {
        this.cargando = false;
        this.auth.guardarSesion(resp);
        this.mostrarAlerta('success', `Bienvenido, ${resp.nombre}.`);
        setTimeout(() => {
          if (resp.rol === 'ADMIN') this.router.navigate(['/admin']);
          else                      this.router.navigate(['/dashboard']);
        }, 700);
      },
      error: err => {
        this.cargando = false;
        this.mostrarAlerta('error', this.extraerError(err, 'Error al iniciar sesion.'));
      },
    });
  }

  /**
   * Ejecuta el flujo de registro de nuevo usuario:
   * 1. Valida todos los campos del formulario en el cliente.
   * 2. Llama al backend via {@link AuthService.postRegistro}.
   * 3. Muestra confirmacion diferenciada segun el rol solicitado:
   *    - USUARIO: mensaje de exito y redireccion a login.
   *    - ADMINISTRADOR: mensaje informativo sobre aprobacion pendiente.
   *
   * Validaciones aplicadas:
   * - Todos los campos requeridos presentes.
   * - Username de al menos 4 caracteres.
   * - Nombre completo: solo letras, espacios y guiones.
   * - Email con formato valido (regex RFC simplificado).
   * - Contrasena: minimo 8 caracteres, una mayuscula, una minuscula y un numero.
   */
  registro() {
    if (this.cargando) return;

    if (!this.regUsername || !this.regContrasena || !this.regNombreCompleto || !this.regEmail) {
      this.mostrarAlerta('warning', 'Completa todos los campos obligatorios.');
      return;
    }
    if (this.regUsername.trim().length < 4) {
      this.mostrarAlerta('warning', 'El usuario debe tener al menos 4 caracteres.');
      return;
    }
    if (!/^[\p{L} \-]+$/u.test(this.regNombreCompleto.trim())) {
      this.mostrarAlerta('warning', 'El nombre solo puede contener letras, espacios y guiones.');
      return;
    }
    if (!this.regEmail.trim().match(/^[\w._%+\-]+@[\w.\-]+\.[a-zA-Z]{2,}$/)) {
      this.mostrarAlerta('warning', 'El correo no tiene un formato valido.');
      return;
    }
    if (this.regContrasena.length < 8 ||
      !/[A-Z]/.test(this.regContrasena) ||
      !/[a-z]/.test(this.regContrasena) ||
      !/[0-9]/.test(this.regContrasena)) {
      this.mostrarAlerta('warning', 'La contrasena necesita 8+ caracteres, mayuscula, minuscula y numero.');
      return;
    }

    this.alerta   = null;
    this.cargando = true;
    this.cdr.detectChanges();

    this.auth.postRegistro({
      username:        this.regUsername.trim(),
      contrasena:      this.regContrasena,
      nombreCsompleto: this.regNombreCompleto.trim(),
      email:           this.regEmail.trim(),
      rol:             this.regRol,
    }).subscribe({
      next: () => {
        this.cargando = false;
        if (this.regRol === 'ADMIN') {
          this.mostrarAlerta('info', 'Solicitud de administrador enviada.',
            'Un administrador existente debe aprobar tu cuenta antes de que puedas ingresar.');
        } else {
          this.mostrarAlerta('success', 'Cuenta creada. Ya puedes iniciar sesion.');
        }
        setTimeout(() => this.cambiarModo('login'), 2500);
      },
      error: err => {
        this.cargando = false;
        this.mostrarAlerta('error', this.extraerError(err, 'Error al registrar.'));
      },
    });
  }

  /**
   * Resetea todos los campos de ambos formularios (login y registro)
   * y desactiva el indicador de carga.
   *
   * @private
   */
  private limpiarCampos() {
    this.loginUsername     = '';
    this.loginContrasena   = '';
    this.regUsername       = '';
    this.regContrasena     = '';
    this.regNombreCompleto = '';
    this.regEmail          = '';
    this.regRol            = 'USUARIO';
    this.cargando          = false;
  }
}
