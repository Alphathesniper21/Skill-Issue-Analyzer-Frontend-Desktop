import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Analisis } from '../models/analisis.model';

@Injectable({ providedIn: 'root' })
export class AnalisisService {

  private readonly urlBase = 'https://gpcueb.org/skillissueanalyzer'; // ← era 8080

  constructor(private http: HttpClient) {}

  /**
   * Envia un archivo ZIP al backend para su analisis de malas practicas en Java.
   * El backend descomprime el ZIP, extrae los `.java` y los envia a Claude AI.
   *
   * @param formData - FormData con el campo `archivo` que contiene el ZIP seleccionado.
   * @returns Observable que emite el {@link Analisis} generado con los resultados.
   */
  analizarZip(formData: FormData): Observable<Analisis> {
    return this.http.post<Analisis>(`${this.urlBase}/analisis/zip`, formData);
  }

  // ← NUEVO: analizar repositorio de GitHub
  /**
   * Solicita al backend el analisis de un repositorio publico de GitHub.
   * El backend extrae los `.java` del repositorio y los procesa con Claude AI.
   *
   * @param repoUrl - URL publica del repositorio con formato `https://github.com/owner/repo`.
   * @returns Observable que emite el {@link Analisis} generado con los resultados.
   */
  analizarGithub(repoUrl: string): Observable<Analisis> {
    return this.http.post<Analisis>(
      `${this.urlBase}/analisis/github`,
      null,
      { params: { repoUrl } }
    );
  }

  /**
   * Obtiene todos los analisis realizados por el usuario autenticado.
   *
   * @returns Observable que emite un array de {@link Analisis} del usuario actual.
   */
  getMisAnalisis(): Observable<Analisis[]> {
    return this.http.get<Analisis[]>(`${this.urlBase}/analisis`);
  }

  /**
   * Obtiene el detalle completo de un analisis especifico por su ID.
   *
   * @param id - Identificador unico del analisis a consultar.
   * @returns Observable que emite el {@link Analisis} correspondiente al ID indicado.
   */
  getById(id: number): Observable<Analisis> {
    return this.http.get<Analisis>(`${this.urlBase}/analisis/${id}`);
  }

  /**
   * Elimina permanentemente un analisis del historial del usuario.
   *
   * @param id - Identificador unico del analisis a eliminar.
   * @returns Observable que emite la respuesta en texto plano del backend.
   */
  eliminar(id: number): Observable<string> {
    return this.http.delete(`${this.urlBase}/analisis/${id}`, { responseType: 'text' });
  }
}
