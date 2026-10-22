import { cancha, firmadas, guardarGolpe } from '@/lib/datos'
import { puedeAnotar } from '@/lib/golf'
import { usuario } from '@/lib/sesion'

// Anota (o borra con golpes: null) un hoyo. JSON obligatorio: un form de otro sitio no puede enviarlo (CSRF).
export async function POST(req: Request) {
  const u = await usuario()
  if (!u) return Response.json({ error: 'Sin sesión' }, { status: 401 })
  if (!req.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'JSON requerido' }, { status: 415 })
  const b = await req.json().catch(() => null)
  const g = { jugador: String(b?.jugador ?? ''), hoyo: b?.hoyo, por_marcador: b?.por_marcador === true, golpes: b?.golpes ?? null }
  // borrar se permite a quien podría anotar ese mismo hoyo. Aquí el admin juega como jugador
  // (si no, validaría su propia tarjeta); sus correcciones van por /admin.
  const prueba = { ...g, golpes: g.golpes ?? 1 }
  if (prueba.hoyo > cancha.par.length || !puedeAnotar(u, prueba, await firmadas(), false))
    return Response.json({ error: 'No autorizado o dato inválido' }, { status: 403 })
  await guardarGolpe(g)
  return Response.json({ ok: true })
}
