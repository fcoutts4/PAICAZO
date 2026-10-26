import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { ESQUEMA, type Consulta } from './db.ts'
import { MAX_INTENTOS, olvidarIntentos, puedeIntentar } from './intentos.ts'

async function base(): Promise<Consulta> {
  const db = new PGlite()
  const q: Consulta = async (t, p = []) => (await db.query<Record<string, unknown>>(t, p)).rows
  for (const ddl of ESQUEMA) await q(ddl)
  return q
}
const t0 = new Date('2026-11-01T10:00:00Z')
const mas = (min: number) => new Date(t0.getTime() + min * 60_000)
async function intentar(q: Consulta, n: number, id = 'a', ahora = t0) {
  const r: boolean[] = []
  for (let i = 0; i < n; i++) r.push(await puedeIntentar(q, id, ahora))
  return r
}

test('intentos: el límite es 5', () => assert.equal(MAX_INTENTOS, 5))
test('intentos: los primeros 5 se permiten', async () => {
  assert.deepEqual(await intentar(await base(), 5), [true, true, true, true, true])
})
test('intentos: el 6º se bloquea aunque el PIN sea correcto', async () => {
  assert.deepEqual((await intentar(await base(), 7)).slice(5), [false, false])
})
test('intentos: a los 14 minutos sigue bloqueado', async () => {
  const q = await base()
  await intentar(q, 5)
  assert.equal(await puedeIntentar(q, 'a', mas(14)), false)
})
test('intentos: a los 15 minutos del primero se libera', async () => {
  const q = await base()
  await intentar(q, 6)
  assert.equal(await puedeIntentar(q, 'a', mas(15)), true)
})
test('intentos: tras liberarse cuenta de nuevo desde 1', async () => {
  const q = await base()
  await intentar(q, 6)
  assert.deepEqual(await intentar(q, 6, 'a', mas(16)), [true, true, true, true, true, false])
})
test('intentos: entrar bien borra la cuenta', async () => {
  const q = await base()
  await intentar(q, 4)
  await olvidarIntentos(q, 'a')
  assert.deepEqual(await intentar(q, 5), [true, true, true, true, true])
})
test('intentos: cada jugador lleva su propia cuenta', async () => {
  const q = await base()
  await intentar(q, 6, 'a')
  assert.equal(await puedeIntentar(q, 'b', t0), true)
})
test('intentos: 20 en paralelo solo dejan pasar 5', async () => {
  const q = await base()
  const r = await Promise.all(Array.from({ length: 20 }, () => puedeIntentar(q, 'a', t0)))
  assert.equal(r.filter(Boolean).length, 5)
})
