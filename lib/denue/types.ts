// Shape of a single record returned by DENUE's `Buscar` endpoint.
// Field names are INEGI's own (Spanish, mixed case) — kept as-is here and
// stored verbatim in businesses.raw_json for Phase 2 to consume.
export interface RawDenueRecord {
  Id: string;
  Nombre: string;
  Razon_social?: string;
  Clase_actividad?: string;
  Estrato?: string;
  Tipo_vialidad?: string;
  Calle?: string;
  Num_Exterior?: string;
  Num_Interior?: string;
  Colonia?: string;
  CP?: string;
  Localidad?: string;
  Entidad?: string;
  // DENUE's real responses don't actually carry a separate Municipio field
  // (despite INEGI's own docs implying one) — only this composite string,
  // "Localidad, Municipio, Estado" (Localidad space-padded). Parse it with
  // parseMunicipioFromUbicacion in lib/siem/match.ts rather than reading
  // record.Municipio, which is always undefined in practice.
  Ubicacion?: string;
  Telefono?: string;
  Correo_e?: string;
  Sitio_internet?: string;
  Longitud: string;
  Latitud: string;
}
