// npm test   (Node 24 ejecuta TypeScript sin compilar)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hcpJuego, golpesRecibidos, puntosStableford, estadoHoyo, tarjeta, ranking,
  puedeAnotar, puedeFirmar, type Cancha, type Jugador, type Golpe,
} from './golf.ts'

const par = [4, 4, 3, 4, 5, 4, 4, 3, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4]
const hcp = [5, 7, 15, 3, 13, 11, 17, 9, 1, 6, 8, 16, 4, 14, 12, 18, 10, 2]
const cancha: Cancha = { par, hcp, slope: 113, rating: 70 }

const J = (id: string, indice: number, grupo = 1, marca = ''): Jugador =>
  ({ id, nombre: id, indice, grupo, marca })

/** Filas de golpes: el jugador y su marcador anotan lo mismo en cada hoyo. */
function filas(jugador: string, golpes: (number | null)[], marcador = true): Golpe[] {
  const out: Golpe[] = []
  golpes.forEach((g, i) => {
    if (g == null) return
    out.push({ jugador, hoyo: i + 1, por_marcador: false, golpes: g })
    if (marcador) out.push({ jugador, hoyo: i + 1, por_marcador: true, golpes: g })
  })
  return out
}
const pares = () => [...par]

// --- hándicap de juego (WHS: índice × slope/113 + (rating − par), 95%) ---
test('hcp juego: índice 13.4 en cancha neutra → 13', () => assert.equal(hcpJuego(13.4, cancha), 13))
test('hcp juego: índice bajo 2.7 → 3', () => assert.equal(hcpJuego(2.7, cancha), 3))
test('hcp juego: índice 22.1 → 21', () => assert.equal(hcpJuego(22.1, cancha), 21))
test('hcp juego: índice 0 → 0', () => assert.equal(hcpJuego(0, cancha), 0))
test('hcp juego: índice plus −2 → −2', () => assert.equal(hcpJuego(-2, cancha), -2))
test('hcp juego: slope y rating reales cambian el resultado', () =>
  assert.equal(hcpJuego(18, { ...cancha, slope: 130, rating: 71.5 }), 21))
test('hcp juego: 100% de asignación', () => assert.equal(hcpJuego(13.4, cancha, 1), 13))

// --- golpes recibidos por hoyo ---
test('recibidos: hcp 0 no recibe', () => assert.deepEqual(hcp.map(h => golpesRecibidos(0, h)), hcp.map(() => 0)))
test('recibidos: hcp 18 recibe 1 en todos', () => assert.ok(hcp.every(h => golpesRecibidos(18, h) === 1)))
test('recibidos: hcp 3 recibe solo en hoyos HCP 1-3', () => {
  assert.equal(golpesRecibidos(3, 3), 1)
  assert.equal(golpesRecibidos(3, 4), 0)
})
test('recibidos: hcp 21 recibe 2 en HCP 1-3 y 1 en el resto', () => {
  assert.equal(golpesRecibidos(21, 1), 2)
  assert.equal(golpesRecibidos(21, 3), 2)
  assert.equal(golpesRecibidos(21, 4), 1)
  assert.equal(golpesRecibidos(21, 18), 1)
})
test('recibidos: hcp 40 recibe 3 en HCP 1-4', () => {
  assert.equal(golpesRecibidos(40, 4), 3)
  assert.equal(golpesRecibidos(40, 5), 2)
})
test('recibidos: hcp plus −2 devuelve golpe en HCP 17 y 18', () => {
  assert.equal(golpesRecibidos(-2, 18), -1)
  assert.equal(golpesRecibidos(-2, 17), -1)
  assert.equal(golpesRecibidos(-2, 16), 0)
})

// --- puntos Stableford ---
test('stableford: par=2, bogey=1, birdie=3', () => {
  assert.equal(puntosStableford(4, 4, 0), 2)
  assert.equal(puntosStableford(5, 4, 0), 1)
  assert.equal(puntosStableford(3, 4, 0), 3)
})
test('stableford: doble bogey o peor = 0, nunca negativo', () => {
  assert.equal(puntosStableford(6, 4, 0), 0)
  assert.equal(puntosStableford(12, 4, 0), 0)
})
test('stableford: hoyo en uno en par 4 = 5 puntos', () => assert.equal(puntosStableford(1, 4, 0), 5))
test('stableford: golpe recibido convierte bogey en par neto', () => assert.equal(puntosStableford(5, 4, 1), 2))
test('stableford: sin golpes anotados → null', () => assert.equal(puntosStableford(null, 4, 1), null))

