// npm test   (Node 24 ejecuta TypeScript sin compilar)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hcpJuego, golpesRecibidos, puntosStableford, estadoHoyo, tarjeta, ranking,
  puedeAnotar, puedeFirmar, marcaPGA, limpiarNombre, posicionEnVivo, armarGrupos, golpesDemo, vsNeto, nuevoId, limpiarIndice, sumarAGrupo, sacarDeGrupo, sePuedeQuitar, porHandicap, gruposParaMostrar, moverAGrupo, intercambiar, gruposSolos, horaSalida, type Cancha, type Jugador, type Golpe,
} from './golf.ts'

const par = [4, 4, 3, 4, 5, 4, 4, 3, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4]
const hcp = [5, 7, 15, 3, 13, 11, 17, 9, 1, 6, 8, 16, 4, 14, 12, 18, 10, 2]
const cancha: Cancha = { par, hcp, slope: 113, rating: 70 }

const J = (id: string, indice: number, grupo = 1, marca = '', noJuega = false): Jugador =>
  ({ id, nombre: id, indice, grupo, marca, ...(noJuega && { noJuega }) })

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
test('ranking stableford: a igual puntaje gana el menor neto total (golpes − índice)', () => {
  // ambos 36 pts; "b" (índice 1,4, recibe en el 18 y hace bogey ahí): 71 − 1,4 = 69,6 contra 70 − 0 de "a"
  const gb = pares(); gb[17] = 5
  const r = ranking([J('a', 0), J('b', 1.4)], [...filas('a', pares()), ...filas('b', gb)], cancha)
  assert.equal(r.stableford[0].puntos, r.stableford[1].puntos)
  assert.deepEqual(r.stableford.map(x => [x.id, x.pos]), [['b', 1], ['a', 2]])
})
test('ranking stableford: empate total comparte posición', () => {
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', pares()), ...filas('b', pares())], cancha)
  assert.deepEqual(r.stableford.map(x => x.pos), [1, 1])
})
test('skins: 1 punto a quien haga menos golpes en el hoyo', () => {
  const ga = pares(); ga[1] = 3
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', ga), ...filas('b', pares())], cancha)
  assert.deepEqual(r.skins.ganados.find(s => s.hoyo === 2), { hoyo: 2, ids: ['a'], valor: 1 })
})
test('skins: empate de 2 reparte 0,5 a cada uno', () => {
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', pares()), ...filas('b', pares())], cancha)
  assert.deepEqual(r.skins.ganados[0], { hoyo: 1, ids: ['a', 'b'], valor: 0.5 })
  assert.equal(r.skins.porJugador.a, 9)
  assert.equal(r.skins.porJugador.b, 9)
})
test('skins: empate de 3 reparte un tercio', () => {
  const r = ranking([J('a', 0), J('b', 0), J('c', 0)], ['a', 'b', 'c'].flatMap(id => filas(id, pares())), cancha)
  assert.equal(r.skins.ganados[0].valor, 1 / 3)
  assert.ok(Math.abs(r.skins.porJugador.a - 6) < 1e-9)
})
test('skins: el empate no se acumula al hoyo siguiente', () => {
  const ga = pares(); ga[1] = 3 // hoyo 1 empatan, hoyo 2 gana "a" y vale solo 1
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', ga), ...filas('b', pares())], cancha)
  assert.equal(r.skins.ganados.find(s => s.hoyo === 2)?.valor, 1)
  assert.equal(r.skins.porJugador.a, 0.5 + 1 + 16 * 0.5)
})
test('skins: los puntos repartidos suman 1 por hoyo completo', () => {
  const ga = pares(); ga[0] = 3; ga[5] = 6
  const gb = pares(); gb[5] = 3
  const r = ranking([J('a', 0), J('b', 0), J('c', 0)], [...filas('a', ga), ...filas('b', gb), ...filas('c', pares())], cancha)
  const total = Object.values(r.skins.porJugador).reduce((x, y) => x + y, 0)
  assert.ok(Math.abs(total - 18) < 1e-9)
})
test('skins: usa gross, el hándicap no cuenta', () => {
  // ambos hacen par en el hoyo 9 (HCP 1); "b" recibe golpe ahí, pero en gross empatan
  const r = ranking([J('a', 0), J('b', 1)], [...filas('a', pares()), ...filas('b', pares())], cancha)
  assert.deepEqual(r.skins.ganados.find(s => s.hoyo === 9)?.ids, ['a', 'b'])
})
test('skins: gross gana aunque el otro reciba golpes', () => {
  const ga = pares(); ga[8] = 3 // "a" birdie bruto; "b" par con golpe recibido (neto 3) → igual gana "a"
  const r = ranking([J('a', 0), J('b', 1)], [...filas('a', ga), ...filas('b', pares())], cancha)
  assert.deepEqual(r.skins.ganados.find(s => s.hoyo === 9)?.ids, ['a'])
})
test('skins: hoyo que alguien no ha jugado no cuenta, los demás sí', () => {
  const gb: (number | null)[] = pares(); gb[1] = null
  const ga = pares(); ga[2] = 2
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', ga), ...filas('b', gb)], cancha)
  assert.equal(r.skins.ganados.find(s => s.hoyo === 2), undefined)
  assert.deepEqual(r.skins.ganados.find(s => s.hoyo === 3)?.ids, ['a'])
  assert.equal(r.skins.jugados, 17)
})
// --- juego de grupo: 1 punto por hoyo al mejor neto dentro del grupo ---
const enGrupo = (r: ReturnType<typeof ranking>, g: number, id: string) =>
  r.grupos.find(x => x.grupo === g)?.jugadores.find(j => j.id === id)?.puntos
