// Prueba de punta a punta: borra los scores y sortea grupos en la base LOCAL (PGlite), así que solo apunta a localhost.
// Uso: npm run dev en otra terminal y luego npm run e2e
import { readFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repo = fileURLToPath(new URL('..', import.meta.url)), URL_ = 'http://localhost:3000'
const secreto = readFileSync(`${repo}/.env.local`, 'utf8').match(/PAICAZO_SECRET=(.*)/)[1].trim()
const { ranking, tarjeta, hcpJuego } = await import(pathToFileURL(`${repo}/src/lib/golf.ts`).href)
const cancha = JSON.parse(readFileSync(`${repo}/data/cancha.json`, 'utf8'))
const hmac = v => createHmac('sha256', secreto).update(v).digest('hex')
const cookie = id => `s=${id}.${hmac(`s:${id}`)}`
const pinDe = id => String(parseInt(hmac(`pin:${id}`).slice(0, 8), 16) % 10000).padStart(4, '0')

let ok = 0, mal = 0
const check = (cond, txt) => { if (cond) ok++; else { mal++; console.log('  ✗', txt) } }
const seccion = t => console.log(`\n▶ ${t}`)
const html = async (ruta, id) => (await fetch(URL_ + ruta, { headers: id ? { cookie: cookie(id) } : {}, redirect: 'manual' })).text()
const texto = s => s.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()

async function accion(ruta, boton, campos, id = 'fcoutts') {
  const h = await html(ruta, id)
  const form = [...h.matchAll(/<form[^>]*>([\s\S]*?)<\/form>/g)].map(m => m[1]).find(f => f.includes(`>${boton}<`))
  if (!form) throw new Error(`no encontré el formulario ${boton} en ${ruta}`)
  const fd = new FormData()
  for (const [, n] of form.matchAll(/name="(\$ACTION_[^"]+)"/g)) fd.set(n, '')
  for (const [k, v] of Object.entries(campos)) fd.set(k, v)
  const r = await fetch(URL_ + ruta, { method: 'POST', body: fd, headers: { cookie: cookie(id) }, redirect: 'manual' })
  return r.status
}
const anotar = (quien, cuerpo, tipo = 'application/json') => fetch(`${URL_}/api/golpes`, {
  method: 'POST', headers: { 'content-type': tipo, ...(quien ? { cookie: cookie(quien) } : {}) }, body: JSON.stringify(cuerpo) }).then(r => r.status)
const firmar = quien => fetch(`${URL_}/api/firmar`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookie(quien) }, body: '{}' }).then(r => r.status)

// --- jugadores: id ↔ nombre desde el ingreso ---
const login = await html('/login')
const ids = Object.fromEntries([...login.matchAll(/value="([^"]+)"[^>]*\/?>(?:<!-- -->)?<span>([^<]+)<\/span>/g)].map(m => [m[2], m[1]]))
const nombres = Object.keys(ids)

seccion('Ingreso con PIN')
{
  const fd = new FormData(); const id = ids[nombres[0]]
  const form = login.match(/<form[^>]*>([\s\S]*?)<\/form>/)[1]
  for (const [, n] of form.matchAll(/name="(\$ACTION_[^"]+)"/g)) fd.set(n, '')
  fd.set('id', id); fd.set('pin', pinDe(id))
  const r = await fetch(`${URL_}/login`, { method: 'POST', body: fd, redirect: 'manual' })
  check(r.status === 303 && r.headers.get('location') === '/', `PIN correcto entra (status ${r.status} → ${r.headers.get('location')})`)
  check(/s=/.test(r.headers.get('set-cookie') ?? ''), 'PIN correcto deja la cookie de sesión')
  console.log(`  ${nombres.length} jugadores en el ingreso`)
}

seccion('Borrar scores y sortear grupos')
check([200, 303].includes(await accion('/admin', 'Borrar scores', { confirmacion: 'BORRAR' })), 'borrar scores responde')
check([200, 303].includes(await accion('/admin', 'Sortear grupos', { confirmacion: 'NO' })), 'sortear con palabra equivocada no hace nada')
check([200, 303].includes(await accion('/admin', 'Sortear grupos', { confirmacion: 'SORTEAR' })), 'sortear responde')

// tabla del admin: nombre, índice, grupo, marca
const adm = await html('/admin', 'fcoutts')
const filas = [...adm.match(/<table class="admin-tabla">([\s\S]*?)<\/table>/)[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].slice(1)
  .map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => texto(c[1])))
