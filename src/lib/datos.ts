import canchaJson from '../../data/cancha.json'
import jugadoresJson from '../../data/jugadores.json'
import { sql } from './db'
import type { Cancha, Golpe, Jugador } from './golf'

export const cancha: Cancha & { yardas: number[]; provisorio?: string } = canchaJson
export const jugadores: Jugador[] = jugadoresJson
export const jugador = (id: string) => jugadores.find(j => j.id === id)

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