test('grupo: 1 punto al mejor neto del grupo en el hoyo', () => {
  const ga = pares(); ga[0] = 3
  const r = ranking([J('a', 0, 1), J('b', 0, 1), J('c', 0, 1)], [...filas('a', ga), ...filas('b', pares()), ...filas('c', pares())], cancha)
  assert.ok(Math.abs(enGrupo(r, 1, 'a')! - (1 + 17 / 3)) < 1e-9)
})
test('grupo: empate se reparte; cada hoyo suma 1', () => {
  const r = ranking([J('a', 0, 1), J('b', 0, 1), J('c', 0, 1)], ['a', 'b', 'c'].flatMap(id => filas(id, pares())), cancha)
  const total = r.grupos[0].jugadores.reduce((x, j) => x + j.puntos, 0)
  assert.ok(Math.abs(total - 18) < 1e-9)
  assert.ok(Math.abs(enGrupo(r, 1, 'b')! - 6) < 1e-9)
})
test('grupo: usa neto (golpe recibido cuenta)', () => {
  // en el hoyo 9 (HCP 1) "b" recibe golpe: par bruto = neto 3, gana a "a" que hizo par
  const r = ranking([J('a', 0, 1), J('b', 1, 1)], [...filas('a', pares()), ...filas('b', pares())], cancha)
  assert.equal(r.grupos[0].hoyos.find(h => h.hoyo === 9)?.ids.join(), 'b')
})
test('grupo: cada grupo juega aparte', () => {
  const gd = pares().map(g => g - 1) // "d" juega mejor, pero en otro grupo
  const r = ranking([J('a', 0, 1), J('b', 0, 1), J('d', 0, 2)], [...filas('a', pares()), ...filas('b', pares()), ...filas('d', gd)], cancha)
  assert.ok(Math.abs(enGrupo(r, 1, 'a')! - 6) < 1e-9) // grupo de 2: 9 × 2/3
  assert.ok(Math.abs(enGrupo(r, 2, 'd')! - 6) < 1e-9) // solo: 18 × 1/3
})
test('grupo: en grupo de 2 los puntos valen 2/3 (mismo promedio que en grupo de 3)', () => {
  const ga = pares(); ga[0] = 3
  const r = ranking([J('a', 0, 1), J('b', 0, 1)], [...filas('a', ga), ...filas('b', pares())], cancha)
  assert.ok(Math.abs(enGrupo(r, 1, 'a')! - (1 + 17 / 2) * 2 / 3) < 1e-9)
  assert.ok(Math.abs(enGrupo(r, 1, 'b')! - (17 / 2) * 2 / 3) < 1e-9)
})
test('grupo: en grupo de 3 los puntos no se escalan', () => {
  const r = ranking([J('a', 0, 1), J('b', 0, 1), J('c', 0, 1)], ['a', 'b', 'c'].flatMap(id => filas(id, pares())), cancha)
  assert.ok(r.grupos[0].jugadores.every(j => Math.abs(j.puntos - 6) < 1e-9))
})
test('grupo: los hoyos del grupo guardan el valor sin escalar (1 por hoyo)', () => {
  const r = ranking([J('a', 0, 1), J('b', 0, 1)], [...filas('a', pares()), ...filas('b', pares())], cancha)
  assert.ok(r.grupos[0].hoyos.every(h => h.valor === 0.5))
})
test('grupo: hoyo que alguien del grupo no ha jugado no cuenta', () => {
  const gb: (number | null)[] = pares(); gb[4] = null
  const r = ranking([J('a', 0, 1), J('b', 0, 1)], [...filas('a', pares()), ...filas('b', gb)], cancha)
  assert.equal(r.grupos[0].hoyos.length, 17)
  assert.equal(r.grupos[0].hoyos.find(h => h.hoyo === 5), undefined)
})
test('grupo: jugadores ordenados por puntos y grupos por número', () => {
  const gb = pares(); gb[0] = 3
  const r = ranking([J('x', 0, 2), J('a', 0, 1), J('b', 0, 1)], [...filas('a', pares()), ...filas('b', gb), ...filas('x', pares())], cancha)
  assert.deepEqual(r.grupos.map(g => g.grupo), [1, 2])
  assert.deepEqual(r.grupos[0].jugadores.map(j => j.id), ['b', 'a'])
})
test('ranking sin jugadores no falla', () => {
  const r = ranking([], [], cancha)
  assert.deepEqual(r.stableford, [])
  assert.deepEqual(r.skins.ganados, [])
  assert.deepEqual(r.grupos, [])
})

// --- símbolo de la tarjeta estilo PGA (sobre golpes brutos) ---
test('PGA: par sin marca, birdie círculo, bogey cuadrado', () => {
  assert.equal(marcaPGA(4, 4), 'par')
  assert.equal(marcaPGA(3, 4), 'birdie')
  assert.equal(marcaPGA(5, 4), 'bogey')
})
test('PGA: eagle o mejor y doble bogey o peor', () => {
  assert.equal(marcaPGA(3, 5), 'eagle')
  assert.equal(marcaPGA(1, 4), 'eagle')
  assert.equal(marcaPGA(6, 4), 'doble')
  assert.equal(marcaPGA(10, 3), 'doble')
})
test('PGA: sin golpes → null', () => assert.equal(marcaPGA(null, 4), null))

