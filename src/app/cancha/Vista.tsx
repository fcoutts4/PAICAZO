'use client'
import { useState } from 'react'

type Props = { par: number[]; yardas: number[]; hcp: number[] }

export default function Vista({ par, yardas, hcp }: Props) {
  const [sel, setSel] = useState<number | null>(0) // null = cancha completa
  const ida = par.slice(0, 9)
  const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  return (
    <div className="cancha">
      <table className="cancha-tabla">
        <thead><tr><th>#</th><th className="num">Par</th><th className="num">Yds</th><th className="num">HCP</th></tr></thead>
        <tbody>
          {ida.map((p, i) => (
            <tr key={i} aria-selected={sel === i} onClick={() => setSel(sel === i ? null : i)}>
              <td><b>{i + 1}</b><small>{i + 10}</small></td>
              <td className="num">{p}</td>
              <td className="num">{yardas[i]}<small>{yardas[i + 9]}</small></td>
              <td className="num">{hcp[i]}<small>{hcp[i + 9]}</small></td>
            </tr>
          ))}
          <tr className="total" onClick={() => setSel(null)}>
            <td>Tot</td><td className="num">{suma(ida)}</td><td className="num">{suma(yardas.slice(0, 9))}<small>{suma(yardas.slice(9))}</small></td><td />
          </tr>
        </tbody>
      </table>
      <div className="cancha-mapa">
        <img key={sel ?? 'todo'} src={sel == null ? '/mapa-9-hoyos.svg' : `/hoyo-${sel + 1}.svg`} alt={sel == null ? 'Mapa de la cancha' : `Hoyo ${sel + 1}`} />
        <button className="btn chico" onClick={() => setSel(sel == null ? 0 : null)}>{sel == null ? 'Ver por hoyo' : 'Ver cancha completa'}</button>
      </div>
    </div>
  )
}
