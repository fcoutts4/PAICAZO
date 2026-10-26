// Freno a la fuerza bruta del PIN: 5 intentos por jugador cada 15 minutos (contados desde el primero).
// Recibe la consulta como parámetro para probarlo contra una base en memoria.
import type { Consulta } from './db'

export const MAX_INTENTOS = 5

/** Cuenta un intento y dice si todavía puede probar. Un solo UPDATE atómico: intentos en paralelo no se saltan el límite. */
export async function puedeIntentar(q: Consulta, id: string, ahora = new Date()): Promise<boolean> {
  const [f] = await q(
    `INSERT INTO intentos (jugador, n, desde) VALUES ($1, 1, $2)
     ON CONFLICT (jugador) DO UPDATE SET
       n     = CASE WHEN intentos.desde <= $2::timestamptz - interval '15 minutes' THEN 1  ELSE intentos.n + 1 END,
       desde = CASE WHEN intentos.desde <= $2::timestamptz - interval '15 minutes' THEN $2 ELSE intentos.desde END
     RETURNING n`, [id, ahora])
  return Number(f.n) <= MAX_INTENTOS
}

/** Entró bien: parte de cero. */
export const olvidarIntentos = (q: Consulta, id: string) => q('DELETE FROM intentos WHERE jugador = $1', [id])