// --- nombre editado por el admin ---
test('nombre: recorta espacios y acepta tildes', () => assert.equal(limpiarNombre('  J. Ñuñez  '), 'J. Ñuñez'))
test('nombre: vacío o solo espacios → null', () => {
  assert.equal(limpiarNombre(''), null)
  assert.equal(limpiarNombre('   '), null)
})
test('nombre: más de 24 caracteres → null', () => {
  assert.equal(limpiarNombre('x'.repeat(24)), 'x'.repeat(24))
  assert.equal(limpiarNombre('x'.repeat(25)), null)
})
test('nombre: colapsa espacios internos', () => assert.equal(limpiarNombre('Juan   Pablo'), 'Juan Pablo'))
test('nombre: rechaza < > (no HTML)', () => assert.equal(limpiarNombre('<b>Juan</b>'), null))
test('nombre: no texto → null', () => assert.equal(limpiarNombre(null as unknown as string), null))

// --- ranking general: suma de los 3 campeonatos ---
test('general: total = Stableford + Skins + Grupo', () => {
  const ga = pares(); ga[0] = 3 // "a" birdie en el 1: gana skin y punto de grupo
  const r = ranking([J('a', 0, 1), J('b', 0, 1)], [...filas('a', ga), ...filas('b', pares())], cancha)
  const a = r.general.find(f => f.id === 'a')!
  assert.equal(a.stableford, 37)
  assert.equal(a.skins, 1 + 17 * 0.5)
  assert.ok(Math.abs(a.grupo - (1 + 17 * 0.5) * 2 / 3) < 1e-9) // grupo de 2
  assert.ok(Math.abs(a.total - (37 + 9.5 + 9.5 * 2 / 3)) < 1e-9)
})
test('general: ordena por total y el líder va primero con pos 1', () => {
  const ga = pares(); ga[0] = 3
  const r = ranking([J('b', 0, 1), J('a', 0, 1)], [...filas('a', ga), ...filas('b', pares())], cancha)
  assert.deepEqual(r.general.map(f => [f.id, f.pos]), [['a', 1], ['b', 2]])
})
test('general: empate total comparte posición', () => {
  // cada uno solo en su grupo (gana sus 18), skins empatados (9 c/u), Stableford 36 → mismo total
  const r = ranking([J('a', 0, 1), J('b', 0, 2)], [...filas('a', pares()), ...filas('b', pares())], cancha)
  assert.deepEqual(r.general.map(f => f.pos), [1, 1])
})
test('general: ordena por total sumando los 3 campeonatos', () => {
  const ga = pares(); ga[0] = 3          // a: 37 stb, gana skin 1 → skins 1 + 17×0,5 = 9,5; grupo (solo) 18 → 64,5
  const gb = pares(); gb[1] = 3; gb[0] = 5 // b: 36 stb, gana skin 2, pierde 1 → 9,5; grupo 18 → 63,5
  const r = ranking([J('b', 0, 2), J('a', 0, 1)], [...filas('a', ga), ...filas('b', gb)], cancha)
  assert.deepEqual(r.general.map(f => f.id), ['a', 'b'])
})
test('general: trae los hoyos jugados de cada uno', () => {
  const r = ranking([J('a', 0, 1), J('b', 0, 1)], [...filas('a', hasta(pares(), 5)), ...filas('b', pares())], cancha)
  assert.equal(r.general.find(f => f.id === 'a')!.jugados, 5)
  assert.equal(r.general.find(f => f.id === 'b')!.jugados, 18)
})
test('general: sin hoyos jugados todos en 0', () => {
  const r = ranking([J('a', 0, 1), J('b', 0, 1)], [], cancha)
  assert.ok(r.general.every(f => f.total === 0))
})

// --- posición en vivo "a la misma altura" (los grupos salen uno después del otro) ---
const hasta = (g: number[], n: number) => g.map((x, i) => (i < n ? x : null))
test('en vivo: sin hoyos jugados → null', () => {
  assert.equal(posicionEnVivo([J('a', 0, 1)], [], cancha, 'a'), null)
})
test('en vivo: compara solo hasta mi último hoyo', () => {
  // "a" va en el hoyo 3 con birdie en el 1; "b" ya terminó y hace birdies del 4 en adelante: no cuentan
  const ga = hasta(pares(), 3); ga[0] = 3
  const gb = pares().map((x, i) => (i >= 3 ? x - 1 : x))
  const r = posicionEnVivo([J('a', 0, 1), J('b', 0, 2)], [...filas('a', ga), ...filas('b', gb)], cancha, 'a')!
  assert.equal(r.hoyo, 3)
  assert.deepEqual(r.general, { pos: 1, de: 2, empatado: false })
})
test('en vivo: no cuenta a quienes no han llegado a mi hoyo', () => {
  const r = posicionEnVivo([J('a', 0, 1), J('b', 0, 2), J('c', 0, 3)],
    [...filas('a', hasta(pares(), 9)), ...filas('b', pares()), ...filas('c', hasta(pares(), 4))], cancha, 'a')!
  assert.equal(r.general.de, 2)
})
test('en vivo: empate marca empatado y comparte puesto', () => {
  const r = posicionEnVivo([J('a', 0, 1), J('b', 0, 2)], [...filas('a', hasta(pares(), 5)), ...filas('b', pares())], cancha, 'a')!
  assert.deepEqual(r.general, { pos: 1, de: 2, empatado: true })
})
test('en vivo: segundo de tres en el general', () => {
  const gb = pares(); gb[0] = 3
  const gc = pares(); gc[0] = 5
  const r = posicionEnVivo([J('a', 0, 1), J('b', 0, 2), J('c', 0, 3)],
    [...filas('a', hasta(pares(), 2)), ...filas('b', gb), ...filas('c', gc)], cancha, 'a')!
  assert.equal(r.general.pos, 2)
  assert.equal(r.general.empatado, false)
})
test('en vivo: posición dentro del grupo (juego de grupo neto)', () => {
  const ga = hasta(pares(), 4)
  const gb = hasta(pares(), 4); gb[1] = 3
  const gc = hasta(pares(), 4); gc[2] = 4
  const r = posicionEnVivo([J('a', 0, 1), J('b', 0, 1), J('c', 0, 1), J('x', 0, 2)],
    [...filas('a', ga), ...filas('b', gb), ...filas('c', gc), ...filas('x', pares())], cancha, 'a')!
  assert.deepEqual(r.grupo, { pos: 2, de: 3, empatado: false })
})
test('en vivo: mi hoyo es el último seguido desde el 1 (si salté uno, cuenta hasta antes)', () => {
  const ga: (number | null)[] = hasta(pares(), 6); ga[3] = null
  const r = posicionEnVivo([J('a', 0, 1)], filas('a', ga), cancha, 'a')!
  assert.equal(r.hoyo, 3)
})