const js = filas.map(([, nombre, indice, , , grupo, marca]) => ({ id: ids[nombre], nombre, indice: Number(indice), grupo: Number(grupo), marca: ids[marca] ?? '' }))
const porId = Object.fromEntries(js.map(j => [j.id, j]))
const tam = Object.values(js.reduce((a, j) => ({ ...a, [j.grupo]: (a[j.grupo] ?? 0) + 1 }), {})).sort()
console.log(`  grupos: ${tam.join(', ')} jugadores`)
check(js.length === nombres.length, 'la tabla del admin trae a todos')
check(tam.every(n => n >= 3 && n <= 4), 'grupos de 3 o 4, nunca de 2')
check(js.every(j => j.marca && j.marca !== j.id), 'todos marcan a alguien que no son ellos')
check(js.every(j => porId[j.marca]?.grupo === j.grupo), 'cada uno marca a alguien de su grupo')
check(js.every(j => js.filter(x => x.marca === j.id).length === 1), 'todos son marcados exactamente una vez')
const gruposPag = await html('/grupos', js[0].id)
check(js.every(j => gruposPag.includes(j.nombre)), 'la pestaña Grupos muestra a todos')
const yo0 = js[0]
check(new RegExp(`Grupo ${yo0.grupo}<small>`).test(gruposPag.replace(/<!-- -->/g, '')), 'la pestaña Grupos marca "tu grupo"')

seccion('Permisos de la API')
const [A, B, C, D] = js
const marcadorDe = id => js.find(j => j.marca === id).id
const ajeno = js.find(j => j.id !== A.id && j.id !== A.marca)
check(await anotar(null, { jugador: A.id, hoyo: 1, por_marcador: false, golpes: 4 }) === 401, 'sin sesión → 401')
check(await anotar(A.id, { jugador: A.id, hoyo: 1, por_marcador: false, golpes: 4 }, 'text/plain') === 415, 'sin JSON → 415')
check(await anotar(A.id, { jugador: ajeno.id, hoyo: 1, por_marcador: true, golpes: 4 }) === 403, 'marcar a quien no marcas → 403')
check(await anotar(A.id, { jugador: ajeno.id, hoyo: 1, por_marcador: false, golpes: 4 }) === 403, 'anotar como si fueras otro → 403')
check(await anotar(A.id, { jugador: A.marca, hoyo: 1, por_marcador: false, golpes: 4 }) === 403, 'el marcador no anota como jugador → 403')
check(await anotar(A.id, { jugador: A.id, hoyo: 1, por_marcador: true, golpes: 4 }) === 403, 'no te marcas a ti mismo → 403')
for (const g of [0, 12, 4.5, '5']) check(await anotar(A.id, { jugador: A.id, hoyo: 1, por_marcador: false, golpes: g }) === 403, `golpes ${JSON.stringify(g)} → 403`)
for (const h of [0, 19, '3']) check(await anotar(A.id, { jugador: A.id, hoyo: h, por_marcador: false, golpes: 4 }) === 403, `hoyo ${JSON.stringify(h)} → 403`)
check(await anotar(A.id, { jugador: A.id, hoyo: 1, por_marcador: false, golpes: 4 }) === 200, 'anotar lo propio → 200')
check(await anotar(A.id, { jugador: A.id, hoyo: 1, por_marcador: false, golpes: null }) === 200, 'borrar lo propio → 200')

