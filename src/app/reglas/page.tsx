import { cancha, jugadores } from '@/lib/datos'
import { hcpJuego } from '@/lib/golf'
import { requiereUsuario } from '@/lib/sesion'
import Simulador from './Simulador'

export default async function Reglas() {
  const u = await requiereUsuario()
  const grupo = (await jugadores()).filter(j => j.grupo === u.grupo && j.id !== u.id).map(j => j.nombre)
  const hj = hcpJuego(u.indice, cancha)
  return (
    <main className="reglas">
      <h1>Reglas</h1>

      <section className="gana">
        <p>Lo que importa es el <b>Stableford neto</b>: es la copa.</p>
        <div className="suma">
          <span className="principal"><b>Stableford</b><small>la copa · neto</small></span>+
          <span><b>Bonus</b><small>Skins + Grupo</small></span>
        </div>
        <p className="chico">Los bonus suman unos puntos extra en el ranking General.</p>
      </section>

      <details open>
        <summary>Prueba un hoyo</summary>
        <Simulador par={cancha.par} hcp={cancha.hcp} hj={hj} />
      </details>

      <details>
        <summary>Stableford (la copa)</summary>
        <p>Cada hoyo da puntos según tu score <b>neto</b> (tus golpes menos los que recibes):</p>
        <table className="tabla-puntos">
          <tbody>
            <tr><td>Doble bogey o peor</td><td>0</td></tr>
            <tr><td>Bogey</td><td>1</td></tr>
            <tr><td>Par</td><td>2</td></tr>
            <tr><td>Birdie</td><td>3</td></tr>
            <tr><td>Eagle</td><td>4</td></tr>
          </tbody>
        </table>
        <p className="nota">Si ya no puedes sumar puntos en un hoyo, levanta la bola: el juego es más rápido.</p>
      </details>

      <details>
        <summary>Bonus · Skins (gross)</summary>
        <p>Cada hoyo vale <b>1 punto</b> para quien haga <b>menos golpes reales</b>, sin hándicap, contra todos.</p>
        <p>Si empatan, se reparte: 2 empatados → 0,5 cada uno; 3 → 0,33.</p>
      </details>

      <details>
        <summary>Bonus · Grupo (neto)</summary>
        <p>Juegas solo contra tu grupo{grupo.length ? <>: <b>{grupo.join(' y ')}</b></> : ''}.</p>
        <p>Cada hoyo vale <b>1 punto</b> para el mejor <b>neto</b> del grupo. Si empatan, se reparte.</p>
      </details>

      <details>
        <summary>Tu hándicap</summary>
        <p>Con índice <b>{u.indice}</b> juegas con hándicap <b>{hj}</b> (95% del de la cancha).</p>
        <p>Recibes 1 golpe en los {Math.min(hj, 18)} hoyos más difíciles{hj > 18 ? ` y 2 en los ${hj - 18} más difíciles` : ''}.
          En tu tarjeta los ves con un circulito verde con el número.</p>
      </details>

      <details>
        <summary>Cómo anotar</summary>
        <ol>
          <li>Tú anotas tus golpes y los de quien marcas.</li>
          <li>Tu marcador anota los tuyos.</li>
          <li>Si coinciden, el hoyo queda validado. Si no, la celda se pone roja: conversen y corrijan.</li>
          <li>Con los 18 hoyos validados, firmas tu tarjeta.</li>
        </ol>
      </details>

      <details>
        <summary>Tu posición en la tarjeta</summary>
        <p>Los grupos salen uno después del otro, así que &quot;Al hoyo 9&quot; te compara con lo que hicieron los demás <b>en esos mismos 9 hoyos</b>.
          Solo cuentan los que ya pasaron por ese hoyo. <b>T3</b> = empatado en el 3º lugar.</p>
      </details>

      <details>
        <summary>Empates</summary>
        <p>En el General y en el Stableford desempata el Stableford de los últimos 9, 6, 3 y el último hoyo.</p>
      </details>
    </main>
  )
}
