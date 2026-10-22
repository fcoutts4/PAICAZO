import { cancha, firmadas, golpes, jugadores } from '@/lib/datos'
import { posicionEnVivo, tarjeta } from '@/lib/golf'
import { requiereUsuario } from '@/lib/sesion'
import Tarjeta from './Tarjeta'

export const dynamic = 'force-dynamic'

export default async function Inicio() {
  const u = await requiereUsuario()
  const js = await jugadores()
  const marcado = js.find(j => j.id === u.marca)
  const miMarcador = js.find(j => j.marca === u.id)
  const [filas, firmas] = await Promise.all([golpes(), firmadas()]) // todos: para la posición en vivo
  return (
    <main className="compacta">
      <Tarjeta
        cancha={{ par: cancha.par, hcp: cancha.hcp, yardas: cancha.yardas }}
        yo={{ nombre: u.nombre, t: tarjeta(u, filas, cancha), firmada: firmas.has(u.id), marcador: miMarcador?.nombre ?? '—' }}
        posicion={posicionEnVivo(js, filas, cancha, u.id)}
        marcado={marcado ? { id: marcado.id, nombre: marcado.nombre, t: tarjeta(marcado, filas, cancha), firmada: firmas.has(marcado.id) } : null}
      />
    </main>
  )
}
