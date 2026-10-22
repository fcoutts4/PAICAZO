// Sesión por cookie firmada (HMAC) y PIN de 4 dígitos derivado del secreto: no se guardan PIN en ningún lado.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jugador } from './datos'

function hmac(valor: string) {
  const s = process.env.PAICAZO_SECRET
  if (!s || s.length < 16) throw new Error('Falta PAICAZO_SECRET (mín. 16 caracteres)')
  return createHmac('sha256', s).update(valor).digest('hex')
}

const igual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export const pinDe = (id: string) => String(parseInt(hmac(`pin:${id}`).slice(0, 8), 16) % 10000).padStart(4, '0')
export const pinValido = (id: string, pin: string) => !!jugador(id) && igual(pinDe(id), pin)

export async function usuario() {
  const [id, firma] = (await cookies()).get('s')?.value.split('.') ?? []
  if (!id || !firma || !igual(firma, hmac(`s:${id}`))) return null
  return jugador(id) ?? null
}

export async function requiereUsuario() {
  const u = await usuario()
  if (!u) redirect('/login')
  return u
}

export async function iniciarSesion(id: string) {
  (await cookies()).set('s', `${id}.${hmac(`s:${id}`)}`, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30,
  })
}

export async function cerrarSesion() {
  (await cookies()).delete('s')
}
