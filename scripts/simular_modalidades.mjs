// Simula el campeonato con otras modalidades (pesos del Rey del Hoyo, Rey neto, sin Puto, hándicap 100%, slope/rating)
// usando los scores reales y el motor de la app. Uso: node scripts/simular_modalidades.mjs <repo> <torneo.json> <salida.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [repo, entrada, salida] = process.argv.slice(2)
const { ranking, tarjeta } = await import(pathToFileURL(`${repo}/src/lib/golf.ts`).href)
const cancha = JSON.parse(readFileSync(`${repo}/data/cancha.json`, 'utf8'))
const { jugadores: d } = JSON.parse(readFileSync(entrada, 'utf8'))
const base = d.map(x => ({ id: x.id, nombre: x.nombre, indice: x.indice, grupo: x.grupo, marca: '' }))
const filas = d.flatMap(x => x.golpes.flatMap((g, i) => (g == null ? [] : [false, true].map(m => ({ jugador: x.id, hoyo: i + 1, por_marcador: m, golpes: g })))))
const idx = Object.fromEntries(base.map(j => [j.id, j.indice]))

/** Rey del Hoyo entre todos con el valor de golpe elegido (gross o neto); 1 punto por hoyo, empates repartidos. */
function rey(js, c, valor) {
  const ts = js.map(j => ({ j, t: tarjeta(j, filas, c) })), p = {}
  for (let i = 0; i < 18; i++) {
    const vs = ts.map(({ j, t }) => [j.id, valor(t.hoyos[i])])
    const mejor = Math.min(...vs.map(v => v[1]))
    const gan = vs.filter(v => v[1] === mejor)
    for (const [id] of gan) p[id] = (p[id] ?? 0) + 1 / gan.length
  }
  return p
}
const gross = h => h.golpes, netoHoyo = h => h.golpes - h.recibidos

function escenario(js, { wRey = 1, reyCon = gross, wPuto = 1, putoCrudo = false, c = cancha }) {
  const r = ranking(js, filas, c)
  const copa = Object.fromEntries(r.stableford.map(f => [f.id, f]))
  const puto = Object.fromEntries(r.grupos.flatMap(g => g.jugadores.map(j => [j.id, putoCrudo ? j.puntos * 3 / g.jugadores.length : j.puntos])))
  const rk = rey(js, c, reyCon)
  const neto = id => copa[id].gross - idx[id]
  const fs = js.map(j => ({ id: j.id, nombre: j.nombre, copa: copa[j.id].puntos, rey: wRey * (rk[j.id] ?? 0), puto: wPuto * (puto[j.id] ?? 0) }))
  for (const f of fs) f.total = f.copa + f.rey + f.puto
  fs.sort((a, b) => b.total - a.total || neto(a.id) - neto(b.id))
  fs.forEach((f, i) => { const p = fs[i - 1]; f.pos = p && Math.abs(p.total - f.total) < 1e-9 && Math.abs(neto(p.id) - neto(f.id)) < 1e-9 ? p.pos : i + 1 })
  return fs
}

// sesgo: correlación de Spearman entre índice y puesto (+1 = siempre ganan los de índice bajo, 0 = parejo)
const rango = v => v.map(a => v.filter(b => b < a).length + (v.filter(b => b === a).length - 1) / 2)
function corr(x, y) {
  const mx = x.reduce((a, b) => a + b) / x.length, my = y.reduce((a, b) => a + b) / y.length
  let s = 0, sx = 0, sy = 0
  x.forEach((v, i) => { s += (v - mx) * (y[i] - my); sx += (v - mx) ** 2; sy += (y[i] - my) ** 2 })
  return s / Math.sqrt(sx * sy)
}
const sesgo = fs => corr(rango(fs.map(f => idx[f.id])), rango(fs.map(f => f.pos)))

