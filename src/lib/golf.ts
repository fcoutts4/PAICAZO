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

/** Asigna posición; empatados en todas las claves comparten puesto. */
function posiciones<T extends { pos: number }>(filas: T[], clave: (f: T) => number[]): T[] {
  filas.forEach((f, i) => {
    const prev = filas[i - 1]
    f.pos = prev && clave(prev).join() === clave(f).join() ? prev.pos : i + 1
  })
  return filas
}

/** 1 punto por hoyo a quien haga menos (según `valor`); si empatan, se reparte. Solo hoyos que jugaron todos. */
function repartir(ts: { j: Jugador; t: Tarjeta }[], valor: (h: Hoyo) => number | null) {
  const hoyos: { hoyo: number; ids: string[]; valor: number }[] = []
  for (let i = 0; i < HOYOS && ts.length; i++) {
    const vs = ts.map(({ j, t }) => ({ id: j.id, v: valor(t.hoyos[i]) }))
    if (vs.some(x => x.v == null)) continue
    const mejor = Math.min(...vs.map(x => x.v!))
    const ids = vs.filter(x => x.v === mejor).map(x => x.id)
    hoyos.push({ hoyo: i + 1, ids, valor: 1 / ids.length })
  }
  const puntos: Record<string, number> = {}
  for (const h of hoyos) for (const id of h.ids) puntos[id] = (puntos[id] ?? 0) + h.valor
  return { hoyos, puntos }
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

  // skins: todos contra todos, en gross (golpes brutos)
  const skins = repartir(ts, h => h.golpes)

  // juego de grupo: solo contra los de tu grupo, en neto (golpes − golpes recibidos)
  const grupos = [...new Set(jugadores.map(j => j.grupo))].sort((a, b) => a - b).map(grupo => {
    const del = ts.filter(x => x.j.grupo === grupo)
    const r = repartir(del, h => (h.golpes == null ? null : h.golpes - h.recibidos))
    const js = del.map(({ j }) => ({ id: j.id, nombre: j.nombre, puntos: r.puntos[j.id] ?? 0 })).sort((a, b) => b.puntos - a.puntos)
    return { grupo, jugadores: js, hoyos: r.hoyos }
  })

  // general: suma de los 3 campeonatos; a igual total, desempata el Stableford (con su propio desempate)
  const enGrupo = new Map(grupos.flatMap(g => g.jugadores.map(j => [j.id, j.puntos] as const)))
  const genConClave = ts.map(({ j, t }) => {
    const sk = skins.puntos[j.id] ?? 0, gr = enGrupo.get(j.id) ?? 0, total = t.puntos + sk + gr
    return { k: [Math.round(total * 1000), ...claveStb(t)], f: { id: j.id, nombre: j.nombre, stableford: t.puntos, skins: sk, grupo: gr, total, pos: 0 } }
  }).sort((a, b) => compara(a.k, b.k))
  const clavesGen = new Map(genConClave.map(x => [x.f, x.k]))
  const general = posiciones(genConClave.map(x => x.f), f => clavesGen.get(f)!)

  return { general, stableford, skins: { ganados: skins.hoyos, jugados: skins.hoyos.length, porJugador: skins.puntos }, grupos }
}
