import https from "node:https";
import type { NewBusiness } from "@/lib/db/searches";
import type { RawDenueRecord } from "./types";

export interface BuscarDenueParams {
  keyword: string;
  lat: number;
  lng: number;
  radiusM: number;
}

// INEGI's server sends a response that Node's fetch/undici HTTP parser
// rejects (AssertionError in Parser.onMessageComplete) even though it's a
// perfectly valid 200 response. Node's classic https module tolerates it,
// so we use that here instead of fetch.
function httpsGetJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { Accept: "application/json", "User-Agent": "lead-finder-v1" } },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 400) {
          res.resume();
          reject(new Error(`DENUE respondió con estado ${status}`));
          return;
        }

        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            reject(new Error("La respuesta de DENUE no es JSON válido"));
          }
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("Tiempo de espera agotado al consultar DENUE"));
    });
  });
}

export async function buscarDenue(params: BuscarDenueParams): Promise<RawDenueRecord[]> {
  const token = process.env.DENUE_TOKEN;
  if (!token) {
    throw new Error("DENUE_TOKEN no está configurado");
  }

  const url = `https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar/${encodeURIComponent(
    params.keyword
  )}/${params.lat},${params.lng}/${params.radiusM}/${token}`;

  return httpsGetJson<RawDenueRecord[]>(url);
}

export interface BuscarPorAreaActividadParams {
  entidad: string;
  municipio: string;
  clase: string;
}

const AREA_PAGE_SIZE = 250;
// 1,500 records max — DENUE has no distance sort, so beyond a bounded fetch
// we're just paging blind; a niche category will finish well before this
// cap, a popular one gets a best-effort partial set.
const AREA_PAGE_CAP = 6;

export async function buscarPorAreaActividad(
  params: BuscarPorAreaActividadParams
): Promise<RawDenueRecord[]> {
  const token = process.env.DENUE_TOKEN;
  if (!token) {
    throw new Error("DENUE_TOKEN no está configurado");
  }

  const all: RawDenueRecord[] = [];
  for (let page = 0; page < AREA_PAGE_CAP; page++) {
    const start = page * AREA_PAGE_SIZE + 1;
    const end = start + AREA_PAGE_SIZE - 1;
    const url =
      `https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarAreaAct/` +
      `${params.entidad}/${params.municipio}/0/0/0/0/0/0/${params.clase}/0/${start}/${end}/0/${token}`;

    const pageRecords = await httpsGetJson<RawDenueRecord[]>(url);
    all.push(...pageRecords);
    if (pageRecords.length < AREA_PAGE_SIZE) break;
  }

  return all;
}

export function mapDenueRecordToBusiness(record: RawDenueRecord): NewBusiness {
  const address = [
    record.Tipo_vialidad,
    record.Calle,
    record.Num_Exterior,
    record.Colonia,
    record.CP,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    name: record.Nombre,
    address: address || null,
    phone: record.Telefono || null,
    email: record.Correo_e || null,
    website: record.Sitio_internet || null,
    lat: Number(record.Latitud),
    lng: Number(record.Longitud),
    source: "denue",
    source_id: record.Id,
    raw_json: record,
  };
}