const al100 = base.map(j => ({ ...j, indice: j.indice / 0.95 })) // hcp de juego = 100% del índice (con rating = par)
const def = [
  ['A', 'Actual', 'Copa + Rey del Hoyo (gross) + Puto', base, {}],
  ['B', 'Solo Copa', 'Solo la Copa Paicazo (Stableford neto)', base, { wRey: 0, wPuto: 0 }],
  ['C', 'Rey ×2', 'Copa + Rey del Hoyo gross con doble puntaje + Puto', base, { wRey: 2 }],
  ['D', 'Rey ×3', 'Copa + Rey del Hoyo gross con triple puntaje + Puto', base, { wRey: 3 }],
  ['E', 'Rey neto', 'Copa + Rey del Hoyo en neto (descuenta golpes recibidos) + Puto', base, { reyCon: netoHoyo }],
  ['F', 'Rey neto ×2', 'Copa + Rey del Hoyo neto con doble puntaje + Puto', base, { reyCon: netoHoyo, wRey: 2 }],
  ['G', 'Sin Rey', 'Copa + Puto', base, { wRey: 0 }],
  ['H', 'Hcp 100%', 'Igual al actual, con el 100% del hándicap en vez del 95%', al100, {}],
  ['I', 'Sin Puto', 'Copa + Rey del Hoyo (gross)', base, { wPuto: 0 }],
  ['J', 'Puto sin escala', 'Igual al actual, sin escalar el Puto por tamaño de grupo (×4/3 en grupos de 4)', base, { putoCrudo: true }],
]
const escenarios = def.map(([letra, nombre, descripcion, js, o]) => { const fs = escenario(js, o); return { letra, nombre, descripcion, sesgo: sesgo(fs), filas: fs } })

// slope y rating: ¿cambia la Copa con valores más realistas para la cancha?
const slopes = [['Actual', 113, 70], ['Estimado', 125, 71.5], ['Estimado alto', 130, 72]].map(([nombre, slope, rating]) => {
  const r = ranking(base, filas, { ...cancha, slope, rating })
  return { nombre, slope, rating, copa: r.stableford.map(f => ({ id: f.id, nombre: f.nombre, pos: f.pos, puntos: f.puntos })), general: r.general.map(f => ({ id: f.id, nombre: f.nombre, pos: f.pos, total: f.total })) }
})

// cada juego frente al índice (Pearson): negativo = a menor índice, más puntos
const r0 = ranking(base, filas, cancha)
const ts0 = Object.fromEntries(base.map(j => [j.id, tarjeta(j, filas, cancha)]))
const pts = id => r0.stableford.find(f => f.id === id).puntos, gen = id => r0.general.find(f => f.id === id)
const ids = base.map(j => j.id), xi = ids.map(i => idx[i])
const juegos = [
  ['Copa (Stableford neto)', ids.map(pts)],
  ['Rey del Hoyo (gross)', ids.map(i => gen(i).skins)],
  ['Puto (grupo neto)', ids.map(i => gen(i).grupo)],
  ['General', ids.map(i => gen(i).total)],
].map(([nombre, v]) => ({ nombre, pearson: corr(xi, v), spearman: corr(rango(xi), rango(v)) }))
const jugadores = base.map(j => ({ id: j.id, nombre: j.nombre, indice: j.indice, hcp: ts0[j.id].hj, gross: ts0[j.id].gross,
  netoSobrePar: ts0[j.id].gross - ts0[j.id].hj - cancha.par.reduce((a, b) => a + b), puntos: pts(j.id), posCopa: r0.stableford.find(f => f.id === j.id).pos, grupo: j.grupo }))

writeFileSync(salida, JSON.stringify({ escenarios, slopes, juegos, jugadores }, null, 1))
console.log(escenarios.map(e => `${e.letra} ${e.nombre.padEnd(16)} ${e.filas.slice(0, 3).map(f => `${f.pos}. ${f.nombre} ${f.total.toFixed(1)}`).join(' | ')}  sesgo ${e.sesgo.toFixed(2)}`).join('\n'))
