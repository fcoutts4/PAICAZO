// Los datos de la cancha calzan con la tarjeta oficial "tarj. paico alto 2025" (salida azul, Ventaja Var).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import cancha from '../../data/cancha.json' with { type: 'json' }

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

test('cancha: 18 hoyos en par, yardas y hcp', () => {
  for (const k of ['par', 'yardas', 'hcp'] as const) assert.equal(cancha[k].length, 18, k)
})
test('cancha: par de la tarjeta 4 4 4 5 3 4 4 3 4 en ida y vuelta (35 + 35)', () => {
  assert.deepEqual(cancha.par.slice(0, 9), [4, 4, 4, 5, 3, 4, 4, 3, 4])
  assert.deepEqual(cancha.par.slice(9), cancha.par.slice(0, 9))
  assert.equal(suma(cancha.par), 70)
})
test('cancha: yardas azules de la ida suman 3242', () => {
  assert.deepEqual(cancha.yardas.slice(0, 9), [410, 392, 389, 485, 210, 407, 312, 187, 450])
  assert.equal(suma(cancha.yardas.slice(0, 9)), 3242)
})
test('cancha: la vuelta sale de otras marcas y suma 3212', () => {
  assert.deepEqual(cancha.yardas.slice(9), [393, 416, 379, 492, 191, 382, 321, 178, 460])
  assert.equal(suma(cancha.yardas.slice(9)), 3212)
})
test('cancha: HCP (Ventaja Var) ida pares y vuelta impares', () => {
  assert.deepEqual(cancha.hcp.slice(0, 9), [6, 8, 16, 18, 4, 14, 10, 12, 2])
  assert.deepEqual(cancha.hcp.slice(9), [5, 7, 15, 17, 3, 13, 9, 11, 1])
})
test('cancha: cada HCP del 1 al 18 aparece una vez', () => {
  assert.deepEqual([...cancha.hcp].sort((a, b) => a - b), Array.from({ length: 18 }, (_, i) => i + 1))
})
test('cancha: en cada hoyo la vuelta es un punto más difícil que la ida', () => {
  cancha.hcp.slice(0, 9).forEach((h, i) => assert.equal(cancha.hcp[i + 9], h - 1, `hoyo ${i + 1}`))
})
test('cancha: par 3 son los cortos (< 250 yds) y par 5 los largos (> 470)', () => {
  cancha.par.forEach((p, i) => {
    if (p === 3) assert.ok(cancha.yardas[i] < 250, `hoyo ${i + 1}`)
    if (p === 5) assert.ok(cancha.yardas[i] > 470, `hoyo ${i + 1}`)
  })
})