// --- gross en el ranking (para ver cómo van los demás en golpes reales) ---
test('ranking stableford trae gross y vs par de cada jugador', () => {
  const ga = hasta(pares(), 3); ga[0] = 6 // doble bogey en el 1
  const r = ranking([J('a', 0, 1)], filas('a', ga), cancha)
  assert.equal(r.stableford[0].gross, 6 + 4 + 3)
  assert.equal(r.stableford[0].vsPar, 2)
  assert.equal(r.stableford[0].jugados, 3)
})

// --- sorteo de grupos (admin) ---
const azar = (semilla: number) => () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646
const ids = (n: number) => Array.from({ length: n }, (_, i) => 'j' + i)
const tamanos = (g: ReturnType<typeof armarGrupos>) =>
  [...new Set(g.map(x => x.grupo))].map(n => g.filter(x => x.grupo === n).length).sort((a, b) => b - a)
test('grupos: 14 jugadores → dos de 4 y dos de 3', () => assert.deepEqual(tamanos(armarGrupos(ids(14), azar(1))), [4, 4, 3, 3]))
test('grupos: 11 jugadores → 4, 4, 3 (nunca de 2)', () => assert.deepEqual(tamanos(armarGrupos(ids(11), azar(1))), [4, 4, 3]))
test('grupos: 12 jugadores → cuatro de 3', () => assert.deepEqual(tamanos(armarGrupos(ids(12), azar(1))), [3, 3, 3, 3]))
test('grupos: 13 jugadores → 4, 3, 3, 3', () => assert.deepEqual(tamanos(armarGrupos(ids(13), azar(1))), [4, 3, 3, 3]))
test('grupos: 4 jugadores → uno de 4 (no 2 y 2)', () => assert.deepEqual(tamanos(armarGrupos(ids(4), azar(1))), [4]))
test('grupos: 2 jugadores → uno de 2 (no alcanza para más)', () => assert.deepEqual(tamanos(armarGrupos(ids(2), azar(1))), [2]))
test('grupos: cada jugador aparece una vez', () => {
  const g = armarGrupos(ids(11), azar(7))
  assert.deepEqual(g.map(x => x.id).sort(), ids(11).sort())
})
test('grupos: cada uno marca a otro de su grupo y todos son marcados una vez', () => {
  const g = armarGrupos(ids(11), azar(3))
  for (const x of g) {
    const m = g.find(y => y.id === x.marca)!
    assert.notEqual(x.marca, x.id)
    assert.equal(m.grupo, x.grupo)
  }
  assert.equal(new Set(g.map(x => x.marca)).size, 11)
})
test('grupos: con 14 cada grupo de 4 también cierra su cadena', () => {
  const g = armarGrupos(ids(14), azar(5))
  for (const x of g) assert.equal(g.find(y => y.id === x.marca)!.grupo, x.grupo)
  assert.equal(new Set(g.map(x => x.marca)).size, 14)
})
test('grupos: el sorteo cambia con el azar', () => {
  const a = armarGrupos(ids(11), azar(1)).map(x => x.id + x.grupo).join()
  const b = armarGrupos(ids(11), azar(99)).map(x => x.id + x.grupo).join()
  assert.notEqual(a, b)
})
test('grupos: numerados desde 1', () => {
  assert.deepEqual([...new Set(armarGrupos(ids(9), azar(2)).map(x => x.grupo))].sort(), [1, 2, 3])
})
test('grupos: un solo jugador no se marca a sí mismo', () => {
  assert.deepEqual(armarGrupos(['a'], azar(1)), [{ id: 'a', grupo: 1, marca: '' }])
})
test('grupos: sin jugadores → vacío', () => assert.deepEqual(armarGrupos([], azar(1)), []))

// --- scores de demo (para mostrar la app llena) ---
test('demo: 18 golpes entre 1 y 10', () => {
  const g = golpesDemo(J('a', 15), cancha, azar(5))
  assert.equal(g.length, 18)
  assert.ok(g.every(x => Number.isInteger(x) && x >= 1 && x <= 10))
})
test('demo: mismo azar → mismos golpes', () => {
  assert.deepEqual(golpesDemo(J('a', 15), cancha, azar(9)), golpesDemo(J('a', 15), cancha, azar(9)))
})
test('demo: el de menor hándicap hace en promedio menos golpes', () => {
  const r = azar(11), prom = (ind: number) => {
    let t = 0
    for (let k = 0; k < 40; k++) t += golpesDemo(J('x', ind), cancha, r).reduce((a, b) => a + b, 0)
    return t / 40
  }
  const bueno = prom(2.7), malo = prom(22.1)
  assert.ok(bueno < malo, `${bueno} < ${malo}`)
  assert.ok(Math.abs(bueno - 73) < 4, `bueno ${bueno}`)   // ~par 70 + hándicap 3
  assert.ok(Math.abs(malo - 91) < 5, `malo ${malo}`)      // ~par 70 + hándicap 21
})

