// One row of the "SIEM-dataset" table (Cámara de Comercio / Canaco-Canacope
// registry) — a complementary business source to DENUE with no coordinates
// but much better phone/email coverage. Field names are the table's own
// (Spanish, snake_case).
export interface SiemRow {
  razon_social: string | null;
  estado: string | null;
  municipio: string | null;
  domicilio: string | null;
  colonia: string | null;
  cp: number | null;
  telefono: string | null;
  e_mail: string | null;
  giro: string | null;
  scian: number | null;
  rango_empleados: string | null;
  registrado_por: string | null;
  uuid: string;
}
