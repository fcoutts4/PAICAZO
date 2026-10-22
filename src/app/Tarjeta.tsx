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
type Envio = { jugador: string; hoyo: number; por_marcador: boolean; golpes: number | null }
const CLAVE = 'paicazo-pendientes' // golpes anotados que aún no llegan al servidor (sin señal)
const clave = (e: Omit<Envio, 'golpes'>) => `${e.jugador}-${e.por_marcador}-${e.hoyo}`
const enTelefono = (p: Record<string, Envio>) => { try { localStorage.setItem(CLAVE, JSON.stringify(p)) } catch {} return p }

export default function Tarjeta({ cancha, yo, marcado }: Props) {
  const router = useRouter()
  const [pend, setPend] = useState<Record<string, Envio>>({})
  const [h, setH] = useState(() => { const i = yo.t.hoyos.findIndex(x => x.propio == null); return i < 0 ? 17 : i })
  const [ver, setVer] = useState<'yo' | 'marcado'>('yo')
  const [error, setError] = useState('')
  const [sinSenal, setSinSenal] = useState(false)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // lo anotado y aún no enviado manda sobre lo que trae el servidor
  const valor = (jugador: string, porMarcador: boolean, i: number, servidor: number | null) => {
    const k = clave({ jugador, por_marcador: porMarcador, hoyo: i + 1 })
    return k in pend ? pend[k].golpes : servidor
  }
  const mio = yo.t.hoyos.map((x, i) => valor(yo.t.id, false, i, x.propio))
  const suyo = marcado ? marcado.t.hoyos.map((x, i) => valor(marcado.id, true, i, x.marcador)) : []

  async function enviar(e: Envio) {
    const r = await fetch('/api/golpes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e) }).catch(() => null)
    if (!r) { setSinSenal(true); return } // sin señal: queda pendiente y se reintenta
    setSinSenal(false)
    if (!r.ok) setError('No se pudo guardar ese golpe (tarjeta firmada o sin permiso).')
    setPend(p => { const k = clave(e); if (!(k in p) || p[k].golpes !== e.golpes) return p; const { [k]: _, ...resto } = p; return enTelefono(resto) })
    router.refresh()
  }

  // pendientes: se guardan en el teléfono y se reintentan cada 10 s y al volver la señal
  useEffect(() => { try { setPend(JSON.parse(localStorage.getItem(CLAVE) ?? '{}')) } catch {} }, [])
  const pendRef = useRef(pend); pendRef.current = pend
  useEffect(() => {
    const reintentar = () => Object.values(pendRef.current).forEach(enviar)
    const i = setInterval(() => { reintentar(); router.refresh() }, 10000)
    window.addEventListener('online', reintentar)
    return () => { clearInterval(i); window.removeEventListener('online', reintentar) }
  }, [router]) // eslint-disable-line react-hooks/exhaustive-deps

  function guardar(e: Envio) {
    const k = clave(e)
    setPend(p => enTelefono({ ...p, [k]: e }))
    clearTimeout(timers.current[k])
    timers.current[k] = setTimeout(() => enviar(e), 500)
  }

  function cambiar(quien: 'mio' | 'suyo', delta: number) {
    const actual = quien === 'mio' ? mio[h] : suyo[h]
    const nuevo = actual == null ? cancha.par[h] : actual + delta < 1 ? null : Math.min(15, actual + delta)
    if (quien === 'mio') guardar({ jugador: yo.t.id, por_marcador: false, hoyo: h + 1, golpes: nuevo })
    else if (marcado) guardar({ jugador: marcado.id, por_marcador: true, hoyo: h + 1, golpes: nuevo })
  }
  const nPend = Object.keys(pend).length

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
        <div><b>{vsPar > 0 ? `+${vsPar}` : vsPar || 'E'}</b><small>Gross</small></div>
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
        <Fila nombre="Tú" detalle={`Te marca ${yo.marcador}`} valor={mio[h]} estado={miEstado(h)} otro={yo.t.hoyos[h].marcador}
          bloqueado={yo.firmada} onMenos={() => cambiar('mio', -1)} onMas={() => cambiar('mio', 1)} />
        {marcado && (
          <Fila nombre={marcado.nombre} detalle="Tú marcas" valor={suyo[h]} estado={suEstado(h)} otro={marcado.t.hoyos[h].propio}
            bloqueado={marcado.firmada} onMenos={() => cambiar('suyo', -1)} onMas={() => cambiar('suyo', 1)} />
        )}
      </section>

      {sinSenal && nPend > 0 && <div className="aviso">Sin señal: {nPend} {nPend === 1 ? 'golpe guardado' : 'golpes guardados'} en tu teléfono. Se envían solos cuando vuelva.</div>}
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
