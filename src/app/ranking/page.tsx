import Link from 'next/link'
import { cancha, firmadas, golpes, jugadores } from '@/lib/datos'
import { ranking } from '@/lib/golf'
import { requiereUsuario } from '@/lib/sesion'
import Refresco from '../Refresco'
import Icono from '../Icono'

export const dynamic = 'force-dynamic'
const VISTAS = { general: 'General', stableford: 'Stableford', skins: 'Skins', grupo: 'Grupo' } as const
const decimal = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 2 })

export default async function Ranking({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const u = await requiereUsuario()
  const { v = 'general' } = await searchParams
  const vista = (v in VISTAS ? v : 'general') as keyof typeof VISTAS
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

      {vista === 'general' && (
        <>
          <p className="aviso">Suma de los 3 campeonatos: Stableford neto + Skins gross + Grupo neto.</p>
          <table className="general">
            <thead><tr><th className="pos">#</th><th>Jugador</th><th className="num">Stb</th><th className="num">Skn</th><th className="num">Grp</th><th className="num">Total</th></tr></thead>
            <tbody>
              {r.general.map(f => (
                <tr key={f.id} className={f.pos === 1 && f.total ? 'lider' : ''}>
                  <td className="pos">{f.pos}</td>
                  <td>{f.nombre}{f.id === u.id && ' (tú)'}</td>
                  <td className="num">{f.stableford}</td><td className="num">{decimal(f.skins)}</td><td className="num">{decimal(f.grupo)}</td>
                  <td className="num"><b>{decimal(f.total)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

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

      {vista === 'skins' && (
        <>
          <p className="aviso"><b>Skins gross:</b> cada hoyo vale 1 punto para quien haga menos golpes (sin hándicap). Si empatan, el punto se reparte (½, ⅓…).
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

      {vista === 'grupo' && (
        <>
          <p className="aviso"><b>Grupo neto:</b> juegas solo contra tu grupo. Cada hoyo vale 1 punto para el mejor neto del grupo (con tus golpes de hándicap). Si empatan, se reparte.</p>
          {r.grupos.map(g => (
            <section key={g.grupo} style={{ marginBottom: 12 }}>
              <h2 style={{ margin: '8px 0 6px' }}>Grupo {g.grupo} <small style={{ color: 'var(--gris)', textTransform: 'none', letterSpacing: 0 }}>· {g.hoyos.length} de 18 hoyos</small></h2>
              <table>
                <tbody>
                  {g.jugadores.map((j, i) => (
                    <tr key={j.id} className={i === 0 && g.hoyos.length ? 'lider' : ''}>
                      <td>{j.nombre}{j.id === u.id && ' (tú)'}</td><td className="num"><b>{decimal(j.puntos)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </>
      )}
      <p style={{ color: 'var(--gris)', fontSize: 12 }}>Se actualiza solo cada 20 segundos.</p>
    </main>
  )
}
