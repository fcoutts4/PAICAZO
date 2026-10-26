// Postgres: Neon en Vercel (DATABASE_URL); PGlite en archivo local para desarrollo.
export type Consulta = (texto: string, params?: unknown[]) => Promise<Record<string, unknown>[]>

export const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS golpes (
     jugador text NOT NULL, hoyo int NOT NULL CHECK (hoyo BETWEEN 1 AND 18),
     por_marcador boolean NOT NULL, golpes int NOT NULL CHECK (golpes BETWEEN 1 AND 15),
     actualizado timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (jugador, hoyo, por_marcador))`,
  `CREATE TABLE IF NOT EXISTS firmas (jugador text PRIMARY KEY, firmada timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS nombres (jugador text PRIMARY KEY, nombre text NOT NULL)`, // los cambia el admin
  `CREATE TABLE IF NOT EXISTS grupos (jugador text PRIMARY KEY, grupo int NOT NULL, marca text NOT NULL)`, // sorteo del admin
  `CREATE TABLE IF NOT EXISTS no_juega (jugador text PRIMARY KEY)`, // ausentes o retirados: fuera de los bonus
  `CREATE TABLE IF NOT EXISTS agregados (jugador text PRIMARY KEY, nombre text NOT NULL, indice double precision NOT NULL)`, // jugadores nuevos del admin
  `CREATE TABLE IF NOT EXISTS indices (jugador text PRIMARY KEY, indice double precision NOT NULL)`, // índice corregido por el admin
  `CREATE TABLE IF NOT EXISTS intentos (jugador text PRIMARY KEY, n int NOT NULL, desde timestamptz NOT NULL)`, // login fallido
]

// una sola conexión por proceso: Next carga este módulo por separado para páginas y API,
// y dos PGlite sobre la misma carpeta no se ven entre sí
const g = globalThis as { paicazoDb?: Promise<Consulta> }

async function conectar(): Promise<Consulta> {
  let q: Consulta
  if (process.env.DATABASE_URL) {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.DATABASE_URL)
    q = (t, p = []) => sql.query(t, p) as Promise<Record<string, unknown>[]>
  } else if (process.env.NODE_ENV === 'production' && !process.env.PAICAZO_PGLITE) {
    throw new Error('Falta DATABASE_URL: en producción no se usa la base local') // fail-closed
  } else {
    const { PGlite } = await import('@electric-sql/pglite')
    const { mkdirSync } = await import('node:fs')
    mkdirSync('./node_modules/.cache', { recursive: true })
    const db = new PGlite('./node_modules/.cache/paicazo-pglite') // fuera de lo que vigila Turbopack
    q = async (t, p = []) => (await db.query<Record<string, unknown>>(t, p)).rows
  }
  for (const ddl of ESQUEMA) await q(ddl)
  return q
}

export async function sql(texto: string, params: unknown[] = []) {
  g.paicazoDb ??= conectar().catch(e => { g.paicazoDb = undefined; throw e })
  return (await g.paicazoDb)(texto, params)
}
