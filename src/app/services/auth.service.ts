import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthResponseModel } from '../models/auth-response.model';
import { RegistroDTO } from '../models/usuario.model';

interface Sesion {
  token:          string;
  username:       string;
  nombreCompleto: string;   // guardamos internamente como nombreCompleto para el getter
  rol:            string;   // "ADMIN" | "USUARIO"
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly urlBase = 'https://gpcueb.org/skillissueanalyzer';
  private readonly KEY     = 'sia_sesion';
  private _sesion: Sesion | null = null;

  /**
   * Crea una instancia del servicio e intenta restaurar la sesion
   * persistida en localStorage al iniciar la aplicacion.
   *
   * @param http - Cliente HTTP de Angular para realizar peticiones al backend.
   */
  constructor(private http: HttpClient) {
    this._cargarSesion();
  }

  // ── HTTP ────────────────────────────────────────────────────────────────

  /**
   * Envia las credenciales del usuario al endpoint de login del backend.
   *
   * @param username - Nombre de usuario registrado.
   * @param password - Contrasena en texto plano (el transporte va cifrado por HTTPS).
   * @returns Observable que emite {@link AuthResponseModel} con el token JWT y datos del usuario.
   */
  postLogin(username: string, password: string): Observable<AuthResponseModel> {
    return this.http.post<AuthResponseModel>(
      `${this.urlBase}/auth/login`,
      { username, contrasena: password }
    );
  }

  /**
   * Envia los datos del formulario de registro al backend para crear una cuenta nueva.
   *
   * @param dto - Objeto con los campos requeridos para el registro.
   * @returns Observable que emite la respuesta en texto plano del backend.
   */
  postRegistro(dto: RegistroDTO): Observable<string> {
    return this.http.post(`${this.urlBase}/auth/registro`, dto, { responseType: 'text' });
  }

  // ── Sesión ──────────────────────────────────────────────────────────────

  /**
   * Persiste la sesion del usuario autenticado en memoria y en localStorage.
   * Mapea los campos del response del backend al formato interno de Sesion.
   *
   * @param resp - Objeto {@link AuthResponseModel} devuelto por el backend tras el login exitoso.
   */
  guardarSesion(resp: AuthResponseModel): void {
    this._sesion = {
      token:          resp.token,
      username:       resp.username,
      nombreCompleto: resp.nombre,   // ← el backend devuelve "nombre", no "nombreCompleto"
      rol:            resp.rol,      // ← "ADMIN" o "USUARIO"
    };
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this._sesion));
    } catch { /* private mode */ }
  }

  /**
   * Elimina la sesion activa tanto en memoria como en localStorage.
   * Debe llamarse al cerrar sesion o cuando el interceptor detecta un 401.
   */
  cerrarSesion(): void {
    this._sesion = null;
    try { localStorage.removeItem(this.KEY); } catch { /* ignore */ }
  }

  /**
   * Intenta restaurar la sesion desde localStorage al inicializar el servicio.
   * Si el item no existe o el JSON es invalido, deja _sesion en null.
   */
  private _cargarSesion(): void {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) this._sesion = JSON.parse(raw);
    } catch {
      this._sesion = null;
    }
  }

  // ── Getters ─────────────────────────────────────────────────────────────

  /** @returns `true` si el usuario esta autenticado, `false` en caso contrario. */
  get estaLogueado():   boolean { return this._sesion !== null; }
  /** @returns `true` si el rol de la sesion es "ADMIN". */
  get esAdmin():        boolean { return this._sesion?.rol === 'ADMIN'; }  // ← backend devuelve "ADMIN"
  /** @returns El token JWT de la sesion activa, o `null` si no hay sesion. */
  get token():          string | null { return this._sesion?.token ?? null; }
  /** @returns El username del usuario autenticado, o cadena vacia si no hay sesion. */
  get username():       string { return this._sesion?.username ?? ''; }
  /** @returns El nombre completo del usuario autenticado, o cadena vacia si no hay sesion. */
  get nombreCompleto(): string { return this._sesion?.nombreCompleto ?? ''; }
  /** @returns El rol del usuario autenticado ("ADMIN", "USUARIO") o cadena vacia si no hay sesion. */
  get rol():            string { return this._sesion?.rol ?? ''; }
}
