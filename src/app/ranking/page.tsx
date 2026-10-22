import Link from 'next/link'
import { cancha, firmadas, golpes, jugadores } from '@/lib/datos'
import { marcaPGA, ranking, tarjeta } from '@/lib/golf'
import { requiereUsuario } from '@/lib/sesion'
import Refresco from '../Refresco'
import Icono from '../Icono'

export const dynamic = 'force-dynamic'
const VISTAS = { general: 'General', stableford: 'Copa', skins: 'Pellejos', grupo: 'Gallos', hoyos: 'Hoyos' } as const
const vsParTxt = (n: number) => (n > 0 ? `+${n}` : n === 0 ? 'E' : String(n))
const decimal = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 2 })

export default async function Ranking({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const u = await requiereUsuario()
  const { v = 'general' } = await searchParams
  const vista = (v in VISTAS ? v : 'general') as keyof typeof VISTAS
  const js = await jugadores()
  const nombre = (id: string) => js.find(j => j.id === id)?.nombre ?? id
  const filas = await golpes()
  const r = ranking(js, filas, cancha, await firmadas())

  return (
    <main>
      <Refresco />
      <h1>Ranking en vivo</h1>
      <nav className="tabs">
        {Object.entries(VISTAS).map(([k, t]) => (
          <Link key={k} href={`/ranking?v=${k}`} aria-current={k === vista ? 'page' : undefined}>{t}</Link>
        ))}
      </nav>

      {vista === 'general' && (
        <>
          <p className="aviso"><b>Copa Paicazo</b> (Stableford neto, lo principal) + <b>bonus</b> de Los Pellejos y Pelea de Gallos. Toca un nombre para ver su tarjeta.</p>
          <table className="general">
            <thead><tr><th className="pos">#</th><th>Jugador</th><th className="num">Copa</th><th className="num">Bonus</th><th className="num">Total</th></tr></thead>
            <tbody>
              {r.general.map(f => (
                <tr key={f.id} className={f.pos === 1 && f.total ? 'lider' : ''}>
                  <td className="pos">{f.pos}</td>
                  <td><Link className="ver-tarjeta" href={`/jugador/${f.id}`}>{f.nombre}</Link>{f.id === u.id && ' (tú)'}</td>
                  <td className="num"><b>{f.stableford}</b></td><td className="num bonus">+{decimal(f.skins + f.grupo)}</td>
                  <td className="num"><b>{decimal(f.total)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {vista === 'stableford' && (
        <table>
          <thead><tr><th className="pos">#</th><th>Jugador</th><th className="num">Hoyos</th><th className="num">Gross</th><th className="num">Pts</th></tr></thead>
          <tbody>
            {r.stableford.map(f => (
              <tr key={f.id} className={f.pos === 1 && f.jugados ? 'lider' : ''}>
                <td className="pos">{f.pos}</td>
                <td><Link className="ver-tarjeta" href={`/jugador/${f.id}`}>{f.nombre}</Link>{f.id === u.id && ' (tú)'} {f.firmada && <span className="firmada"><Icono n="ok" size={12} /> firmada</span>}</td>
                <td className="num">{f.jugados}</td><td className="num">{f.jugados ? vsParTxt(f.vsPar) : '–'}</td><td className="num"><b>{f.puntos}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {vista === 'skins' && (
        <>
          <p className="aviso"><b>Los Pellejos (skins gross, bonus):</b> cada hoyo vale 1 punto para quien haga menos golpes (sin hándicap). Si empatan, el punto se reparte entre todos los que empataron (½, ⅓…).
            Cuentan los hoyos que ya jugaron todos: van {r.skins.jugados} de 18.</p>
          <table>
            <thead><tr><th>Jugador</th><th className="num">Pellejos</th><th>Hoyos</th></tr></thead>
            <tbody>
              {Object.entries(r.skins.porJugador).sort((a, b) => b[1] - a[1]).map(([id, n]) => (
                <tr key={id}>
                  <td><Link className="ver-tarjeta" href={`/jugador/${id}`}>{nombre(id)}</Link></td><td className="num"><b>{decimal(n)}</b></td>
                  <td>{r.skins.ganados.filter(g => g.ids.includes(id)).map(g => (g.valor < 1 ? `${g.hoyo} (${decimal(g.valor)})` : g.hoyo)).join(', ')}</td>
                </tr>
              ))}
              {!r.skins.ganados.length && <tr><td colSpan={3}>Aún no hay skins ganados.</td></tr>}
            </tbody>
          </table>
        </>
      )}

      {vista === 'grupo' && (
        <>
          <p className="aviso"><b>Pelea de Gallos (grupo neto, bonus):</b> juegas solo contra tu grupo. Cada hoyo vale 1 punto para el mejor neto del grupo (con tus golpes de hándicap). Si empatan, se reparte.</p>
          {r.grupos.map(g => (
            <section key={g.grupo} style={{ marginBottom: 12 }}>
              <h2 style={{ margin: '8px 0 6px' }}>Grupo {g.grupo} <small style={{ color: 'var(--gris)', textTransform: 'none', letterSpacing: 0 }}>· {g.hoyos.length} de 18 hoyos</small></h2>
              <table>
                <tbody>
                  {g.jugadores.map((j, i) => (
                    <tr key={j.id} className={i === 0 && g.hoyos.length ? 'lider' : ''}>
                      <td><Link className="ver-tarjeta" href={`/jugador/${j.id}`}>{j.nombre}</Link>{j.id === u.id && ' (tú)'}</td><td className="num"><b>{decimal(j.puntos)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </>
      )}
      {vista === 'hoyos' && (() => {
        // todos los jugadores, golpes reales hoyo a hoyo; ordenados como leaderboard gross
        const ts = js.map(j => ({ j, t: tarjeta(j, filas, cancha) }))
          .sort((a, b) => (a.t.jugados ? 0 : 1) - (b.t.jugados ? 0 : 1) || a.t.vsPar - b.t.vsPar || b.t.jugados - a.t.jugados)
        const suma = (xs: (number | null)[]) => xs.reduce<number>((x, y) => x + (y ?? 0), 0)
        const mitad = (t: (typeof ts)[number]['t'], d: number) => t.hoyos.slice(d, d + 9).map(h => h.golpes)
        const celda = (g: number | null, par: number) => <span className={`m ${marcaPGA(g, par) ?? ''}`}>{g ?? ''}</span>
        return (
          <>
            <p className="aviso">Golpes reales (gross) de todos, hoyo a hoyo. Desliza hacia el lado; el nombre queda fijo.</p>
            <div className="tabla-hoyos">
              <table>
                <thead>
                  <tr>
                    <th className="fijo">Jugador</th><th>±Par</th><th>Hoyos</th>
                    {cancha.par.slice(0, 9).map((_, i) => <th key={i}>{i + 1}</th>)}<th className="sub">Ida</th>
                    {cancha.par.slice(9).map((_, i) => <th key={i}>{i + 10}</th>)}<th className="sub">Vta</th><th className="sub">Tot</th>
                  </tr>
                  <tr className="par">
                    <td className="fijo">Par</td><td /><td />
                    {cancha.par.slice(0, 9).map((p, i) => <td key={i}>{p}</td>)}<td className="sub">{suma(cancha.par.slice(0, 9))}</td>
                    {cancha.par.slice(9).map((p, i) => <td key={i}>{p}</td>)}<td className="sub">{suma(cancha.par.slice(9))}</td><td className="sub">{suma(cancha.par)}</td>
                  </tr>
                </thead>
                <tbody>
                  {ts.map(({ j, t }) => (
                    <tr key={j.id} className={j.id === u.id ? 'yo' : ''}>
                      <td className="fijo"><Link className="ver-tarjeta" href={`/jugador/${j.id}`}>{j.nombre}</Link></td>
                      <td><b>{t.jugados ? vsParTxt(t.vsPar) : '–'}</b></td><td>{t.jugados}</td>
                      {mitad(t, 0).map((g, i) => <td key={i}>{celda(g, cancha.par[i])}</td>)}<td className="sub">{suma(mitad(t, 0)) || ''}</td>
                      {mitad(t, 9).map((g, i) => <td key={i}>{celda(g, cancha.par[i + 9])}</td>)}<td className="sub">{suma(mitad(t, 9)) || ''}</td>
                      <td className="sub"><b>{t.gross || ''}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      })()}

      <p style={{ color: 'var(--gris)', fontSize: 12 }}>Se actualiza solo cada 20 segundos.</p>
    </main>
  )
}
