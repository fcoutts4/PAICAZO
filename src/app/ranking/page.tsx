import Link from 'next/link'
import { cancha, firmadas, golpes, jugadores } from '@/lib/datos'
import { ranking } from '@/lib/golf'
import { requiereUsuario } from '@/lib/sesion'
import Refresco from '../Refresco'
import Icono from '../Icono'

export const dynamic = 'force-dynamic'
const VISTAS = { stableford: 'Stableford neto', gross: 'Gross', skins: 'Skins', grupos: 'Copa grupos' } as const
const decimal = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 2 })
const vsPar = (n: number) => (n > 0 ? `+${n}` : n === 0 ? 'E' : String(n))

export default async function Ranking({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const u = await requiereUsuario()
  const { v = 'stableford' } = await searchParams
  const vista = (v in VISTAS ? v : 'stableford') as keyof typeof VISTAS
  const js = await jugadores()
  const nombre = (id: string) => js.find(j => j.id === id)?.nombre ?? id
  const r = ranking(js, await golpes(), cancha, await firmadas())

  return (
    <main>
      <Refresco />
      <h1>Ranking en vivo</h1>
      <nav className="tabs">
        {Object.entries(VISTAS).map(([k, t]) => (
          <Link key={k} href={`/ranking?v=${k}`} aria-current={k === vista ? 'page' : undefined}>{t}</Link>
        ))}
      </nav>

      {vista === 'stableford' && (
        <table>
          <thead><tr><th className="pos">#</th><th>Jugador</th><th className="num">HCP</th><th className="num">Hoyos</th><th className="num">Puntos</th></tr></thead>
          <tbody>
            {r.stableford.map(f => (
              <tr key={f.id} className={f.pos === 1 && f.jugados ? 'lider' : ''}>
                <td className="pos">{f.pos}</td>
                <td>{f.nombre}{f.id === u.id && ' (tú)'} {f.firmada && <span className="firmada"><Icono n="ok" size={12} /> firmada</span>}</td>
                <td className="num">{f.hj}</td><td className="num">{f.jugados}</td><td className="num"><b>{f.puntos}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {vista === 'gross' && (
        <table>
          <thead><tr><th className="pos">#</th><th>Jugador</th><th className="num">Hoyos</th><th className="num">Golpes</th><th className="num">vs par</th></tr></thead>
          <tbody>
            {r.gross.map(f => (
              <tr key={f.id} className={f.pos === 1 && f.jugados ? 'lider' : ''}>
                <td className="pos">{f.jugados ? f.pos : '–'}</td><td>{f.nombre}</td>
                <td className="num">{f.jugados}</td><td className="num">{f.gross || '–'}</td>
                <td className="num"><b>{f.jugados ? vsPar(f.vsPar) : '–'}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {vista === 'skins' && (
        <>
          <p className="aviso">Cada hoyo vale 1 punto para quien haga menos golpes (gross, sin hándicap). Si empatan, el punto se reparte (½, ⅓…).
            Cuentan los hoyos que ya jugaron todos: van {r.skins.jugados} de 18.</p>
          <table>
            <thead><tr><th>Jugador</th><th className="num">Skins</th><th>Hoyos</th></tr></thead>
            <tbody>
              {Object.entries(r.skins.porJugador).sort((a, b) => b[1] - a[1]).map(([id, n]) => (
                <tr key={id}>
                  <td>{nombre(id)}</td><td className="num"><b>{decimal(n)}</b></td>
                  <td>{r.skins.ganados.filter(g => g.ids.includes(id)).map(g => (g.valor < 1 ? `${g.hoyo} (${decimal(g.valor)})` : g.hoyo)).join(', ')}</td>
                </tr>
              ))}
              {!r.skins.ganados.length && <tr><td colSpan={3}>Aún no hay skins ganados.</td></tr>}
            </tbody>
          </table>
        </>
      )}

      {vista === 'grupos' && (
        <>
          <p className="aviso">Por cada hoyo suman los 2 mejores puntajes Stableford del grupo.</p>
          <table>
            <thead><tr><th className="pos">#</th><th>Grupo</th><th className="num">Puntos</th></tr></thead>
            <tbody>
              {r.grupos.map((g, i) => (
                <tr key={g.grupo} className={i === 0 ? 'lider' : ''}>
                  <td className="pos">{i + 1}</td>
                  <td><b>Grupo {g.grupo}</b><br /><small>{g.jugadores.join(' · ')}</small></td>
                  <td className="num"><b>{g.puntos}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p style={{ color: 'var(--gris)', fontSize: 12 }}>Se actualiza solo cada 20 segundos.</p>
    </main>
  )
}