// --- no juega / retirado: sale de los bonus para no bloquearlos ---
test('no juega: sus hoyos vacíos no bloquean los skins de los demás', () => {
  const ga = pares(); ga[0] = 3
  const r = ranking([J('a', 0, 1), J('b', 0, 1), J('x', 0, 2, '', true)], [...filas('a', ga), ...filas('b', pares())], cancha)
  assert.equal(r.skins.jugados, 18)
  assert.equal(r.skins.porJugador.x, undefined)
})
test('no juega: retirado a mitad tampoco bloquea ni gana skins', () => {
  const gx = hasta(pares().map(g => g - 1), 4) // jugó 4 hoyos con birdies y se fue
  const r = ranking([J('a', 0, 1), J('b', 0, 1), J('x', 0, 1, '', true)], [...filas('a', pares()), ...filas('b', pares()), ...filas('x', gx)], cancha)
  assert.equal(r.skins.jugados, 18)
  assert.equal(r.skins.porJugador.x, undefined)
})
test('no juega: su grupo cuenta sin él y se escala por los que juegan', () => {
  const r = ranking([J('a', 0, 1), J('b', 0, 1), J('x', 0, 1, '', true)], [...filas('a', pares()), ...filas('b', pares())], cancha)
  assert.equal(r.grupos[0].hoyos.length, 18)
  assert.deepEqual(r.grupos[0].jugadores.map(j => j.id).sort(), ['a', 'b'])
  assert.ok(Math.abs(enGrupo(r, 1, 'a')! - 6) < 1e-9)
})
test('no juega: sigue en la Copa con sus puntos y 0 de bonus en el General', () => {
  const r = ranking([J('a', 0, 1), J('x', 0, 1, '', true)], [...filas('a', pares()), ...filas('x', hasta(pares(), 9))], cancha)
  assert.equal(r.stableford.find(f => f.id === 'x')!.puntos, 18)
  const x = r.general.find(f => f.id === 'x')!
  assert.equal(x.skins + x.grupo, 0)
  assert.equal(x.total, 18)
})
test('no juega: grupo entero fuera no aparece en el Puto', () => {
  const r = ranking([J('a', 0, 1), J('x', 0, 2, '', true)], [...filas('a', pares())], cancha)
  assert.deepEqual(r.grupos.map(g => g.grupo), [1])
})
test('no juega: no tiene posición en vivo', () => {
  assert.equal(posicionEnVivo([J('a', 0, 1), J('x', 0, 1, '', true)], [...filas('a', pares()), ...filas('x', pares())], cancha, 'x'), null)
})

// --- vs neto: puntos contra jugar a tu hándicap (2 por hoyo) ---
test('vs neto: 2 por hoyo es jugar a tu hándicap (E)', () => assert.equal(vsNeto(18, 9), 0))
test('vs neto: más puntos que 2 por hoyo es positivo', () => assert.equal(vsNeto(21, 9), 3))
test('vs neto: menos es negativo', () => assert.equal(vsNeto(10, 9), -8))
test('vs neto: sin hoyos es 0', () => assert.equal(vsNeto(0, 0), 0))

// --- agregar / quitar jugadores desde el admin ---
test('id nuevo: del nombre, sin tildes ni espacios, en minúsculas', () => assert.equal(nuevoId('José Ñúñez', []), 'josenunez'))
test('id nuevo: si ya existe le suma un número', () => {
  assert.equal(nuevoId('VC', ['vc']), 'vc2')
  assert.equal(nuevoId('VC', ['vc', 'vc2']), 'vc3')
})
test('id nuevo: nombre sin letras ni números → "jugador"', () => assert.equal(nuevoId('...', []), 'jugador'))
test('id nuevo: máximo 16 caracteres', () => assert.equal(nuevoId('Maximiliano Covarrubias', []).length, 16))

test('índice: acepta punto o coma y un decimal', () => {
  assert.equal(limpiarIndice('13.4'), 13.4)
  assert.equal(limpiarIndice(' 13,4 '), 13.4)
  assert.equal(limpiarIndice('8'), 8)
})
test('índice: límites 0 y 54', () => {
  assert.equal(limpiarIndice('0'), 0)
  assert.equal(limpiarIndice('54'), 54)
  assert.equal(limpiarIndice('54.1'), null)
})
test('índice: vacío, texto, negativo o dos decimales → null', () => {
  for (const x of ['', 'abc', '-2', '13.45', '1e1']) assert.equal(limpiarIndice(x), null, x)
})

