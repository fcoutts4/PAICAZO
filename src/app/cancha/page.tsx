import { cancha } from '@/lib/datos'
import { requiereUsuario } from '@/lib/sesion'
import etiquetas from '../../../data/mapa-etiquetas.json'
import Vista from './Vista'

export default async function Cancha() {
  await requiereUsuario()
  return (
    <main>
      <h1>La cancha</h1>
      <Vista par={cancha.par} yardas={cancha.yardas} hcp={cancha.hcp} etiquetas={etiquetas} />
      {cancha.provisorio && <p className="aviso" style={{ marginTop: 12 }}>Slope ({cancha.slope}) y rating ({cancha.rating}) son provisorios.</p>}
    </main>
  )
}
