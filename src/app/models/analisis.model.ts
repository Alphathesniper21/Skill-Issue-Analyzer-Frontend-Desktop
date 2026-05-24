export type Severidad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface MalaPractica {
  linea:       number;
  tipo:        string;        // e.g. "God Class", "Magic Number"
  descripcion: string;
  severidad:   Severidad;
  sugerencia:  string;
}

export interface Analisis {
  id:                   number;
  codigoFuente:         string;
  fechaAnalisis:        string;
  nombreUsuarioAutor:   string;
  malasPracticas:       MalaPractica[];
  totalProblemas:       number;
  puntuacion:           number;
}

/** DTO para enviar al backend */
export interface AnalisisRequest {
  codigoFuente: string;
}

/** Etiqueta amigable por severidad */
export const SEVERIDAD_LABEL: Record<Severidad, string> = {
  BAJA:    'Minor Issue',
  MEDIA:   'Moderate Issue',
  ALTA:    'Major Issue',
  CRITICA: 'Certified Disaster',
};
