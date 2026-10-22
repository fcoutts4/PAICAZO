import { cancha, golpes } from '@/lib/datos'
import { sql } from '@/lib/db'
import { puedeFirmar, tarjeta } from '@/lib/golf'
import { usuario } from '@/lib/sesion'

export async function POST(req: Request) {
  const u = await usuario()
  if (!u) return Response.json({ error: 'Sin sesión' }, { status: 401 })
  if (!req.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'JSON requerido' }, { status: 415 })
  if (!puedeFirmar(tarjeta(u, await golpes([u.id]), cancha)))
    return Response.json({ error: 'Faltan hoyos por validar con tu marcador' }, { status: 409 })
  await sql('INSERT INTO firmas (jugador) VALUES ($1) ON CONFLICT DO NOTHING', [u.id])
  return Response.json({ ok: true })
}
