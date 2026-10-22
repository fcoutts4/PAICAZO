'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { estadoHoyo, marcaPGA, puntosStableford, type Estado, type Tarjeta as T } from '@/lib/golf'
import Icono from './Icono'

type Props = {
  cancha: { par: number[]; hcp: number[]; yardas: number[] }
  yo: { nombre: string; t: T; firmada: boolean; marcador: string }
  marcado: { id: string; nombre: string; t: T; firmada: boolean } | null
}
type Valores = (number | null)[]

export default function Tarjeta({ cancha, yo, marcado }: Props) {
  const router = useRouter()
  const mios = yo.t.hoyos.map(h => h.propio)
  const suyos = marcado?.t.hoyos.map(h => h.marcador) ?? []
  const [mio, setMio] = useState<Valores>(mios)
  const [suyo, setSuyo] = useState<Valores>(suyos)
  const [h, setH] = useState(() => { const i = mios.findIndex(v => v == null); return i < 0 ? 17 : i })
  const [ver, setVer] = useState<'yo' | 'marcado'>('yo')
  const [error, setError] = useState('')
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // lo que llega del servidor manda sobre lo local; cada 15 s trae lo que anotó el otro
  useEffect(() => setMio(mios), [JSON.stringify(mios)]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setSuyo(suyos), [JSON.stringify(suyos)]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const i = setInterval(() => router.refresh(), 15000); return () => clearInterval(i) }, [router])

  function guardar(jugador: string, porMarcador: boolean, hoyo: number, golpes: number | null) {
    const k = `${jugador}-${porMarcador}-${hoyo}`
    clearTimeout(timers.current[k])
    timers.current[k] = setTimeout(async () => {
      const r = await fetch('/api/golpes', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jugador, hoyo, por_marcador: porMarcador, golpes }),
      }).catch(() => null)
      setError(r?.ok ? '' : 'No se pudo guardar. Revisa la señal e inténtalo de nuevo.')
      router.refresh()
    }, 500)
  }

  function cambiar(quien: 'mio' | 'suyo', delta: number) {
    const [vals, set] = quien === 'mio' ? [mio, setMio] : [suyo, setSuyo]
    const actual = vals[h]
    const nuevo = actual == null ? cancha.par[h] : actual + delta < 1 ? null : Math.min(15, actual + delta)
    set(vals.map((v, i) => (i === h ? nuevo : v)))
    if (quien === 'mio') guardar(yo.t.id, false, h + 1, nuevo)
    else if (marcado) guardar(marcado.id, true, h + 1, nuevo)
  }

  async function firmar() {
    const r = await fetch('/api/firmar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    setError(r.ok ? '' : (await r.json()).error)
    router.refresh()
  }

  // mi tarjeta: lo que anoté yo (o, si falta, lo que anotó mi marcador)
  const miGolpe = (i: number) => mio[i] ?? yo.t.hoyos[i].marcador
  const miEstado = (i: number) => estadoHoyo(mio[i], yo.t.hoyos[i].marcador)
  const suGolpe = (i: number) => marcado ? marcado.t.hoyos[i].propio ?? suyo[i] : null
  const suEstado = (i: number): Estado => marcado ? estadoHoyo(marcado.t.hoyos[i].propio, suyo[i]) : 'vacio'
  const recibe = yo.t.hoyos[h].recibidos
  const total = cancha.par.reduce((a, p, i) => a + (puntosStableford(miGolpe(i), p, yo.t.hoyos[i].recibidos) ?? 0), 0)
  const jugados = cancha.par.filter((_, i) => miGolpe(i) != null).length
  const vsPar = cancha.par.reduce((a, p, i) => a + (miGolpe(i) != null ? miGolpe(i)! - p : 0), 0)
  const listoFirmar = !yo.firmada && yo.t.hoyos.every(x => x.estado === 'ok')

  return (
    <>
      <div className="resumen">
        <div><b>{total}</b><small>Puntos</small></div>
        <div><b>{vsPar > 0 ? `+${vsPar}` : vsPar || 'E'}</b><small>vs par</small></div>
        <div><b>{jugados}</b><small>Hoyos</small></div>
        <div><b>{yo.t.hj}</b><small>HCP</small></div>
      </div>

      <section className="anotar">
        <div className="nav-hoyo">
          <button aria-label="Hoyo anterior" disabled={h === 0} onClick={() => setH(h - 1)}><Icono n="antes" /></button>
          <div>
            <b>Hoyo {h + 1}</b>
            <small>Par {cancha.par[h]} · {cancha.yardas[h]} yds · HCP {cancha.hcp[h]}{recibe > 0 ? ` · recibes ${recibe}` : ''}</small>
          </div>
          <button aria-label="Hoyo siguiente" disabled={h === 17} onClick={() => setH(h + 1)}><Icono n="despues" /></button>
        </div>
        <Fila nombre="Tú" detalle={`Marca: ${yo.marcador}`} valor={mio[h]} estado={miEstado(h)} otro={yo.t.hoyos[h].marcador}
          bloqueado={yo.firmada} onMenos={() => cambiar('mio', -1)} onMas={() => cambiar('mio', 1)} />
        {marcado && (
          <Fila nombre={marcado.nombre} detalle="Tú marcas" valor={suyo[h]} estado={suEstado(h)} otro={marcado.t.hoyos[h].propio}
            bloqueado={marcado.firmada} onMenos={() => cambiar('suyo', -1)} onMas={() => cambiar('suyo', 1)} />
        )}
      </section>

      {error && <div className="aviso error">{error}</div>}

      {marcado && (
        <nav className="tabs">
          <a href="#" aria-current={ver === 'yo' ? 'page' : undefined} onClick={e => { e.preventDefault(); setVer('yo') }}>Mi tarjeta</a>
          <a href="#" aria-current={ver === 'marcado' ? 'page' : undefined} onClick={e => { e.preventDefault(); setVer('marcado') }}>{marcado.nombre}</a>
        </nav>
      )}
      {ver === 'yo' || !marcado
        ? <TarjetaPGA par={cancha.par} golpe={miGolpe} estado={miEstado} recibidos={i => yo.t.hoyos[i].recibidos} sel={h} onSel={setH} />
        : <TarjetaPGA par={cancha.par} golpe={suGolpe} estado={suEstado} recibidos={i => marcado.t.hoyos[i].recibidos} sel={h} onSel={setH} />}

      {yo.firmada
        ? <div className="aviso ok"><Icono n="ok" size={16} /> Tarjeta firmada. Para corregir algo, pídeselo al admin.</div>
        : listoFirmar && <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={firmar}>Firmar mi tarjeta</button>}
    </>
  )
}

