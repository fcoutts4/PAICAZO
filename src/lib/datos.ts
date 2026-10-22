import { cache } from 'react'
import canchaJson from '../../data/cancha.json'
import jugadoresJson from '../../data/jugadores.json'
import { sql } from './db'
import type { Cancha, Golpe, Jugador } from './golf'

export const cancha: Cancha & { yardas: number[]; provisorio?: string } = canchaJson
const base: Jugador[] = jugadoresJson
/** Solo para validar ids; para mostrar usa jugadores() (trae los nombres que cambió el admin). */
export const jugador = (id: string) => base.find(j => j.id === id)

/** Jugadores con el nombre vigente; una consulta por request. */
export const jugadores = cache(async (): Promise<Jugador[]> => {
  const [nombres, grupos] = await Promise.all([sql('SELECT jugador, nombre FROM nombres'), sql('SELECT jugador, grupo, marca FROM grupos')])
  const cambios = new Map(nombres.map(f => [f.jugador as string, f.nombre as string]))
  const sorteo = new Map(grupos.map(f => [f.jugador as string, { grupo: f.grupo as number, marca: f.marca as string }]))
  return base.map(j => ({ ...j, nombre: cambios.get(j.id) ?? j.nombre, ...sorteo.get(j.id) }))
})

/** Reemplaza los grupos y marcadores por un sorteo nuevo. */
export async function guardarGrupos(asignacion: { id: string; grupo: number; marca: string }[]) {
  await sql('DELETE FROM grupos')
  for (const a of asignacion) await sql('INSERT INTO grupos (jugador, grupo, marca) VALUES ($1, $2, $3)', [a.id, a.grupo, a.marca])
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
