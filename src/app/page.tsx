import { cancha, firmadas, golpes, jugador, jugadores } from '@/lib/datos'
import { tarjeta } from '@/lib/golf'
import { requiereUsuario } from '@/lib/sesion'
import Tarjeta from './Tarjeta'

export const dynamic = 'force-dynamic'

export default async function Inicio() {
  const u = await requiereUsuario()
  const marcado = jugador(u.marca)
  const miMarcador = jugadores.find(j => j.marca === u.id)
  const filas = await golpes([u.id, ...(marcado ? [marcado.id] : [])])
  const firmas = await firmadas()
  return (
    <main>
      {cancha.provisorio && <div className="aviso">HCP de hoyos, slope y rating son provisorios: los puntos pueden cambiar al cargar la tarjeta oficial.</div>}
      <Tarjeta
        cancha={{ par: cancha.par, hcp: cancha.hcp, yardas: cancha.yardas }}
        yo={{ nombre: u.nombre, t: tarjeta(u, filas, cancha), firmada: firmas.has(u.id), marcador: miMarcador?.nombre ?? '—' }}
        marcado={marcado ? { id: marcado.id, nombre: marcado.nombre, t: tarjeta(marcado, filas, cancha), firmada: firmas.has(marcado.id) } : null}
      />
    </main>
  )
}