function Fila({ nombre, detalle, valor, estado, otro, bloqueado, onMenos, onMas }: {
  nombre: string; detalle: string; valor: number | null; estado: Estado; otro: number | null
  bloqueado: boolean; onMenos: () => void; onMas: () => void
}) {
  const aviso = estado === 'ok' ? <><Icono n="ok" size={14} /> Coincide</>
    : estado === 'conflicto' ? <><Icono n="mal" size={14} /> El otro anotó {otro}</>
    : estado === 'pendiente' ? <><Icono n="espera" size={14} /> {valor == null ? `El otro anotó ${otro}` : 'Falta el otro'}</>
    : null
  return (
    <div className="fila">
      <div className="quien">{nombre}<small>{detalle}</small>{aviso && <span className={`estado ${estado}`}>{aviso}</span>}</div>
      <div className="paso">
        <button aria-label={`Restar golpe a ${nombre}`} disabled={bloqueado} onClick={onMenos}>−</button>
        <output>{valor ?? '–'}</output>
        <button aria-label={`Sumar golpe a ${nombre}`} disabled={bloqueado} onClick={onMas}>+</button>
      </div>
    </div>
  )
}

/** Tarjeta estilo PGA Tour: círculo birdie, doble círculo eagle, cuadrado bogey, doble cuadrado doble bogey+. */
function TarjetaPGA({ par, golpe, estado, recibidos, sel, onSel }: {
  par: number[]; golpe: (i: number) => number | null; estado: (i: number) => Estado
  recibidos: (i: number) => number; sel: number; onSel: (i: number) => void
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
              <tr><th>Hoyo</th>{idx.map(i => <th key={i} aria-current={i === sel || undefined} onClick={() => onSel(i)}>{i + 1}</th>)}<th>{nombre}</th></tr>
            </thead>
            <tbody>
              <tr className="par"><td>Par</td>{idx.map(i => <td key={i}>{par[i]}</td>)}<td>{suma(idx.map(i => par[i]))}</td></tr>
              <tr className="golpes">
                <td>Golpes</td>
                {idx.map(i => (
                  <td key={i} className={estado(i)} aria-current={i === sel || undefined} onClick={() => onSel(i)}>
                    <span className={`m ${marcaPGA(golpe(i), par[i]) ?? ''}`}>{golpe(i) ?? ''}</span>
                    {recibidos(i) > 0 && <i className="golpe-recibido" title="Recibe golpe" />}
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
        <span className="m doble" /> doble+ <i className="golpe-recibido" /> recibe golpe
      </p>
    </div>
  )
}
