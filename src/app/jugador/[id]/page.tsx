import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cancha, golpes, jugadores } from '@/lib/datos'
import { tarjeta } from '@/lib/golf'
import { requiereUsuario } from '@/lib/sesion'
import Refresco from '../../Refresco'
import TarjetaPGA from '../../TarjetaPGA'
import Icono from '../../Icono'

export const dynamic = 'force-dynamic'

/** Tarjeta de cualquier jugador, solo para mirar cómo va (gross hoyo a hoyo). */
export default async function TarjetaDeOtro({ params }: { params: Promise<{ id: string }> }) {
  const u = await requiereUsuario()
  const { id } = await params
  const j = (await jugadores()).find(x => x.id === id)
  if (!j) notFound()
  const t = tarjeta(j, await golpes([j.id]), cancha)
  const vsPar = t.vsPar > 0 ? `+${t.vsPar}` : t.vsPar || 'E'
  return (
    <main className="compacta">
      <Refresco />
      <div className="otro-cabecera">
        <Link href="/ranking" aria-label="Volver al ranking"><Icono n="antes" /></Link>
        <div><b>{j.nombre}{j.id === u.id && ' (tú)'}</b><small>Grupo {j.grupo} · HCP {t.hj}</small></div>
      </div>
      <div className="resumen">
        <div><b>{t.jugados ? vsPar : '–'}</b><small>Gross</small></div>
        <div><b>{t.gross || '–'}</b><small>Golpes</small></div>
        <div><b>{t.jugados}</b><small>Hoyos</small></div>
        <div><b>{t.puntos}</b><small>Puntos</small></div>
      </div>
      <TarjetaPGA par={cancha.par} golpe={i => t.hoyos[i].golpes} estado={i => t.hoyos[i].estado} recibidos={i => t.hoyos[i].recibidos} />
      <p className="nota">Se actualiza solo. Si un hoyo sale en rojo, su marcador anotó distinto y aún no lo corrigen.</p>
    </main>
  )
}