type A = { id: string; grupo: number; marca: string }
const cadena: A[] = [
  { id: 'a', grupo: 1, marca: 'b' }, { id: 'b', grupo: 1, marca: 'c' }, { id: 'c', grupo: 1, marca: 'a' },
  { id: 'd', grupo: 2, marca: 'e' }, { id: 'e', grupo: 2, marca: 'd' },
]
const marcados = (xs: A[]) => xs.map(x => x.marca).filter(Boolean).sort()
test('sumar: entra al grupo más chico', () => {
  assert.equal(sumarAGrupo(cadena, 'n').find(x => x.id === 'n')!.grupo, 2)
})
test('sumar: un grupo de 3 pasa a 4 (no se abre uno nuevo)', () => {
  const r = sumarAGrupo(cadena.filter(x => x.grupo === 1), 'n')
  assert.equal(r.find(x => x.id === 'n')!.grupo, 1)
  assert.equal(r.filter(x => x.grupo === 1).length, 4)
})
test('sumar: todos de 4 → entra al más chico igual, nunca queda solo', () => {
  const cuatro = (g: number) => ['a', 'b', 'c', 'd'].map((x, i, xs) => ({ id: `${x}${g}`, grupo: g, marca: `${xs[(i + 1) % 4]}${g}` }))
  const r = sumarAGrupo([...cuatro(1), ...cuatro(2)], 'n')
  const n = r.find(x => x.id === 'n')!
  assert.ok(n.marca)
  assert.equal(r.filter(x => x.grupo === n.grupo).length, 5)
})
test('sumar: queda en la cadena de marcadores (todos marcan y son marcados una vez)', () => {
  const r = sumarAGrupo(cadena, 'n')
  assert.deepEqual(marcados(r), r.map(x => x.id).sort())
  assert.ok(r.every(x => x.marca !== x.id))
  assert.ok(r.every(x => r.find(y => y.id === x.marca)!.grupo === x.grupo))
})
test('sumar: los otros grupos no cambian', () => {
  const r = sumarAGrupo(cadena, 'n')
  assert.deepEqual(r.filter(x => x.grupo === 1), cadena.filter(x => x.grupo === 1))
})
test('sumar: con un solo jugador en el grupo se marcan entre ellos', () => {
  const r = sumarAGrupo([{ id: 'a', grupo: 1, marca: '' }], 'n')
  assert.deepEqual(r, [{ id: 'a', grupo: 1, marca: 'n' }, { id: 'n', grupo: 1, marca: 'a' }])
})
test('sumar: sin jugadores parte el grupo 1, sin marcador', () => {
  assert.deepEqual(sumarAGrupo([], 'n'), [{ id: 'n', grupo: 1, marca: '' }])
})
test('sacar: quien lo marcaba pasa a marcar a quien él marcaba', () => {
  const r = sacarDeGrupo(cadena, 'b')
  assert.equal(r.find(x => x.id === 'b'), undefined)
  assert.equal(r.find(x => x.id === 'a')!.marca, 'c')
})
test('sacar: grupo que queda de 1 no se marca a sí mismo', () => {
  const r = sacarDeGrupo(cadena, 'e')
  assert.deepEqual(r.find(x => x.id === 'd'), { id: 'd', grupo: 2, marca: '' })
})
test('sacar: id que no está → sin cambios', () => assert.deepEqual(sacarDeGrupo(cadena, 'zz'), cadena))
test('quitar: cualquier jugador se puede quitar', () => assert.equal(sePuedeQuitar(J('vc', 22.1)), true))
test('quitar: el admin no (se quedaría sin admin)', () => assert.equal(sePuedeQuitar({ ...J('fc', 13.4), admin: true }), false))
test('id nuevo: no reutiliza el id de un jugador quitado (su PIN sería el mismo)', () =>
  assert.equal(nuevoId('VC', ['pm', 'vc']), 'vc2'))
test('grupo: en grupo de 4 cada hoyo vale 4/3 (mismo promedio que en grupo de 3)', () => {
  const ga = pares(); ga[0] = 3
  const r = ranking(['a', 'b', 'c', 'd'].map(id => J(id, 0, 1)), [...filas('a', ga), ...['b', 'c', 'd'].flatMap(id => filas(id, pares()))], cancha)
  assert.ok(Math.abs(enGrupo(r, 1, 'a')! - (1 + 17 / 4) * 4 / 3) < 1e-9)
  assert.ok(Math.abs(r.grupos[0].jugadores.reduce((x, j) => x + j.puntos, 0) - 24) < 1e-9) // 18 hoyos × 4/3
})

// --- orden de la tabla del admin ---
test('por hándicap: de menor a mayor índice', () =>
  assert.deepEqual(porHandicap([J('c', 22.1), J('a', 2.7), J('b', 13.4)]).map(j => j.id), ['a', 'b', 'c']))
test('por hándicap: mismo índice → por nombre', () =>
  assert.deepEqual(porHandicap([J('vc', 22.1), J('iu', 22.1)]).map(j => j.id), ['iu', 'vc']))
test('por hándicap: no cambia la lista original', () => {
  const js = [J('b', 5), J('a', 1)]
  porHandicap(js)
  assert.deepEqual(js.map(j => j.id), ['b', 'a'])
})

// --- pestaña Grupos: cada grupo en el orden de la cadena de marcadores ---
const cadenas = (gs: ReturnType<typeof gruposParaMostrar>) => gs.map(g => `${g.grupo}:${g.jugadores.map(j => j.id).join('>')}`)
test('grupos: ordenados por número de grupo', () =>
  assert.deepEqual(gruposParaMostrar([J('x', 5, 2, 'y'), J('y', 6, 2, 'x'), J('a', 1, 1, '')]).map(g => g.grupo), [1, 2]))
test('grupos: parte por el de menor índice y sigue a quién marca', () =>
  assert.deepEqual(cadenas(gruposParaMostrar([J('c', 20, 1, 'a'), J('a', 2, 1, 'b'), J('b', 15, 1, 'c')])), ['1:a>b>c']))
test('grupos: cadena al revés también se sigue', () =>
  assert.deepEqual(cadenas(gruposParaMostrar([J('a', 2, 1, 'c'), J('b', 15, 1, 'a'), J('c', 20, 1, 'b')])), ['1:a>c>b']))
