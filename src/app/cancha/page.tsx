import { cancha } from '@/lib/datos'
import { requiereUsuario } from '@/lib/sesion'
import canchaJson from '../../../data/cancha.json'
import etiquetas from '../../../data/mapa-etiquetas.json'
import Vista from './Vista'

export default async function Cancha() {
  await requiereUsuario()
  return (
    <main>
      <h1>La cancha</h1>
      <Vista par={cancha.par} yardas={cancha.yardas} hcp={cancha.hcp} etiquetas={etiquetas} />

      {/* reglas locales de la tarjeta oficial 2025 de Paico Alto */}
      <h2>Reglas locales</h2>
      <div className="reglas">
        {canchaJson.reglas_locales.map(r => (
          <details key={r.titulo}>
            <summary>{r.titulo}</summary>
            <p>{r.texto}</p>
          </details>
        ))}
      </div>
      <p className="aviso ok">{canchaJson.etiqueta}</p>
      <p className="nota"><b>Ritmo de juego:</b> {canchaJson.ritmo}</p>
    </main>
  )
}
