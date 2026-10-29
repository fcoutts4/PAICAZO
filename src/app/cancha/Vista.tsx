'use client'
import { useState } from 'react'
import Icono from '../Icono'

type Props = { par: number[]; yardas: number[]; hcp: number[]; etiquetas: Record<string, number[]> }

const miles = (n: number) => n.toLocaleString('es-CL')
const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** La cancha: mapa completo (con los números tocables) o hoyo a hoyo, siempre a todo el ancho. */
export default function Vista({ par, yardas, hcp, etiquetas }: Props) {
  const [hoyo, setHoyo] = useState<number | null>(null) // null = mapa completo; 0..8 = ese hoyo
  const ida = par.slice(0, 9).map((_, i) => i)

  const elegir = (i: number | null) => { setHoyo(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <>
      <div className="resumen">
        <div><b>{suma(par)}</b><small>Par</small></div>
        <div><b>{miles(suma(yardas))}</b><small>Yardas</small></div>
        <div><b>9×2</b><small>Hoyos</small></div>
        <div><b>Azul</b><small>Salida</small></div>
      </div>

      <nav className="tabs">
        <button aria-current={hoyo == null ? 'page' : undefined} onClick={() => setHoyo(null)}>Mapa</button>
        <button aria-current={hoyo != null ? 'page' : undefined} onClick={() => setHoyo(hoyo ?? 0)}>Hoyo a hoyo</button>
      </nav>

      {hoyo == null ? (
        <>
          {/* en el teléfono los números quedan a pocos px: abre el más cercano al dedo (la tabla de abajo es la vía accesible) */}
          <div className="mapa-completo" onClick={e => {
            const r = e.currentTarget.getBoundingClientRect()
            const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100
            const [n, d] = Object.entries(etiquetas).map(([n, [ex, ey]]) => [Number(n), Math.hypot(ex - x, ey - y)] as const).sort((a, b) => a[1] - b[1])[0]
            if (d < 12) elegir(n - 1)
          }}>
            <img src="/mapa-9-hoyos.svg" alt="Mapa de la cancha; la tabla de abajo tiene cada hoyo" />
          </div>
          <p className="nota centro">Toca un número del mapa o una fila de la tabla para ver ese hoyo.</p>

          <table className="cancha-tabla">
            <thead>
              <tr><th className="num centro">Hoyo</th><th className="num centro">Par</th><th className="num">Ida</th><th className="num">Vuelta</th><th className="num centro">HCP</th><th /></tr>
            </thead>
            <tbody>
              {ida.map(i => (
                <tr key={i} onClick={() => elegir(i)}>
                  <td className="num centro"><b>{i + 1}</b><small>{i + 10}</small></td>
                  <td className="num centro">{par[i]}</td>
                  <td className="num">{yardas[i]}</td>
                  <td className="num">{yardas[i + 9]}</td>
                  <td className="num centro">{hcp[i]}<small>{hcp[i + 9]}</small></td>
                  <td className="ir"><Icono n="despues" size={16} /></td>
                </tr>
              ))}
              <tr className="total">
                <td className="num centro">Total</td><td className="num centro">{suma(par.slice(0, 9))}</td>
                <td className="num">{miles(suma(yardas.slice(0, 9)))}</td><td className="num">{miles(suma(yardas.slice(9)))}</td><td /><td />
              </tr>
            </tbody>
          </table>
          <p className="nota">Yardas desde la salida azul. En chico, el hoyo y el HCP de la vuelta (HCP 1 = el más difícil).</p>
        </>
      ) : (
        <>
          <div className="chips">
            {ida.map(i => (
              <button key={i} aria-current={i === hoyo ? 'page' : undefined} onClick={() => setHoyo(i)}>{i + 1}</button>
            ))}
          </div>

          <section className="ficha-hoyo">
            <div className="nav-hoyo">
              <button aria-label="Hoyo anterior" disabled={hoyo === 0} onClick={() => setHoyo(hoyo - 1)}><Icono n="antes" /></button>
              <div><b>Hoyo {hoyo + 1}</b><small>En la vuelta es el {hoyo + 10}</small></div>
              <button aria-label="Hoyo siguiente" disabled={hoyo === 8} onClick={() => setHoyo(hoyo + 1)}><Icono n="despues" /></button>
            </div>
            <dl>
              <div><dt>Par</dt><dd>{par[hoyo]}</dd></div>
              <div><dt>Ida</dt><dd>{yardas[hoyo]}<small> yds</small></dd></div>
              <div><dt>Vuelta</dt><dd>{yardas[hoyo + 9]}<small> yds</small></dd></div>
              <div><dt>HCP</dt><dd>{hcp[hoyo]}<small> / {hcp[hoyo + 9]}</small></dd></div>
            </dl>
          </section>

          <img key={hoyo} className="mapa-hoyo" src={`/hoyo-${hoyo + 1}.svg`} alt={`Hoyo ${hoyo + 1}`} />
        </>
      )}
    </>
  )
}
