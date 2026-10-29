import { cancha, jugadores } from '@/lib/datos'
import { gruposParaMostrar, hcpJuego } from '@/lib/golf'
import { requiereUsuario } from '@/lib/sesion'
import Refresco from '../Refresco'

export const dynamic = 'force-dynamic'

/** Los grupos y quién marca a quién; se actualiza solo para que el sorteo del admin aparezca al tiro. */
export default async function Grupos() {
  const u = await requiereUsuario()
  const js = await jugadores()
  const nombre = (id: string) => js.find(j => j.id === id)?.nombre
  return (
    <main>
      <Refresco segundos={10} />
      <h1>Grupos</h1>
      <p className="nota">Cada uno anota sus golpes y los de quien marca. Se actualiza solo: si el admin sortea, aparece aquí.</p>
      {gruposParaMostrar(js).map(g => (
        <section key={g.grupo} className={`grupo tarjeta-ui${g.jugadores.some(j => j.id === u.id) ? ' mio' : ''}`}>
          <h2>Grupo {g.grupo}{g.jugadores.some(j => j.id === u.id) && <small> · tu grupo</small>}</h2>
          <ol>
            {g.jugadores.map(j => (
              <li key={j.id} className={j.id === u.id ? 'yo' : ''}>
                <span><b>{j.nombre}</b>{j.id === u.id && ' (tú)'}{j.noJuega && <em> no juega</em>}<small>HCP {hcpJuego(j.indice, cancha)}</small></span>
                <span className="marca">{j.marca ? <>marca a <b>{nombre(j.marca) ?? '—'}</b></> : <i>sin marcador</i>}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  )
}