test('grupos: cadena rota o marcador de otro grupo → el resto por índice', () =>
  assert.deepEqual(cadenas(gruposParaMostrar([J('a', 2, 1, 'z'), J('c', 20, 1, ''), J('b', 15, 1, '')])), ['1:a>b>c']))
test('grupos: jugador solo', () => assert.deepEqual(cadenas(gruposParaMostrar([J('a', 2, 3, '')])), ['3:a']))
test('grupos: sin jugadores → vacío', () => assert.deepEqual(gruposParaMostrar([]), []))
test('grupos: cada jugador aparece una sola vez', () => {
  const gs = gruposParaMostrar([J('a', 2, 1, 'b'), J('b', 15, 1, 'a'), J('c', 9, 1, 'a')])
  assert.deepEqual(gs[0].jugadores.map(j => j.id).sort(), ['a', 'b', 'c'])
})

// --- armar grupos a mano: mover e intercambiar jugadores ---
const g34: A[] = [
  { id: 'a', grupo: 1, marca: 'b' }, { id: 'b', grupo: 1, marca: 'c' }, { id: 'c', grupo: 1, marca: 'a' },
  { id: 'd', grupo: 2, marca: 'e' }, { id: 'e', grupo: 2, marca: 'f' }, { id: 'f', grupo: 2, marca: 'g' }, { id: 'g', grupo: 2, marca: 'd' },
]
const cadenaOk = (xs: A[]) => {
  for (const x of xs) {
    const tam = xs.filter(y => y.grupo === x.grupo).length
    if (tam === 1) { assert.equal(x.marca, ''); continue }
    const m = xs.find(y => y.id === x.marca)
    assert.ok(m && m.id !== x.id && m.grupo === x.grupo, `${x.id} marca a alguien de su grupo`)
    assert.equal(xs.filter(y => y.marca === x.id).length, 1, `${x.id} marcado una vez`)
  }
}
const tamDe = (xs: A[], g: number) => xs.filter(x => x.grupo === g).length
test('mover: de un grupo de 4 a uno de 3 → quedan 4 y 3', () => {
  const r = moverAGrupo(g34, 'd', 1)
  assert.equal(r.find(x => x.id === 'd')!.grupo, 1)
  assert.deepEqual([tamDe(r, 1), tamDe(r, 2)], [4, 3])
  cadenaOk(r)
})
test('mover: deja un grupo de 2 (se marcan entre ellos)', () => {
  const r = moverAGrupo(g34, 'a', 2)
  assert.equal(tamDe(r, 1), 2)
  const [x, y] = r.filter(z => z.grupo === 1)
  assert.equal(x.marca, y.id); assert.equal(y.marca, x.id)
  cadenaOk(r)
})
test('mover: a un grupo nuevo (0) crea el grupo siguiente', () => {
  const r = moverAGrupo(g34, 'g', 0)
  assert.equal(r.find(x => x.id === 'g')!.grupo, 3)
  assert.equal(r.find(x => x.id === 'g')!.marca, '') // solo hasta que llegue otro
  cadenaOk(r)
})
test('mover: dos al grupo nuevo quedan marcándose entre ellos', () => {
  const r = moverAGrupo(moverAGrupo(g34, 'g', 0), 'f', 3)
  assert.equal(tamDe(r, 3), 2)
  cadenaOk(r)
})
test('mover: si un grupo queda vacío, los números se corren (sin huecos)', () => {
  const dos: A[] = [{ id: 'a', grupo: 1, marca: '' }, { id: 'b', grupo: 2, marca: 'c' }, { id: 'c', grupo: 2, marca: 'b' }]
  const r = moverAGrupo(dos, 'a', 2)
  assert.deepEqual([...new Set(r.map(x => x.grupo))], [1])
  cadenaOk(r)
})
test('mover: al mismo grupo no cambia nada', () => assert.deepEqual(moverAGrupo(g34, 'a', 1), g34))
test('mover: jugador que no existe → sin cambios', () => assert.deepEqual(moverAGrupo(g34, 'zz', 1), g34))
test('mover: a un grupo que no existe (99) → va a un grupo nuevo', () => {
  const r = moverAGrupo(g34, 'a', 99)
  assert.equal(r.find(x => x.id === 'a')!.grupo, 3)
  cadenaOk(r)
})
test('intercambiar: cada uno pasa al grupo del otro y los tamaños no cambian', () => {
  const r = intercambiar(g34, 'a', 'd')
  assert.equal(r.find(x => x.id === 'a')!.grupo, 2)
  assert.equal(r.find(x => x.id === 'd')!.grupo, 1)
  assert.deepEqual([tamDe(r, 1), tamDe(r, 2)], [3, 4])
  cadenaOk(r)
})
test('intercambiar: toma el lugar del otro en la cadena (quien marcaba a uno ahora marca al otro)', () => {
  const r = intercambiar(g34, 'a', 'd')
  assert.equal(r.find(x => x.id === 'c')!.marca, 'd') // c marcaba a "a"
  assert.equal(r.find(x => x.id === 'g')!.marca, 'a') // g marcaba a "d"
  assert.equal(r.find(x => x.id === 'a')!.marca, 'e') // "a" marca a quien marcaba "d"
})
test('intercambiar: del mismo grupo o consigo mismo → sin cambios', () => {
  assert.deepEqual(intercambiar(g34, 'a', 'b'), g34)
  assert.deepEqual(intercambiar(g34, 'a', 'a'), g34)
})
test('intercambiar: con alguien que no existe → sin cambios', () => assert.deepEqual(intercambiar(g34, 'a', 'zz'), g34))
test('intercambiar: entre grupos de 2', () => {
  const p: A[] = [{ id: 'a', grupo: 1, marca: 'b' }, { id: 'b', grupo: 1, marca: 'a' }, { id: 'c', grupo: 2, marca: 'd' }, { id: 'd', grupo: 2, marca: 'c' }]
  const r = intercambiar(p, 'a', 'c')
  assert.deepEqual(r.filter(x => x.grupo === 1).map(x => x.id).sort(), ['b', 'c'])
  cadenaOk(r)
})
test('solos: lista los grupos que quedaron con 1 jugador (nadie lo marca)', () => {
  assert.deepEqual(gruposSolos(moverAGrupo(g34, 'g', 0)), [3])
  assert.deepEqual(gruposSolos(g34), [])
})