// --- validación cruzada por hoyo ---
test('estado: coinciden → ok', () => assert.equal(estadoHoyo(4, 4), 'ok'))
test('estado: difieren → conflicto', () => assert.equal(estadoHoyo(4, 5), 'conflicto'))
test('estado: solo uno anotó → pendiente', () => {
  assert.equal(estadoHoyo(4, null), 'pendiente')
  assert.equal(estadoHoyo(null, 4), 'pendiente')
})
test('estado: nadie anotó → vacio', () => assert.equal(estadoHoyo(null, null), 'vacio'))

// --- tarjeta ---
test('tarjeta vacía: 0 hoyos, 0 puntos', () => {
  const t = tarjeta(J('a', 18), [], cancha)
  assert.equal(t.jugados, 0)
  assert.equal(t.puntos, 0)
  assert.equal(t.gross, 0)
})
test('tarjeta: 18 pares con hcp 18 → 54 puntos (3 por hoyo)', () => {
  const t = tarjeta(J('a', 19), filas('a', pares()), cancha)
  assert.equal(t.hj, 18)
  assert.equal(t.puntos, 54)
  assert.equal(t.gross, 70)
  assert.equal(t.vsPar, 0)
})
test('tarjeta: en conflicto vale lo anotado por el jugador', () => {
  const rows: Golpe[] = [
    { jugador: 'a', hoyo: 1, por_marcador: false, golpes: 4 },
    { jugador: 'a', hoyo: 1, por_marcador: true, golpes: 6 },
  ]
  const t = tarjeta(J('a', 0), rows, cancha)
  assert.equal(t.hoyos[0].golpes, 4)
  assert.equal(t.hoyos[0].estado, 'conflicto')
})
test('tarjeta: si el jugador no anotó, vale lo del marcador', () => {
  const t = tarjeta(J('a', 0), [{ jugador: 'a', hoyo: 2, por_marcador: true, golpes: 5 }], cancha)
  assert.equal(t.hoyos[1].golpes, 5)
  assert.equal(t.jugados, 1)
})
test('tarjeta: ignora filas de otros jugadores', () => {
  const t = tarjeta(J('a', 0), filas('b', pares()), cancha)
  assert.equal(t.jugados, 0)
})

// --- puedeFirmar ---
test('firmar: 18 hoyos coincidentes → sí', () =>
  assert.ok(puedeFirmar(tarjeta(J('a', 0), filas('a', pares()), cancha))))
test('firmar: falta la anotación del marcador → no', () =>
  assert.ok(!puedeFirmar(tarjeta(J('a', 0), filas('a', pares(), false), cancha))))
test('firmar: 17 hoyos → no', () => {
  const g: (number | null)[] = pares(); g[17] = null
  assert.ok(!puedeFirmar(tarjeta(J('a', 0), filas('a', g), cancha)))
})

// --- permisos de anotación ---
const jugadores = [J('a', 10, 1, 'b'), J('b', 10, 1, 'a'), J('c', 10, 2, 'a')]
const sin = new Set<string>()
test('anotar: jugador en su propia tarjeta → sí', () =>
  assert.ok(puedeAnotar(jugadores[0], { jugador: 'a', hoyo: 1, por_marcador: false, golpes: 4 }, sin, false)))
test('anotar: jugador no puede anotar como marcador de sí mismo', () =>
  assert.ok(!puedeAnotar(jugadores[0], { jugador: 'a', hoyo: 1, por_marcador: true, golpes: 4 }, sin, false)))
test('anotar: marcador anota a su marcado → sí', () =>
  assert.ok(puedeAnotar(jugadores[0], { jugador: 'b', hoyo: 1, por_marcador: true, golpes: 4 }, sin, false)))
test('anotar: marcador no puede anotar como si fuera el jugador', () =>
  assert.ok(!puedeAnotar(jugadores[0], { jugador: 'b', hoyo: 1, por_marcador: false, golpes: 4 }, sin, false)))
test('anotar: nadie anota a quien no marca', () =>
  assert.ok(!puedeAnotar(jugadores[1], { jugador: 'c', hoyo: 1, por_marcador: true, golpes: 4 }, sin, false)))
