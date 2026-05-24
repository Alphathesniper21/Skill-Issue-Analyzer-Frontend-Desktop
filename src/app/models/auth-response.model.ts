export interface AuthResponseModel {
  token: string;
  username: string;
  nombre: string;
  rol: 'ADMIN' | 'USUARIO';
}
