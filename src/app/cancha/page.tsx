import { cancha } from '@/lib/datos'
import { requiereUsuario } from '@/lib/sesion'
import Vista from './Vista'

export default async function Cancha() {
  await requiereUsuario()
  return (
    <main>
      <h1>La cancha</h1>
      <p className="nota">Hoyos 1 al 9 dos veces (par 70, salida azul); la vuelta sale de otras marcas. En chico, el número, las yardas y el HCP de la vuelta. Toca un hoyo para verlo.</p>
      <Vista par={cancha.par} yardas={cancha.yardas} hcp={cancha.hcp} />
      {cancha.provisorio && <p className="aviso" style={{ marginTop: 12 }}>Slope ({cancha.slope}) y rating ({cancha.rating}) son provisorios.</p>}
    </main>
  )
}
