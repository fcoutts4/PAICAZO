// Estadísticas del campeonato con el motor de la app (src/lib/golf.ts). Uso: node stats.mjs <repo> <scores.json> <salida.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [repo, entrada, salida] = process.argv.slice(2)
const { ranking, tarjeta, hcpJuego, marcaPGA } = await import(pathToFileURL(`${repo}/src/lib/golf.ts`).href)
const cancha = JSON.parse(readFileSync(`${repo}/data/cancha.json`, 'utf8'))
const { jugadores: datos, bajado } = JSON.parse(readFileSync(entrada, 'utf8'))
const js = datos.map(d => ({ id: d.id, nombre: d.nombre, indice: d.indice, grupo: d.grupo, marca: '' }))
const filas = datos.flatMap(d => d.golpes.flatMap((g, i) => (g == null ? [] : [false, true].map(m => ({ jugador: d.id, hoyo: i + 1, por_marcador: m, golpes: g })))))
const nombre = id => js.find(j => j.id === id).nombre
const suma = xs => xs.reduce((a, b) => a + b, 0)
const par = cancha.par

const r = ranking(js, filas, cancha)
const ts = Object.fromEntries(js.map(j => [j.id, tarjeta(j, filas, cancha)]))

// puesto hoyo a hoyo (Copa y General), con las mismas reglas de desempate que la app
const puestos = { copa: {}, general: {} }
for (const j of js) { puestos.copa[j.id] = []; puestos.general[j.id] = [] }
for (let n = 1; n <= 18; n++) {
  const rn = ranking(js, filas.filter(f => f.hoyo <= n), cancha)
  for (const f of rn.stableford) puestos.copa[f.id].push(f.pos)
  for (const f of rn.general) puestos.general[f.id].push(f.pos)
}

// distribución de resultados por jugador (gross y neto)
const tipos = ['eagle', 'birdie', 'par', 'bogey', 'doble']
const jugador = js.map(j => {
  const t = ts[j.id]
  const gross = Object.fromEntries(tipos.map(k => [k, 0]))
  for (const h of t.hoyos) if (h.golpes != null) gross[marcaPGA(h.golpes, h.par)]++
  const netoBirdies = t.hoyos.filter(h => h.golpes != null && h.golpes - h.recibidos < h.par).length
  const ida = suma(t.hoyos.slice(0, 9).map(h => h.puntos ?? 0)), vuelta = suma(t.hoyos.slice(9).map(h => h.puntos ?? 0))
  const grossIda = suma(t.hoyos.slice(0, 9).map(h => h.golpes ?? 0)), grossVta = suma(t.hoyos.slice(9).map(h => h.golpes ?? 0))
  return {
    id: j.id, nombre: j.nombre, indice: j.indice, grupo: j.grupo, hcp: t.hj, puntos: t.puntos, gross: t.gross, vsPar: t.vsPar,
    neto: Math.round((t.gross - j.indice) * 10) / 10, ida, vuelta, grossIda, grossVta, ...gross, netoBirdies,
    golpes: t.hoyos.map(h => h.golpes), puntosHoyo: t.hoyos.map(h => h.puntos), recibidos: t.hoyos.map(h => h.recibidos),
    rey: r.skins.porJugador[j.id] ?? 0, reyHoyos: r.skins.ganados.filter(h => h.ids.includes(j.id)).map(h => ({ hoyo: h.hoyo, valor: h.valor })),
  }
})

// por hoyo: promedio, sobre el par, birdies, peor y mejor
const hoyos = par.map((p, i) => {
  const gs = jugador.map(j => j.golpes[i]).filter(g => g != null)
  return {
    hoyo: i + 1, par: p, yardas: cancha.yardas[i], hcp: cancha.hcp[i], promedio: suma(gs) / gs.length, sobrePar: suma(gs) / gs.length - p,
    birdies: gs.filter(g => g < p).length, pares: gs.filter(g => g === p).length, bogeys: gs.filter(g => g === p + 1).length, dobles: gs.filter(g => g >= p + 2).length,
    mejor: Math.min(...gs), peor: Math.max(...gs),
    rey: (r.skins.ganados.find(h => h.hoyo === i + 1)?.ids ?? []).map(nombre),
  }
})

// momentos: líder en más hoyos, mayor subida de la ida a la vuelta
const lideresCopa = Object.fromEntries(js.map(j => [j.id, puestos.copa[j.id].filter(p => p === 1).length]))
const subida = js.map(j => ({ id: j.id, nombre: j.nombre, de: puestos.copa[j.id][8], a: puestos.copa[j.id][17], sube: puestos.copa[j.id][8] - puestos.copa[j.id][17] })).sort((a, b) => b.sube - a.sube)

writeFileSync(salida, JSON.stringify({
  bajado, cancha: { club: cancha.club, par: suma(par), yardas: suma(cancha.yardas), salidaPrimera: cancha.salidas?.primera },
  general: r.general.map(f => ({ ...f })), copa: r.stableford.map(f => ({ ...f, neto: jugador.find(j => j.id === f.id).neto })),
  grupos: r.grupos.map(g => ({ grupo: g.grupo, jugadores: g.jugadores, hoyos: g.hoyos.length })),
  rey: { jugados: r.skins.jugados, ganados: r.skins.ganados.map(h => ({ ...h, nombres: h.ids.map(nombre) })) },
  jugador, hoyos, puestos, lideresCopa, subida,
}, null, 1))
console.log('General:', r.general.slice(0, 5).map(f => `${f.pos}. ${f.nombre} ${f.total.toFixed(2)}`).join(' | '))
console.log('Copa:   ', r.stableford.slice(0, 5).map(f => `${f.pos}. ${f.nombre} ${f.puntos}`).join(' | '))