test('anotar: hoyo fuera de rango (0 y 19) → no', () => {
  assert.ok(!puedeAnotar(jugadores[0], { jugador: 'a', hoyo: 0, por_marcador: false, golpes: 4 }, sin, false))
  assert.ok(!puedeAnotar(jugadores[0], { jugador: 'a', hoyo: 19, por_marcador: false, golpes: 4 }, sin, false))
})
test('anotar: golpes 0, 16, decimales o texto → no', () => {
  for (const golpes of [0, 16, 4.5, '4' as unknown as number])
    assert.ok(!puedeAnotar(jugadores[0], { jugador: 'a', hoyo: 1, por_marcador: false, golpes }, sin, false))
})
test('anotar: golpes 1 y 15 (límites) → sí', () => {
  for (const golpes of [1, 15])
    assert.ok(puedeAnotar(jugadores[0], { jugador: 'a', hoyo: 1, por_marcador: false, golpes }, sin, false))
})
test('anotar: tarjeta firmada queda bloqueada', () =>
  assert.ok(!puedeAnotar(jugadores[0], { jugador: 'a', hoyo: 1, por_marcador: false, golpes: 4 }, new Set(['a']), false)))
test('anotar: admin puede todo, incluso firmada', () =>
  assert.ok(puedeAnotar(jugadores[2], { jugador: 'a', hoyo: 1, por_marcador: true, golpes: 4 }, new Set(['a']), true)))

// --- ranking ---
test('ranking stableford: ordena por puntos', () => {
  const js = [J('a', 0), J('b', 18)]
  const r = ranking(js, [...filas('a', pares()), ...filas('b', pares())], cancha)
  assert.deepEqual(r.stableford.map(x => x.id), ['b', 'a'])
  assert.equal(r.stableford[0].pos, 1)
})
test('ranking stableford: desempata por últimos 9', () => {
  // ambos 36 pts; "a" hace los 9 primeros mejor, "b" los últimos 9
  const ga = pares(); ga[0] = 3; ga[17] = 5
  const gb = pares(); gb[0] = 5; gb[17] = 3
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', ga), ...filas('b', gb)], cancha)
  assert.equal(r.stableford[0].puntos, r.stableford[1].puntos)
  assert.deepEqual(r.stableford.map(x => x.id), ['b', 'a'])
})
test('ranking stableford: empate total comparte posición', () => {
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', pares()), ...filas('b', pares())], cancha)
  assert.deepEqual(r.stableford.map(x => x.pos), [1, 1])
})
test('ranking gross: menor sobre el par primero, sin hoyos al final', () => {
  const gb = pares(); gb[0] = 6
  const r = ranking([J('a', 0), J('b', 0), J('c', 0)], [...filas('b', gb), ...filas('a', pares())], cancha)
  assert.deepEqual(r.gross.map(x => x.id), ['a', 'b', 'c'])
})
test('skins: gana el mejor neto único; empate acumula', () => {
  const ga = pares(); ga[1] = 3           // hoyo 1 empate, hoyo 2 gana "a" (vale 2)
  const gb = pares(); gb[2] = 2           // hoyo 3 gana "b"
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', ga), ...filas('b', gb)], cancha)
  assert.deepEqual(r.skins.ganados.find(s => s.hoyo === 2), { hoyo: 2, id: 'a', valor: 2 })
  assert.deepEqual(r.skins.ganados.find(s => s.hoyo === 3), { hoyo: 3, id: 'b', valor: 1 })
})
test('skins: usa neto, no gross', () => {
  // ambos hacen par en el hoyo 9 (HCP 1); "b" recibe golpe ahí → neto 3 contra 4, gana "b"
  const ga = pares(); ga[8] = 4
  const gb = pares(); gb[8] = 4
  const r = ranking([J('a', 0), J('b', 1)], [...filas('a', ga), ...filas('b', gb)], cancha)
  assert.equal(r.skins.ganados.find(s => s.hoyo === 9)?.id, 'b')
})
test('skins: se detiene en el primer hoyo que no completaron todos', () => {
  const gb: (number | null)[] = pares(); gb[1] = null
  const ga = pares(); ga[2] = 2
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', ga), ...filas('b', gb)], cancha)
  assert.ok(r.skins.ganados.every(s => s.hoyo < 2))
  assert.equal(r.skins.hastaHoyo, 1)
})
test('copa por grupos: suma los 2 mejores Stableford de cada hoyo', () => {
  const js = [J('a', 0, 1), J('b', 0, 1), J('c', 0, 1), J('d', 0, 2)]
  const gc = pares().map(g => g + 2) // "c" hace 0 pts por hoyo: no suma
  const r = ranking(js, [...filas('a', pares()), ...filas('b', pares()), ...filas('c', gc), ...filas('d', pares())], cancha)
  assert.equal(r.grupos.find(g => g.grupo === 1)?.puntos, 72)
  assert.equal(r.grupos.find(g => g.grupo === 2)?.puntos, 36)
  assert.equal(r.grupos[0].grupo, 1)
})
test('ranking sin jugadores no falla', () => {
  const r = ranking([], [], cancha)
  assert.deepEqual(r.stableford, [])
  assert.deepEqual(r.skins.ganados, [])
})
