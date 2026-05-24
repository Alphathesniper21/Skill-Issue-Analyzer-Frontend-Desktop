export type Rol               = 'ADMIN' | 'USUARIO';
export type EstadoSolicitud   = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface Usuario {
  id:                number;
  username:          string;
  nombre:    string;
  correo:             string;
  rol:               Rol;
  activo:            boolean;
  estadoSolicitud:   EstadoSolicitud | null;  // null for USUARIO role
  fechaCreacion:     string;
}

export interface RegistroDTO {
  username:       string;
  contrasena:       string;
  nombreCsompleto: string;
  email:          string;
  rol:            Rol;
}

export function labelRol(rol: string): string {
  return rol === 'ADMIN' ? 'ADMIN' : 'USUARIO';
}
