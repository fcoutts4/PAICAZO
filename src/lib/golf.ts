// Motor de cálculo del campeonato: hándicap, Stableford, validación cruzada y rankings.
// Sin dependencias: lo usan las páginas y las pruebas (node --test).

export type Cancha = { par: number[]; hcp: number[]; slope: number; rating: number }
export type Jugador = { id: string; nombre: string; indice: number; grupo: number; marca: string; admin?: boolean }
export type Golpe = { jugador: string; hoyo: number; por_marcador: boolean; golpes: number }
export type Estado = 'ok' | 'conflicto' | 'pendiente' | 'vacio'
export type Hoyo = {
  hoyo: number; par: number; hcp: number; recibidos: number
  propio: number | null; marcador: number | null; golpes: number | null
  puntos: number | null; estado: Estado
}
export type Tarjeta = { id: string; hj: number; hoyos: Hoyo[]; jugados: number; puntos: number; gross: number; vsPar: number }

const HOYOS = 18
const PCT_STABLEFORD = 0.95 // asignación WHS para Stableford individual

/** Hándicap de juego WHS: índice × slope/113 + (rating − par), por la asignación, redondeado al final. */
export function hcpJuego(indice: number, c: Cancha, pct = PCT_STABLEFORD): number {
  const parTotal = c.par.reduce((a, b) => a + b, 0)
  return Math.round((indice * c.slope / 113 + (c.rating - parTotal)) * pct) || 0
}

/** Golpes que recibe en un hoyo según su HCP (1 = más difícil). Hándicap plus devuelve en los más fáciles. */
export function golpesRecibidos(hj: number, hcpHoyo: number): number {
  if (hj < 0) return hcpHoyo > HOYOS + hj ? -1 : 0
  return Math.floor(hj / HOYOS) + (hcpHoyo <= hj % HOYOS ? 1 : 0)
}

export function puntosStableford(golpes: number | null, par: number, recibidos: number): number | null {
  return golpes == null ? null : Math.max(0, 2 + par + recibidos - golpes)
}

export function estadoHoyo(propio: number | null, marcador: number | null): Estado {
  if (propio == null && marcador == null) return 'vacio'
  if (propio == null || marcador == null) return 'pendiente'
  return propio === marcador ? 'ok' : 'conflicto'
}

export function tarjeta(j: Jugador, filas: Golpe[], c: Cancha): Tarjeta {
  const hj = hcpJuego(j.indice, c)
  const hoyos: Hoyo[] = c.par.map((par, i) => {
    const de = (m: boolean) => filas.find(f => f.jugador === j.id && f.hoyo === i + 1 && f.por_marcador === m)?.golpes ?? null
    const propio = de(false), marcador = de(true)
    const golpes = propio ?? marcador // ponytail: en conflicto vale lo del jugador hasta que se corrija
    const recibidos = golpesRecibidos(hj, c.hcp[i])
    return {
      hoyo: i + 1, par, hcp: c.hcp[i], recibidos, propio, marcador, golpes,
      puntos: puntosStableford(golpes, par, recibidos), estado: estadoHoyo(propio, marcador),
    }
  })
  const jugados = hoyos.filter(h => h.golpes != null)
  const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  return {
    id: j.id, hj, hoyos,
    jugados: jugados.length,
    puntos: suma(jugados.map(h => h.puntos!)),
    gross: suma(jugados.map(h => h.golpes!)),
    vsPar: suma(jugados.map(h => h.golpes! - h.par)),
  }
}

export const puedeFirmar = (t: Tarjeta) => t.hoyos.every(h => h.estado === 'ok')

/** Marca de la tarjeta estilo PGA (golpes brutos vs par): círculo birdie, cuadrado bogey, dobles para eagle/doble bogey. */
export function marcaPGA(golpes: number | null, par: number) {
  if (golpes == null) return null
  const d = golpes - par
  return d <= -2 ? 'eagle' : d === -1 ? 'birdie' : d === 0 ? 'par' : d === 1 ? 'bogey' : 'doble'
}

/** Nombre que el admin le pone a un jugador: 1-24 caracteres, sin < > (se muestra en toda la app). */
export function limpiarNombre(s: string): string | null {
  if (typeof s !== 'string') return null
  const n = s.trim().replace(/\s+/g, ' ')
  return n && n.length <= 24 && !/[<>]/.test(n) ? n : null
}

