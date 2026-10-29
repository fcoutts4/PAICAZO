// Casos borde y empates del motor (npm test). Tablas completas de las reglas, matriz de permisos,
// sorteos de 0 a 40 jugadores y 200 torneos al azar (semilla fija) contra cálculos independientes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hcpJuego, golpesRecibidos, puntosStableford, estadoHoyo, tarjeta, ranking, puedeAnotar, puedeFirmar,
  posicionEnVivo, armarGrupos, sumarAGrupo, sacarDeGrupo, limpiarIndice, limpiarNombre, nuevoId, porHandicap,
  gruposParaMostrar, type Cancha, type Jugador, type Golpe,
} from './golf.ts'

const par = [4, 4, 4, 5, 3, 4, 4, 3, 4, 4, 4, 4, 5, 3, 4, 4, 3, 4]
const hcp = [6, 8, 16, 18, 4, 14, 10, 12, 2, 5, 7, 15, 17, 3, 13, 9, 11, 1]
const cancha: Cancha = { par, hcp, slope: 113, rating: 70 }
const J = (id: string, indice: number, grupo = 1, marca = ''): Jugador => ({ id, nombre: id, indice, grupo, marca })
const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const cerca = (a: number, b: number) => Math.abs(a - b) < 1e-9

/** Generador con semilla (mulberry32): los mismos casos en cada corrida. */
function azar(semilla: number) {
  let a = semilla >>> 0
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
/** Golpes validados (jugador y marcador iguales) para los hoyos dados; null = no jugado. */
function filas(jugador: string, golpes: (number | null)[]): Golpe[] {
  return golpes.flatMap((g, i) => (g == null ? [] : [false, true].map(m => ({ jugador, hoyo: i + 1, por_marcador: m, golpes: g }))))
}
const pares = () => [...par]

// ───────────── golpes recibidos: todo hándicap de −5 a 54 ─────────────
for (let hj = -5; hj <= 54; hj++) {
  test(`recibidos hj ${hj}: suman ${hj} en los 18 hoyos y los más difíciles reciben igual o más`, () => {
    const r = hcp.map(h => golpesRecibidos(hj, h))
    assert.equal(suma(r), hj)
    const porDificultad = [...hcp].sort((a, b) => a - b).map(h => golpesRecibidos(hj, h))
    for (let i = 1; i < 18; i++) assert.ok(porDificultad[i - 1] >= porDificultad[i], `HCP ${i} vs ${i + 1}`)
    assert.ok(Math.max(...r) - Math.min(...r) <= 1, 'reparto parejo: diferencia máxima 1 entre hoyos')
  })
}

// ───────────── Stableford: cada par, golpe y golpes recibidos ─────────────
const NOMBRE: Record<number, number> = { [-3]: 5, [-2]: 4, [-1]: 3, 0: 2, 1: 1 } // neto vs par → puntos
for (const p of [3, 4, 5]) for (const rec of [-1, 0, 1, 2, 3]) {
  test(`stableford par ${p} recibiendo ${rec}: golpes 1 a 15`, () => {
    for (let g = 1; g <= 15; g++) {
      const neto = g - rec - p
      const esperado = neto >= 2 ? 0 : NOMBRE[neto] ?? 2 - neto
      assert.equal(puntosStableford(g, p, rec), esperado, `golpes ${g}`)
    }
    assert.equal(puntosStableford(null, p, rec), null)
  })
}

// ───────────── hándicap de juego: índices 0 a 54 ─────────────
for (let i = 0; i <= 54; i++) {
  test(`hcp de juego índice ${i} y ${i}.5: 95% redondeado y nunca baja al subir el índice`, () => {
    assert.equal(hcpJuego(i, cancha), Math.round(i * 0.95))
    assert.ok(hcpJuego(i + 0.5, cancha) >= hcpJuego(i, cancha))
  })
}

// ───────────── estado del hoyo ─────────────
for (const [a, b, e] of [[null, null, 'vacio'], [4, null, 'pendiente'], [null, 4, 'pendiente'], [4, 4, 'ok'], [4, 5, 'conflicto'], [1, 15, 'conflicto'], [15, 15, 'ok']] as const) {
  test(`estado del hoyo: jugador ${a} y marcador ${b} → ${e}`, () => assert.equal(estadoHoyo(a, b), e))
}

// ───────────── permisos: matriz completa de quién anota qué ─────────────
const yo = J('yo', 10, 1, 'otro'), otro = J('otro', 10, 1, 'yo'), tercero = J('tercero', 10, 2, 'x')
for (const objetivo of ['yo', 'otro', 'tercero']) for (const porMarcador of [false, true]) for (const firmada of [false, true])
  for (const admin of [false, true]) for (const [hoyo, golpes, valido] of [[1, 4, true], [18, 1, true], [18, 15, true], [0, 4, false], [19, 4, false], [5, 0, false], [5, 16, false], [5, 4.5, false]] as const) {
    const permitido = valido && (admin || (!firmada && (porMarcador ? objetivo === yo.marca : objetivo === yo.id)))
    test(`anotar: ${objetivo}, ${porMarcador ? 'como marcador' : 'como jugador'}, ${firmada ? 'firmada' : 'abierta'}, ${admin ? 'admin' : 'jugador'}, hoyo ${hoyo}, golpes ${golpes} → ${permitido ? 'sí' : 'no'}`, () => {
      const f = new Set(firmada ? [objetivo] : [])
      assert.equal(puedeAnotar(yo, { jugador: objetivo, hoyo, por_marcador: porMarcador, golpes }, f, admin), permitido)
    })
  }
void otro; void tercero

// ───────────── empates en la Copa (Stableford) ─────────────
const conCambio = (cambios: Record<number, number>) => pares().map((g, i) => cambios[i + 1] ?? g)
test('empate Copa: mismo total, desempata quien hizo más en los últimos 9', () => {
  const a = conCambio({ 1: 3, 10: 5 }), b = conCambio({ 10: 3, 1: 5 }) // ambos 36, b mejor en la vuelta
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', a), ...filas('b', b)], cancha)
  assert.deepEqual(r.stableford.map(f => [f.id, f.pos]), [['b', 1], ['a', 2]])
})
test('empate Copa: mismos últimos 9, desempatan los últimos 6', () => {
  const a = conCambio({ 10: 3, 13: 6 }), b = conCambio({ 13: 4, 10: 5 }) // vuelta igual, b mejor del 13 en adelante
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', a), ...filas('b', b)], cancha)
  assert.equal(r.stableford[0].id, 'b')
})
test('empate Copa: mismos últimos 6, desempatan los últimos 3', () => {
  const a = conCambio({ 13: 4, 16: 5 }), b = conCambio({ 16: 3, 13: 6 })
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', a), ...filas('b', b)], cancha)
  assert.equal(r.stableford[0].id, 'b')
})
test('empate Copa: mismos últimos 3, desempata el último hoyo', () => {
  const a = conCambio({ 16: 3, 18: 5 }), b = conCambio({ 18: 3, 16: 5 })
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', a), ...filas('b', b)], cancha)
  assert.equal(r.stableford[0].id, 'b')
})
test('empate Copa total (todas las claves iguales): comparten puesto', () => {
  const r = ranking([J('a', 0), J('b', 0), J('c', 0)], ['a', 'b', 'c'].flatMap(id => filas(id, pares())), cancha)
  assert.deepEqual(r.stableford.map(f => f.pos), [1, 1, 1])
})
test('empate Copa: 1, 1 y el siguiente es 3º (no 2º)', () => {
  const c = conCambio({ 1: 5 })
  const r = ranking([J('a', 0), J('b', 0), J('c', 0)], [...filas('a', pares()), ...filas('b', pares()), ...filas('c', c)], cancha)
  assert.deepEqual(r.stableford.map(f => [f.id, f.pos]), [['a', 1], ['b', 1], ['c', 3]])
})
test('empate Copa: 1º solo, luego dos empatados en 2º, luego 4º', () => {
  const a = conCambio({ 1: 3 }), d = conCambio({ 1: 5 })
  const r = ranking([J('a', 0), J('b', 0), J('c', 0), J('d', 0)], [...filas('a', a), ...filas('b', pares()), ...filas('c', pares()), ...filas('d', d)], cancha)
  assert.deepEqual(r.stableford.map(f => f.pos), [1, 2, 2, 4])
})
test('empate Copa con hándicaps distintos: el neto iguala, comparten puesto', () => {
  // b recibe golpe en el hoyo 18 (HCP 1) y hace bogey ahí: mismo neto que a
  const b = conCambio({ 18: 5 })
  const r = ranking([J('a', 0), J('b', 1)], [...filas('a', pares()), ...filas('b', b)], cancha)
  assert.deepEqual(r.stableford.map(f => f.pos), [1, 1])
})
test('empate Copa: nadie ha jugado → todos 1º con 0', () => {
  const r = ranking([J('a', 0), J('b', 5), J('c', 30)], [], cancha)
  assert.ok(r.stableford.every(f => f.pos === 1 && f.puntos === 0))
})
test('empate Copa: el que lleva menos hoyos con igual puntaje empata (no se penaliza por ir atrás)', () => {
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', pares().map((g, i) => (i < 9 ? g : null))), ...filas('b', pares().map((g, i) => (i < 9 ? g : null)))], cancha)
  assert.deepEqual(r.stableford.map(f => f.pos), [1, 1])
})

// ───────────── empates en el Rey del Hoyo (skins) ─────────────
for (let k = 2; k <= 11; k++) {
  test(`Rey: ${k} empatados en el mejor golpe del hoyo 1 → 1/${k} cada uno, el resto nada`, () => {
    const js = Array.from({ length: 11 }, (_, i) => J(`j${i}`, 0))
    const fs = js.flatMap((j, i) => filas(j.id, conCambio({ 1: i < k ? 3 : 4 + (i % 2) })))
    const h1 = ranking(js, fs, cancha).skins.ganados.find(h => h.hoyo === 1)!
    assert.equal(h1.ids.length, k)
    assert.ok(cerca(h1.valor, 1 / k))
    assert.ok(cerca(h1.valor * h1.ids.length, 1))
  })
}
test('Rey: todos empatan los 18 → cada uno 18/N', () => {
  const js = Array.from({ length: 7 }, (_, i) => J(`j${i}`, i * 3))
  const r = ranking(js, js.flatMap(j => filas(j.id, pares())), cancha)
  assert.ok(js.every(j => cerca(r.skins.porJugador[j.id], 18 / 7)))
})
test('Rey: un hoyo sin jugar por uno solo no cuenta para nadie', () => {
  const r = ranking([J('a', 0), J('b', 0)], [...filas('a', pares()), ...filas('b', conCambio({}).map((g, i) => (i === 4 ? null : g)))], cancha)
  assert.equal(r.skins.jugados, 17)
  assert.ok(!r.skins.ganados.some(h => h.hoyo === 5))
})
test('Rey: hándicap no cuenta (el de hándicap 36 con neto mejor no gana el hoyo bruto)', () => {
  const r = ranking([J('a', 0), J('b', 36)], [...filas('a', pares()), ...filas('b', conCambio({ 1: 5 }))], cancha)
  assert.deepEqual(r.skins.ganados.find(h => h.hoyo === 1)!.ids, ['a'])
})

// ───────────── empates en el Puto (grupo neto, escalado por tamaño) ─────────────
for (const n of [2, 3, 4]) {
  test(`Puto grupo de ${n}: todos empatan los 18 → cada uno 18/${n} × ${n}/3 = 6`, () => {
    const js = Array.from({ length: n }, (_, i) => J(`j${i}`, 0, 1))
    const r = ranking(js, js.flatMap(j => filas(j.id, pares())), cancha)
    assert.ok(r.grupos[0].jugadores.every(j => cerca(j.puntos, 6)))
  })
  test(`Puto grupo de ${n}: uno gana los 18 → 18 × ${n}/3, el resto 0`, () => {
    const js = Array.from({ length: n }, (_, i) => J(`j${i}`, 0, 1))
    const r = ranking(js, [...filas('j0', pares().map(g => g - 1)), ...js.slice(1).flatMap(j => filas(j.id, pares()))], cancha)
    const p = Object.fromEntries(r.grupos[0].jugadores.map(j => [j.id, j.puntos]))
    assert.ok(cerca(p.j0, 18 * n / 3))
    assert.ok(js.slice(1).every(j => cerca(p[j.id], 0)))
  })
  test(`Puto grupo de ${n}: empate entre dos en un hoyo → ½ × ${n}/3 cada uno`, () => {
    const js = Array.from({ length: n }, (_, i) => J(`j${i}`, 0, 1))
    const malo = (id: string) => (id === 'j0' || id === 'j1' ? pares() : pares().map(g => g + 1))
    const fs = js.flatMap(j => filas(j.id, malo(j.id).map((g, i) => (i === 0 ? g : null))))
    const r = ranking(js, fs, cancha)
    const p = Object.fromEntries(r.grupos[0].jugadores.map(j => [j.id, j.puntos]))
    assert.ok(cerca(p.j0, 0.5 * n / 3) && cerca(p.j1, 0.5 * n / 3))
  })
}
test('Puto: el neto decide (recibir golpe convierte el bogey en empate)', () => {
  const r = ranking([J('a', 0, 1), J('b', 1, 1)], [...filas('a', pares()), ...filas('b', conCambio({ 18: 5 }))], cancha)
  assert.deepEqual(r.grupos[0].hoyos.find(h => h.hoyo === 18)!.ids.sort(), ['a', 'b'])
})

// ───────────── empates en el General ─────────────
test('General: mismo total, desempata la Copa (y su desempate)', () => {
  // a y b en grupos distintos y solos: Puto 6 c/u; Rey repartido igual; Copa igual pero b mejor en la vuelta
  const a = conCambio({ 1: 3, 10: 5 }), b = conCambio({ 10: 3, 1: 5 })
  const r = ranking([J('a', 0, 1), J('b', 0, 2)], [...filas('a', a), ...filas('b', b)], cancha)
  const ta = r.general.find(f => f.id === 'a')!, tb = r.general.find(f => f.id === 'b')!
  assert.ok(cerca(ta.total, tb.total))
  assert.deepEqual(r.general.map(f => f.id), ['b', 'a'])
  assert.deepEqual(r.general.map(f => f.pos), [1, 2])
})
test('General: totales iguales con decimales distintos de origen (1/3 + 2/3) empatan', () => {
  const r = ranking([J('a', 0, 1), J('b', 0, 1), J('c', 0, 1)], ['a', 'b', 'c'].flatMap(id => filas(id, pares())), cancha)
  assert.deepEqual(r.general.map(f => f.pos), [1, 1, 1])
})
test('General = Copa + Rey + Puto para cada jugador', () => {
  const js = [J('a', 3, 1), J('b', 12, 1), J('c', 25, 2), J('d', 18, 2)]
  const rnd = azar(7)
  const fs = js.flatMap(j => filas(j.id, pares().map(g => g + Math.floor(rnd() * 3) - 1)))
  const r = ranking(js, fs, cancha)
  for (const g of r.general) assert.ok(cerca(g.total, g.stableford + g.skins + g.grupo))
})

// ───────────── posición en vivo con empates ─────────────
test('en vivo: dos empatados al hoyo 9 → T1 los dos', () => {
  const nueve = pares().map((g, i) => (i < 9 ? g : null))
  const js = [J('a', 0, 1), J('b', 0, 2)]
  const fs = [...filas('a', nueve), ...filas('b', nueve)]
  for (const id of ['a', 'b']) {
    const p = posicionEnVivo(js, fs, cancha, id)!
    assert.equal(p.hoyo, 9); assert.equal(p.general.pos, 1); assert.ok(p.general.empatado)
  }
})
test('en vivo: el que va atrás (menos hoyos) no cuenta para el que va adelante', () => {
  const js = [J('a', 0, 1), J('b', 0, 2)]
  const fs = [...filas('a', pares()), ...filas('b', pares().map((g, i) => (i < 3 ? g - 1 : null)))]
  const p = posicionEnVivo(js, fs, cancha, 'a')!
  assert.equal(p.general.de, 1)
})
test('en vivo: con un hoyo salteado, cuenta solo hasta antes del hueco', () => {
  const p = posicionEnVivo([J('a', 0)], filas('a', pares().map((g, i) => (i === 3 ? null : g))), cancha, 'a')!
  assert.equal(p.hoyo, 3)
})

// ───────────── sorteos de grupos: 0 a 40 jugadores ─────────────
/** Cadena de marcadores válida: cada uno marca a otro de su grupo y todos son marcados una vez (solos: sin marcador). */
function cadenaValida(as: { id: string; grupo: number; marca: string }[]) {
  const tam = (g: number) => as.filter(a => a.grupo === g).length
  for (const a of as) {
    if (tam(a.grupo) === 1) { assert.equal(a.marca, '', `${a.id} solo no marca`); continue }
    const m = as.find(x => x.id === a.marca)
    assert.ok(m && m.id !== a.id && m.grupo === a.grupo, `${a.id} marca a alguien de su grupo`)
    assert.equal(as.filter(x => x.marca === a.id).length, 1, `${a.id} marcado una vez`)
  }
}
for (let n = 0; n <= 40; n++) {
  test(`sorteo con ${n} jugadores: grupos de 2 o 3 (nadie solo salvo n=1), cadena válida, todos una vez`, () => {
    const ids = Array.from({ length: n }, (_, i) => `j${i}`)
    const r = armarGrupos(ids, azar(n + 1))
    assert.deepEqual(r.map(a => a.id).sort(), [...ids].sort())
    const tamaños = [...new Set(r.map(a => a.grupo))].map(g => r.filter(a => a.grupo === g).length)
    if (n >= 2) assert.ok(tamaños.every(t => t === 2 || t === 3), tamaños.join())
    assert.equal(tamaños.length, Math.ceil(n / 3))
    cadenaValida(r)
  })
}

// ───────────── agregar y quitar jugadores en secuencia ─────────────
for (let s = 1; s <= 30; s++) {
  test(`secuencia ${s} de agregar/quitar jugadores al azar: la cadena de marcadores sigue válida`, () => {
    const rnd = azar(1000 + s)
    let as = armarGrupos(Array.from({ length: 4 + Math.floor(rnd() * 10) }, (_, i) => `j${i}`), rnd)
    let n = 100
    for (let paso = 0; paso < 12; paso++) {
      if (as.length && rnd() < 0.4) as = sacarDeGrupo(as, as[Math.floor(rnd() * as.length)].id)
      else as = sumarAGrupo(as, `n${n++}`)
      cadenaValida(as)
    }
  })
}

// ───────────── textos que escribe el admin ─────────────
for (const [entrada, esperado] of [['13.4', 13.4], ['13,4', 13.4], [' 8 ', 8], ['0', 0], ['54', 54], ['54.0', 54], ['0.1', 0.1],
  ['', null], ['54.1', null], ['-1', null], ['+2', null], ['13.45', null], ['abc', null], ['1e1', null], ['13.', null], ['.5', null], ['100', null]] as const) {
  test(`índice "${entrada}" → ${esperado}`, () => assert.equal(limpiarIndice(entrada), esperado))
}
for (const [entrada, esperado] of [['Juan', 'Juan'], ['  Ana   María ', 'Ana María'], ['Ñandú Pérez', 'Ñandú Pérez'], ['x'.repeat(24), 'x'.repeat(24)],
  ['x'.repeat(25), null], ['', null], ['   ', null], ['<script>', null], ['a>b', null]] as const) {
  test(`nombre "${entrada.slice(0, 12)}" → ${esperado}`, () => assert.equal(limpiarNombre(entrada), esperado))
}
for (const [nombre, usados, esperado] of [['José Ñúñez', [], 'josenunez'], ['VC', ['vc'], 'vc2'], ['VC', ['vc', 'vc2', 'vc3'], 'vc4'],
  ['', [], 'jugador'], ['!!!', ['jugador'], 'jugador2'], ['A. Ochagavía', [], 'aochagavia']] as const) {
  test(`id nuevo de "${nombre}" con [${usados.join(',')}] → ${esperado}`, () => assert.equal(nuevoId(nombre, [...usados]), esperado))
}

// ───────────── orden y grupos para mostrar ─────────────
test('por hándicap: estable con índices iguales (por nombre) y no muta', () => {
  const js = [J('c', 5), J('a', 5), J('b', 1)]
  assert.deepEqual(porHandicap(js).map(j => j.id), ['b', 'a', 'c'])
  assert.deepEqual(js.map(j => j.id), ['c', 'a', 'b'])
})
for (let s = 1; s <= 10; s++) {
  test(`grupos para mostrar (sorteo ${s}): cada jugador una vez y en su grupo`, () => {
    const ids = Array.from({ length: 5 + s }, (_, i) => `j${i}`)
    const asig = armarGrupos(ids, azar(s))
    const js = asig.map((a, i) => ({ ...J(a.id, i), grupo: a.grupo, marca: a.marca }))
    const gs = gruposParaMostrar(js)
    assert.deepEqual(gs.flatMap(g => g.jugadores.map(j => j.id)).sort(), [...ids].sort())
    assert.ok(gs.every(g => g.jugadores.every(j => j.grupo === g.grupo)))
  })
}

// ───────────── 200 torneos al azar: el motor contra cálculos independientes ─────────────
for (let t = 1; t <= 200; t++) {
  test(`torneo al azar ${t}: tarjetas, Copa, Rey, Puto, General y firma cuadran`, () => {
    const rnd = azar(t)
    const n = 2 + Math.floor(rnd() * 13)
    const asig = armarGrupos(Array.from({ length: n }, (_, i) => `j${i}`), rnd)
    const js = asig.map(a => ({ ...J(a.id, Math.round(rnd() * 400) / 10), grupo: a.grupo, marca: a.marca }))
    const fs: Golpe[] = []
    const jugados: Record<string, (number | null)[]> = {}
    for (const j of js) {
      const hasta = rnd() < 0.3 ? Math.floor(rnd() * 19) : 18 // algunos van a mitad de vuelta
      jugados[j.id] = par.map((p, i) => (i < hasta ? Math.max(1, Math.min(15, p + Math.floor(rnd() * 5) - 1)) : null))
      jugados[j.id].forEach((g, i) => {
        if (g == null) return
        fs.push({ jugador: j.id, hoyo: i + 1, por_marcador: false, golpes: g })
        const m = rnd()
        if (m < 0.9) fs.push({ jugador: j.id, hoyo: i + 1, por_marcador: true, golpes: m < 0.85 ? g : Math.min(15, g + 1) }) // 5% conflicto, 10% pendiente
      })
    }
    const r = ranking(js, fs, cancha)

    // tarjeta: puntos y golpes = suma hoyo a hoyo con la regla escrita aparte
    for (const j of js) {
      const tj = tarjeta(j, fs, cancha)
      const hj = Math.round(j.indice * 0.95)
      const esp = jugados[j.id].map((g, i) => (g == null ? 0 : Math.max(0, 2 + par[i] + golpesRecibidos(hj, hcp[i]) - g)))
      assert.equal(tj.puntos, suma(esp), `${j.id} puntos`)
      assert.equal(tj.gross, suma(jugados[j.id].map(g => g ?? 0)), `${j.id} golpes`)
      assert.equal(puedeFirmar(tj), tj.hoyos.every(h => h.estado === 'ok'))
    }

    // Copa: ordenada por la clave de desempate; empates comparten puesto (competición: 1,1,3)
    const clave = (id: string) => { const h = tarjeta(js.find(j => j.id === id)!, fs, cancha).hoyos; const d = (k: number) => suma(h.slice(k - 1).map(x => x.puntos ?? 0)); return [d(1), d(10), d(13), d(16), d(18)].join() }
    r.stableford.forEach((f, i) => {
      const prev = r.stableford[i - 1]
      if (prev && clave(prev.id) === clave(f.id)) assert.equal(f.pos, prev.pos)
      else assert.equal(f.pos, i + 1)
      if (prev) assert.ok(prev.puntos >= f.puntos)
    })

    // Rey: oráculo propio hoyo a hoyo entre todos (hoyo cuenta si todos lo jugaron)
    const skins: Record<string, number> = {}
    let hoyos = 0
    for (let i = 0; i < 18; i++) {
      const vs = js.map(j => [j.id, tarjeta(j, fs, cancha).hoyos[i].golpes] as const)
      if (vs.some(([, g]) => g == null)) continue
      hoyos++
      const mejor = Math.min(...vs.map(([, g]) => g!))
      const gan = vs.filter(([, g]) => g === mejor)
      for (const [id] of gan) skins[id] = (skins[id] ?? 0) + 1 / gan.length
    }
    assert.equal(r.skins.jugados, hoyos)
    for (const j of js) assert.ok(cerca(r.skins.porJugador[j.id] ?? 0, skins[j.id] ?? 0), `${j.id} Rey`)
    assert.ok(cerca(suma(Object.values(r.skins.porJugador)), hoyos))

    // Puto: en cada grupo suma (hoyos que jugaron todos) × tamaño/3
    for (const g of r.grupos) assert.ok(cerca(suma(g.jugadores.map(j => j.puntos)), g.hoyos.length * g.jugadores.length / 3), `grupo ${g.grupo}`)

    // General: Copa + Rey + Puto, ordenado de mayor a menor
    for (const g of r.general) assert.ok(cerca(g.total, g.stableford + g.skins + g.grupo))
    for (let i = 1; i < r.general.length; i++) assert.ok(r.general[i - 1].total >= r.general[i].total - 1e-9)

    // en vivo: el puesto nunca pasa del total comparado
    for (const j of js) { const p = posicionEnVivo(js, fs, cancha, j.id); if (p) { assert.ok(p.general.pos <= p.general.de); assert.ok(p.grupo.pos <= p.grupo.de) } }
  })
}
