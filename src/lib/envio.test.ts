import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reintentar } from './envio.ts'

test('envío: sin respuesta (sin señal) → reintentar', () => assert.equal(reintentar(null), true))
test('envío: 200 → no', () => assert.equal(reintentar(200), false))
test('envío: 500, 502, 503, 504 (servidor o base caídos) → reintentar', () => {
  for (const s of [500, 502, 503, 504]) assert.equal(reintentar(s), true, String(s))
})
test('envío: 401 (sesión vencida) → reintentar al volver a entrar', () => assert.equal(reintentar(401), true))
test('envío: 408 y 429 (timeout, demasiadas) → reintentar', () => {
  assert.equal(reintentar(408), true)
  assert.equal(reintentar(429), true)
})
test('envío: 403 (firmada o sin permiso) → descartar', () => assert.equal(reintentar(403), false))
test('envío: 400 y 415 (dato malo) → descartar', () => {
  assert.equal(reintentar(400), false)
  assert.equal(reintentar(415), false)
})