// --- sorteo con los que llegan tarde: van en el último grupo, que es de 4 (los de 3 salen siempre primero) ---
const ultimo = (g: ReturnType<typeof armarGrupos>) => Math.max(...g.map(x => x.grupo))
const del = (g: ReturnType<typeof armarGrupos>, n: number) => g.filter(x => x.grupo === n).map(x => x.id).sort()
const enOrden = (g: ReturnType<typeof armarGrupos>) => [...new Set(g.map(x => x.grupo))].sort((a, b) => a - b).map(n => g.filter(x => x.grupo === n).length)
test('tarde: 2 que llegan tarde van en el último grupo (de 4, completado con 2 sorteados)', () => {
  const g = armarGrupos(ids(14), azar(1), ['j3', 'j9'])
  const u = del(g, ultimo(g))
  assert.ok(u.includes('j3') && u.includes('j9'))
  assert.equal(u.length, 4)
})
test('tarde: con atrasados los grupos de 3 siguen saliendo primero (3, 3, 4, 4)', () => {
  for (const tarde of [['j5'], ['j3', 'j9'], ['j7', 'j8', 'j10'], ['j0', 'j1', 'j2', 'j13']])
    assert.deepEqual(enOrden(armarGrupos(ids(14), azar(2), tarde)), [3, 3, 4, 4], tarde.join())
})
test('tarde: 1 solo va en el último grupo', () => {
  const g = armarGrupos(ids(14), azar(2), ['j5'])
  assert.ok(del(g, ultimo(g)).includes('j5'))
})
test('tarde: 4 que llegan tarde forman el último grupo exacto', () => {
  const g = armarGrupos(ids(14), azar(3), ['j0', 'j1', 'j2', 'j13'])
  assert.deepEqual(del(g, ultimo(g)), ['j0', 'j1', 'j13', 'j2'])
})
test('tarde: 3 que llegan tarde van juntos en el último grupo de 4', () => {
  const g = armarGrupos(ids(14), azar(4), ['j7', 'j8', 'j10'])
  const u = del(g, ultimo(g))
  assert.ok(['j10', 'j7', 'j8'].every(x => u.includes(x)))
  assert.equal(u.length, 4)
})
test('tarde: 7 que llegan tarde ocupan los dos últimos grupos', () => {
  const tarde = ['j0', 'j1', 'j2', 'j3', 'j4', 'j5', 'j6']
  const g = armarGrupos(ids(14), azar(5), tarde)
  const u = ultimo(g)
  assert.ok(tarde.every(x => [...del(g, u), ...del(g, u - 1)].includes(x)))
  assert.deepEqual(enOrden(g), [3, 3, 4, 4])
})
test('tarde: el resto se sortea igual y todos marcan dentro de su grupo', () => {
  const g = armarGrupos(ids(14), azar(6), ['j3', 'j9'])
  assert.deepEqual(g.map(x => x.id).sort(), ids(14).sort())
  for (const x of g) assert.equal(g.find(y => y.id === x.marca)!.grupo, x.grupo)
  assert.equal(new Set(g.map(x => x.marca)).size, 14)
})
test('tarde: ids que no existen se ignoran', () => {
  assert.deepEqual(tamanos(armarGrupos(ids(14), azar(7), ['nadie'])), [4, 4, 3, 3])
})
test('tarde: sin lista sortea como siempre', () => {
  assert.deepEqual(armarGrupos(ids(14), azar(8), []), armarGrupos(ids(14), azar(8)))
})
test('orden: los grupos de 3 salen primero (14 → 3, 3, 4, 4)', () => assert.deepEqual(enOrden(armarGrupos(ids(14), azar(1))), [3, 3, 4, 4]))
test('orden: 11 → 3, 4, 4', () => assert.deepEqual(enOrden(armarGrupos(ids(11), azar(1))), [3, 4, 4]))
test('orden: 13 → 3, 3, 3, 4', () => assert.deepEqual(enOrden(armarGrupos(ids(13), azar(1))), [3, 3, 3, 4]))

// --- hora de salida: el grupo 1 sale a la primera hora y cada grupo siguiente N minutos después ---
test('salida: grupo 1 a las 10:00, grupo 2 a las 10:10, grupo 5 a las 10:40', () => {
  assert.equal(horaSalida(1, '10:00', 10), '10:00')
  assert.equal(horaSalida(2, '10:00', 10), '10:10')
  assert.equal(horaSalida(5, '10:00', 10), '10:40')
})
test('salida: pasa de hora (grupo 7 → 11:00) y rellena con cero', () => {
  assert.equal(horaSalida(7, '10:00', 10), '11:00')
  assert.equal(horaSalida(2, '09:55', 10), '10:05')
})
test('salida: otro intervalo (cada 8 min)', () => assert.equal(horaSalida(3, '08:00', 8), '08:16'))