seccion('Anotación cruzada de 18 hoyos')
// todos par en todo, salvo: A conflicto en el 5, al marcador de B le falta el 18, C hace birdie en el 1
const golpes = []
const par = cancha.par
for (const j of js) for (let h = 1; h <= 18; h++) {
  let propio = par[h - 1], marcador = par[h - 1]
  if (j.id === C.id && h === 1) propio = marcador = par[0] - 1
  if (j.id === A.id && h === 5) { propio = par[4] + 1; marcador = par[4] + 2 }
  golpes.push({ jugador: j.id, hoyo: h, por_marcador: false, golpes: propio })
  if (!(j.id === B.id && h === 18)) golpes.push({ jugador: j.id, hoyo: h, por_marcador: true, golpes: marcador })
}
let fallidos = 0
for (let i = 0; i < golpes.length; i += 12) {
  const r = await Promise.all(golpes.slice(i, i + 12).map(g => anotar(g.por_marcador ? marcadorDe(g.jugador) : g.jugador, g)))
  fallidos += r.filter(s => s !== 200).length
}
check(fallidos === 0, `los ${golpes.length} golpes se guardan (${fallidos} fallidos)`)

const tarj = await html('/admin?v=tarjetas', 'fcoutts')
const estado = Object.fromEntries([...tarj.match(/<table class="admin-tabla">([\s\S]*?)<\/table>/)[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].slice(1)
  .map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => texto(c[1]))).map(([, n, o, c, p]) => [ids[n], `${o}/${c}/${p}`]))
check(estado[A.id] === '17/1/0', `A: 17 ok, 1 conflicto (${estado[A.id]})`)
check(estado[B.id] === '17/0/1', `B: 17 ok, 1 pendiente (${estado[B.id]})`)
check(js.filter(j => ![A.id, B.id].includes(j.id)).every(j => estado[j.id] === '18/0/0'), 'el resto: 18 ok')
check(tarj.includes(`hoyo 5: anotó <b>${par[4] + 1}</b>, su marcador <b>${par[4] + 2}</b>`.replace(/<b>/g, '<b>')) || texto(tarj).includes(`hoyo 5: anotó ${par[4] + 1}, su marcador ${par[4] + 2}`), 'la lista de conflictos muestra el hoyo 5 de A')

seccion('Firma de tarjetas')
check(await firmar(A.id) === 409, 'A con conflicto no puede firmar (409)')
check(await firmar(B.id) === 409, 'B con hoyo pendiente no puede firmar (409)')
check(await firmar(D.id) === 200, 'D con 18 validados firma (200)')
check(await anotar(D.id, { jugador: D.id, hoyo: 1, por_marcador: false, golpes: 3 }) === 403, 'D firmado ya no puede cambiar (403)')
check(await anotar(marcadorDe(D.id), { jugador: D.id, hoyo: 1, por_marcador: true, golpes: 3 }) === 403, 'su marcador tampoco (403)')
check([200, 303].includes(await accion('/admin?v=tarjetas', 'Guardar', { jugador: A.id, hoyo: '5', golpes: String(par[4] + 1) })), 'admin corrige el hoyo 5 de A')
check(await firmar(A.id) === 200, 'A corregido ya puede firmar (200)')
check([200, 303].includes(await accion('/admin?v=tarjetas', 'Destrabar', { jugador: D.id })), 'admin destraba a D')
check(await anotar(D.id, { jugador: D.id, hoyo: 1, por_marcador: false, golpes: par[0] }) === 200, 'D destrabado puede anotar otra vez')

seccion('Puntos: página vs motor vs cálculo a mano')
const final = golpes.map(g => (g.jugador === A.id && g.hoyo === 5 ? { ...g, golpes: par[4] + 1 } : g))
const esperado = ranking(js, final, cancha)
const tabla = async v => [...(await html(`/ranking?v=${v}`, A.id)).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => texto(c[1]))).filter(c => c.length)
const num = s => Number(String(s).replace('+', '').replace(',', '.'))
const nombreDe = celda => celda.replace(/ ›.*$/, '').replace(/›/g, '').replace(/\(tú\)/, '').replace(/firmada/, '').trim()