/** Quién puede anotar qué: el jugador su tarjeta, el marcador la de su marcado, el admin todo. */
export function puedeAnotar(quien: Jugador, g: Golpe, firmadas: Set<string>, admin: boolean): boolean {
  if (!Number.isInteger(g.hoyo) || g.hoyo < 1 || g.hoyo > HOYOS) return false
  if (!Number.isInteger(g.golpes) || g.golpes < 1 || g.golpes > 15) return false
  if (admin) return true
  if (firmadas.has(g.jugador)) return false
  return g.por_marcador ? quien.marca === g.jugador && g.jugador !== quien.id : g.jugador === quien.id
}

type FilaStableford = { id: string; nombre: string; hj: number; jugados: number; puntos: number; pos: number; firmada: boolean }
type FilaGross = { id: string; nombre: string; jugados: number; gross: number; vsPar: number; pos: number }

/** Asigna posición; empatados en todas las claves comparten puesto. */
function posiciones<T extends { pos: number }>(filas: T[], clave: (f: T) => number[]): T[] {
  filas.forEach((f, i) => {
    const prev = filas[i - 1]
    f.pos = prev && clave(prev).join() === clave(f).join() ? prev.pos : i + 1
  })
  return filas
}

function compara(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i]
  return 0
}

export function ranking(jugadores: Jugador[], filas: Golpe[], c: Cancha, firmadas = new Set<string>()) {
  const ts = jugadores.map(j => ({ j, t: tarjeta(j, filas, c) }))
  const ptsDesde = (t: Tarjeta, desde: number) => t.hoyos.slice(desde - 1).reduce((a, h) => a + (h.puntos ?? 0), 0)
  // desempate: total, últimos 9, 6, 3 y el último hoyo
  const claveStb = (t: Tarjeta) => [t.puntos, ptsDesde(t, 10), ptsDesde(t, 13), ptsDesde(t, 16), ptsDesde(t, 18)]

  const stbConClave = ts
    .map(({ j, t }) => ({ k: claveStb(t), f: { id: j.id, nombre: j.nombre, hj: t.hj, jugados: t.jugados, puntos: t.puntos, pos: 0, firmada: firmadas.has(j.id) } }))
    .sort((a, b) => compara(a.k, b.k))
  const claves = new Map(stbConClave.map(x => [x.f, x.k]))
  const stableford: FilaStableford[] = posiciones(stbConClave.map(x => x.f), f => claves.get(f)!)

  const gross: FilaGross[] = posiciones(
    ts.map(({ j, t }) => ({ id: j.id, nombre: j.nombre, jugados: t.jugados, gross: t.gross, vsPar: t.vsPar, pos: 0 }))
      .sort((a, b) => (a.jugados ? 0 : 1) - (b.jugados ? 0 : 1) || a.vsPar - b.vsPar || b.jugados - a.jugados),
    f => [f.jugados ? 0 : 1, f.vsPar, f.jugados])

  // skins netos con arrastre; solo hoyos que todos completaron, en orden
  const ganados: { hoyo: number; id: string; valor: number }[] = []
  let pozo = 0, hastaHoyo = 0
  for (let i = 0; i < HOYOS && ts.length; i++) {
    const netos = ts.map(({ j, t }) => ({ id: j.id, neto: t.hoyos[i].golpes == null ? null : t.hoyos[i].golpes! - t.hoyos[i].recibidos }))
    if (netos.some(n => n.neto == null)) break
    hastaHoyo = i + 1
    pozo++
    const mejor = Math.min(...netos.map(n => n.neto!))
    const con = netos.filter(n => n.neto === mejor)
    if (con.length === 1) { ganados.push({ hoyo: i + 1, id: con[0].id, valor: pozo }); pozo = 0 }
  }
  const porJugador = new Map<string, number>()
  for (const g of ganados) porJugador.set(g.id, (porJugador.get(g.id) ?? 0) + g.valor)

  // copa por grupos: por hoyo suman los 2 mejores Stableford del grupo
  const grupos = [...new Set(jugadores.map(j => j.grupo))].map(grupo => {
    const del = ts.filter(x => x.j.grupo === grupo)
    let puntos = 0
    for (let i = 0; i < HOYOS; i++) {
      const pts = del.map(x => x.t.hoyos[i].puntos).filter((p): p is number => p != null).sort((a, b) => b - a)
      puntos += (pts[0] ?? 0) + (pts[1] ?? 0)
    }
    return { grupo, puntos, jugadores: del.map(x => x.j.nombre) }
  }).sort((a, b) => b.puntos - a.puntos)

  return { stableford, gross, skins: { ganados, pozo, hastaHoyo, porJugador: Object.fromEntries(porJugador) }, grupos }
}
