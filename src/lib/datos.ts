import { cache } from 'react'
import canchaJson from '../../data/cancha.json'
import jugadoresJson from '../../data/jugadores.json'
import { sql } from './db'
import type { Cancha, Golpe, Jugador } from './golf'

export const cancha: Cancha & { yardas: number[] } = canchaJson
const base: Jugador[] = jugadoresJson // los del JSON; el admin agrega más en la tabla agregados

/** Jugadores vigentes (JSON + agregados, con los nombres, índices y grupos que cambió el admin); una consulta por request. */
export const jugadores = cache(async (): Promise<Jugador[]> => {
  const [nombres, grupos, nuevos, indices, quitados] = await Promise.all([
    sql('SELECT jugador, nombre FROM nombres'), sql('SELECT jugador, grupo, marca FROM grupos'),
    sql('SELECT jugador, nombre, indice FROM agregados ORDER BY jugador'), sql('SELECT jugador, indice FROM indices'), sql('SELECT jugador FROM quitados')])
  const sacados = new Set(quitados.map(f => f.jugador as string))
  const cambios = new Map(nombres.map(f => [f.jugador as string, f.nombre as string]))
  const sorteo = new Map(grupos.map(f => [f.jugador as string, { grupo: f.grupo as number, marca: f.marca as string }]))
  const indice = new Map(indices.map(f => [f.jugador as string, Number(f.indice)]))
  const todos = [...base, ...nuevos.map(f => ({ id: f.jugador as string, nombre: f.nombre as string, indice: Number(f.indice), grupo: 0, marca: '', agregado: true }))]
  return todos.filter(j => !sacados.has(j.id)).map(j => ({
    ...j, nombre: cambios.get(j.id) ?? j.nombre, indice: indice.get(j.id) ?? j.indice, ...sorteo.get(j.id),
  }))
})

/** Todos los ids que existen o existieron (JSON, agregados y quitados): un id nuevo no puede repetir ninguno. */
export async function idsUsados(): Promise<string[]> {
  const filas = await sql('SELECT jugador FROM agregados UNION SELECT jugador FROM quitados')
  return [...base.map(j => j.id), ...filas.map(f => f.jugador as string)]
}

export const jugador = async (id: string) => (await jugadores()).find(j => j.id === id)

export async function agregarJugador(id: string, nombre: string, indice: number) {
  return sql('INSERT INTO agregados (jugador, nombre, indice) VALUES ($1, $2, $3)', [id, nombre, indice])
}

export async function cambiarIndice(id: string, indice: number) {
  return sql('INSERT INTO indices (jugador, indice) VALUES ($1, $2) ON CONFLICT (jugador) DO UPDATE SET indice = EXCLUDED.indice', [id, indice])
}

/** Quita a un jugador (del JSON o agregado) con todo lo suyo, en una sola sentencia. Su id queda reservado en quitados. */
export async function quitarJugador(id: string) {
  return sql(
    `WITH g AS (DELETE FROM golpes WHERE jugador = $1), f AS (DELETE FROM firmas WHERE jugador = $1),
          n AS (DELETE FROM nombres WHERE jugador = $1), i AS (DELETE FROM indices WHERE jugador = $1),
          t AS (DELETE FROM intentos WHERE jugador = $1),
          s AS (DELETE FROM grupos WHERE jugador = $1), a AS (DELETE FROM agregados WHERE jugador = $1)
     INSERT INTO quitados (jugador) VALUES ($1) ON CONFLICT DO NOTHING`, [id])
}

/** Reemplaza los grupos y marcadores de todos, en una sola sentencia (si falla, no queda a medias). */
export async function guardarGrupos(asignacion: { id: string; grupo: number; marca: string }[]) {
  const ids = asignacion.map(a => a.id)
  return sql(
    `WITH nuevos AS (
       INSERT INTO grupos (jugador, grupo, marca) SELECT * FROM unnest($1::text[], $2::int[], $3::text[])
       ON CONFLICT (jugador) DO UPDATE SET grupo = EXCLUDED.grupo, marca = EXCLUDED.marca)
     DELETE FROM grupos WHERE jugador <> ALL($1::text[])`,
    [ids, asignacion.map(a => a.grupo), asignacion.map(a => a.marca)])
}

/** Muchos golpes en una sola consulta (la demo carga ~400 filas; de a una sería lento en Vercel). */
export async function guardarGolpesEnLote(filas: Golpe[]) {
  return sql(
    `INSERT INTO golpes (jugador, hoyo, por_marcador, golpes)
     SELECT * FROM unnest($1::text[], $2::int[], $3::boolean[], $4::int[])
     ON CONFLICT (jugador, hoyo, por_marcador) DO UPDATE SET golpes = EXCLUDED.golpes, actualizado = now()`,
    [filas.map(f => f.jugador), filas.map(f => f.hoyo), filas.map(f => f.por_marcador), filas.map(f => f.golpes)])
}

/** Deja el campeonato en blanco: borra todos los golpes y las firmas. */
export async function borrarScores() {
  await sql('DELETE FROM golpes')
  await sql('DELETE FROM firmas')
}

export async function renombrar(id: string, nombre: string) {
  return sql('INSERT INTO nombres (jugador, nombre) VALUES ($1, $2) ON CONFLICT (jugador) DO UPDATE SET nombre = EXCLUDED.nombre', [id, nombre])
}

export async function golpes(ids?: string[]): Promise<Golpe[]> {
  const filas = ids
    ? await sql('SELECT jugador, hoyo, por_marcador, golpes FROM golpes WHERE jugador = ANY($1)', [ids])
    : await sql('SELECT jugador, hoyo, por_marcador, golpes FROM golpes')
  return filas as Golpe[]
}

export async function firmadas(): Promise<Set<string>> {
  return new Set((await sql('SELECT jugador FROM firmas')).map(f => f.jugador as string))
}

export async function guardarGolpe(g: Omit<Golpe, 'golpes'> & { golpes: number | null }) {
  if (g.golpes == null)
    return sql('DELETE FROM golpes WHERE jugador = $1 AND hoyo = $2 AND por_marcador = $3', [g.jugador, g.hoyo, g.por_marcador])
  return sql(
    `INSERT INTO golpes (jugador, hoyo, por_marcador, golpes) VALUES ($1, $2, $3, $4)
     ON CONFLICT (jugador, hoyo, por_marcador) DO UPDATE SET golpes = EXCLUDED.golpes, actualizado = now()`,
    [g.jugador, g.hoyo, g.por_marcador, g.golpes])
}