const copa = await tabla('stableford')
for (const j of js) {
  const fila = copa.find(c => nombreDe(c[1]) === j.nombre)
  const e = esperado.stableford.find(f => f.id === j.id)
  check(fila && num(fila[4]) === e.puntos, `Copa ${j.nombre}: página ${fila?.[4]} = motor ${e.puntos}`)
}
// a mano: todo par → 2 puntos por hoyo + 1 por cada golpe recibido = 36 + HCP (si HCP ≥ 0)
for (const j of js.filter(j => ![A.id, C.id].includes(j.id))) {
  const hj = hcpJuego(j.indice, cancha)
  check(esperado.stableford.find(f => f.id === j.id).puntos === 36 + hj, `a mano ${j.nombre}: todo par = 36 + ${hj}`)
}
check(esperado.stableford.find(f => f.id === C.id).puntos === 37 + hcpJuego(C.indice, cancha), 'a mano C: un birdie suma 1 punto más')

const rey = await tabla('skins')
for (const j of js) {
  const fila = rey.find(c => nombreDe(c[0]) === j.nombre)
  const e = esperado.skins.porJugador[j.id] ?? 0
  check(Math.abs(num(fila?.[1] ?? 0) - e) < 0.006, `Rey ${j.nombre}: página ${fila?.[1] ?? 0} ≈ motor ${e.toFixed(2)}`)
}
// a mano: C gana solo el hoyo 1; A pierde el 5 (bogey); los otros 16 hoyos se reparten entre todos
const N = js.length
const reyC = 1 + 16 / N + 1 / (N - 1)
check(Math.abs((esperado.skins.porJugador[C.id] ?? 0) - reyC) < 1e-9, `a mano Rey de C = 1 + 16/${N} + 1/${N - 1}`)

const puto = await tabla('grupo')
for (const g of esperado.grupos) for (const j of g.jugadores) {
  const fila = puto.find(c => nombreDe(c[0]) === j.nombre)
  check(fila && Math.abs(num(fila[1]) - j.puntos) < 0.006, `Puto ${j.nombre} (grupo de ${g.jugadores.length}): página ${fila?.[1]} ≈ motor ${j.puntos.toFixed(2)}`)
}
const prom = g => g.jugadores.reduce((a, j) => a + j.puntos, 0) / g.jugadores.length
check(esperado.grupos.every(g => Math.abs(prom(g) - 6) < 1e-9), 'a mano Puto: promedio 6 por jugador en todos los grupos')

const gen = await tabla('general')
for (const j of js) {
  const fila = gen.find(c => nombreDe(c[1]) === j.nombre)
  const e = esperado.general.find(f => f.id === j.id)
  check(fila && Math.abs(num(fila[5]) - e.total) < 0.006 && num(fila[0]) === e.pos, `General ${j.nombre}: pos ${fila?.[0]} total ${fila?.[5]} = motor ${e.pos} / ${e.total.toFixed(2)}`)
  check(Math.abs(e.total - (e.stableford + e.skins + e.grupo)) < 1e-9, `General ${j.nombre} = Copa + Rey + Puto`)
}

seccion('Tarjeta de cada jugador')
for (const j of [A, C]) {
  const p = texto(await html(`/jugador/${j.id}`, B.id))
  const t = tarjeta(j, final, cancha)
  check(p.includes(String(t.puntos)) && p.includes(String(t.gross)), `${j.nombre}: la tarjeta muestra ${t.puntos} puntos y ${t.gross} golpes`)
}

console.log(`\n${mal ? '✗' : '✓'} ${ok} verificaciones OK, ${mal} con problemas`)
process.exit(mal ? 1 : 0)
