import { marcaPGA, puntosStableford, type Estado } from '@/lib/golf'

/** Tarjeta estilo PGA Tour: círculo birdie, doble círculo eagle, cuadrado bogey, doble cuadrado doble bogey+. */
export default function TarjetaPGA({ par, golpe, estado, recibidos, sel, onSel }: {
  par: number[]; golpe: (i: number) => number | null; estado: (i: number) => Estado
  recibidos: (i: number) => number; sel?: number; onSel?: (i: number) => void
}) {
  const suma = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0)
  const pts = (i: number) => puntosStableford(golpe(i), par[i], recibidos(i))
  const mitades = [[0, 'Ida'], [9, 'Vta']] as const
  return (
    <div className="pga">
      {mitades.map(([desde, nombre]) => {
        const idx = Array.from({ length: 9 }, (_, k) => desde + k)
        return (
          <table key={nombre}>
            <thead>
              <tr><th>Hoyo</th>{idx.map(i => <th key={i} aria-current={i === sel || undefined} onClick={onSel && (() => onSel(i))}>{i + 1}</th>)}<th>{nombre}</th></tr>
            </thead>
            <tbody>
              <tr className="par"><td>Par</td>{idx.map(i => <td key={i}>{par[i]}</td>)}<td>{suma(idx.map(i => par[i]))}</td></tr>
              <tr className="golpes">
                <td>Golpes</td>
                {idx.map(i => (
                  <td key={i} className={estado(i)} aria-current={i === sel || undefined} onClick={onSel && (() => onSel(i))}>
                    <span className={`m ${marcaPGA(golpe(i), par[i]) ?? ''}`}>{golpe(i) ?? ''}</span>
                    {recibidos(i) > 0 && <i className="recibe" title={`Recibe ${recibidos(i)} golpe(s)`}>{recibidos(i)}</i>}
                  </td>
                ))}
                <td><b>{suma(idx.map(golpe)) || ''}</b></td>
              </tr>
              <tr className="pts"><td>Pts</td>{idx.map(i => <td key={i}>{pts(i) ?? ''}</td>)}<td><b>{suma(idx.map(pts)) || ''}</b></td></tr>
            </tbody>
          </table>
        )
      })}
      <p className="leyenda">
        <span className="m eagle" /> eagle <span className="m birdie" /> birdie <span className="m bogey" /> bogey
        <span className="m doble" /> doble+ <i className="recibe">1</i> golpes que recibes
      </p>
    </div>
  )
}
