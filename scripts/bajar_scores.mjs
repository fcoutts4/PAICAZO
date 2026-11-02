// Baja (solo lectura) jugadores y golpes de producción leyendo las páginas del admin y la tarjeta de cada jugador.
// Uso: node bajar_scores.mjs <repo> <salida.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'

const [repo, salida] = process.argv.slice(2), URL_ = 'https://paicazo.vercel.app'
const secreto = readFileSync(`${repo}/.env.produccion.local`, 'utf8').match(/PAICAZO_SECRET=(.*)/)[1].trim().replace(/^"|"$/g, '')
const cookie = `s=fcoutts.${createHmac('sha256', secreto).update('s:fcoutts').digest('hex')}`
const html = async ruta => { const r = await fetch(URL_ + ruta, { headers: { cookie }, redirect: 'manual' }); if (r.status !== 200) throw new Error(`${ruta}: ${r.status}`); return r.text() }
const texto = x => x.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()
const celdas = fila => [...fila.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => texto(c[1]))

const adm = await html('/admin')
if (!adm.includes('admin-tabla')) throw new Error('sin acceso al admin (¿cookie inválida?)')
const filas = [...adm.match(/<table class="admin-tabla">([\s\S]*?)<\/table>/)[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].slice(1).map(m => celdas(m[1]))
// ids: la página Grupos enlaza a cada jugador; la tarjeta de otro jugador está en /jugador/<id>
const rank = await html('/ranking?v=stableford')
const ids = Object.fromEntries([...rank.matchAll(/href="\/jugador\/([^"]+)"[^>]*>([^<]+)</g)].map(m => [m[2].trim(), m[1]]))
const tarjetas = await html('/admin?v=tarjetas')
const estado = Object.fromEntries([...tarjetas.match(/<table class="admin-tabla">([\s\S]*?)<\/table>/)[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].slice(1)
  .map(m => celdas(m[1])).map(([, n, ok, malo, falta, firma]) => [n, { ok: +ok, conflicto: +malo, pendiente: +falta, firmada: firma.includes('Destrabar') }]))

const jugadores = []
for (const [, nombre, indice, , , grupo] of filas) {
  const id = ids[nombre]
  if (!id) throw new Error(`sin id para ${nombre}`)
  const t = await html(`/jugador/${encodeURIComponent(id)}`)
  // solo el número del golpe (span.m); el circulito de golpes recibidos va en otro elemento de la misma celda
  const golpes = [...t.matchAll(/<tr class="golpes">([\s\S]*?)<\/tr>/g)].flatMap(m => [...m[1].matchAll(/<span class="m[^"]*">([^<]*)<\/span>/g)].map(x => x[1]).slice(0, 9))
    .map(c => { const n = parseInt(c, 10); return Number.isNaN(n) ? null : n })
  if (golpes.length !== 18) throw new Error(`${nombre}: ${golpes.length} hoyos leídos`)
  jugadores.push({ id, nombre, indice: Number(indice), grupo: Number(grupo), golpes, ...estado[nombre] })
}
writeFileSync(salida, JSON.stringify({ bajado: new Date().toISOString(), jugadores }, null, 1))
console.log(jugadores.map(j => `${j.nombre.padEnd(16)} idx ${String(j.indice).padStart(4)} G${j.grupo} hoyos ${j.golpes.filter(g => g != null).length} gross ${j.golpes.reduce((a, g) => a + (g ?? 0), 0)} ok/mal/falta ${j.ok}/${j.conflicto}/${j.pendiente}${j.firmada ? ' firmada' : ''}`).join('\n'))
