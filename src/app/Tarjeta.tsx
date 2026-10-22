'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { estadoHoyo, puntosStableford, type Tarjeta as T } from '@/lib/golf'

type Props = {
  cancha: { par: number[]; hcp: number[]; yardas: number[] }
  yo: { nombre: string; t: T; firmada: boolean; marcador: string }
  marcado: { id: string; nombre: string; t: T; firmada: boolean } | null
}
type Valores = (number | null)[]

const TEXTO_ESTADO = {
  ok: '✔ Validado con tu marcador',
  conflicto: '✖ No coincide: conversen y corrijan',
  pendiente: '… Falta que anote el otro',
  vacio: 'Sin anotar',
}

export default function Tarjeta({ cancha, yo, marcado }: Props) {
  const router = useRouter()
  const mios = yo.t.hoyos.map(h => h.propio)
  const suyos = marcado?.t.hoyos.map(h => h.marcador) ?? []
  const [mio, setMio] = useState<Valores>(mios)
  const [suyo, setSuyo] = useState<Valores>(suyos)
  const [h, setH] = useState(() => Math.max(0, mios.findIndex(v => v == null)))
  const [error, setError] = useState('')
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // lo que llega del servidor (refresco) manda sobre lo local
  useEffect(() => setMio(mios), [JSON.stringify(mios)]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setSuyo(suyos), [JSON.stringify(suyos)]) // eslint-disable-line react-hooks/exhaustive-deps
  // trae lo que anotó el otro cada 15 s
  useEffect(() => { const i = setInterval(() => router.refresh(), 15000); return () => clearInterval(i) }, [router])

  function guardar(jugador: string, porMarcador: boolean, hoyo: number, golpes: number | null) {
    const k = `${jugador}-${porMarcador}-${hoyo}`
    clearTimeout(timers.current[k])
    timers.current[k] = setTimeout(async () => {
      const r = await fetch('/api/golpes', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jugador, hoyo, por_marcador: porMarcador, golpes }),
      }).catch(() => null)
      setError(r?.ok ? '' : 'No se pudo guardar. Revisa la señal y vuelve a intentar.')
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

  const hy = yo.t.hoyos[h]
  const estadoMio = estadoHoyo(mio[h], hy.marcador)
  const estadoSuyo = marcado ? estadoHoyo(marcado.t.hoyos[h].propio, suyo[h]) : 'vacio'
  const ptsMio = (i: number) => puntosStableford(mio[i] ?? yo.t.hoyos[i].marcador, cancha.par[i], yo.t.hoyos[i].recibidos)
  const total = mio.reduce<number>((a, _, i) => a + (ptsMio(i) ?? 0), 0)
  const jugados = mio.filter((v, i) => (v ?? yo.t.hoyos[i].marcador) != null)
  const gross = mio.reduce<number>((a, v, i) => a + (v ?? yo.t.hoyos[i].marcador ?? 0), 0)
  const vsPar = gross - cancha.par.reduce((a, p, i) => a + ((mio[i] ?? yo.t.hoyos[i].marcador) != null ? p : 0), 0)
  const listoFirmar = !yo.firmada && yo.t.hoyos.every(x => x.estado === 'ok')
  const recibe = hy.recibidos > 0 ? `+${hy.recibidos}` : hy.recibidos < 0 ? '−1' : '0'

  return (
    <>
      <div className="resumen">
        <div><b>{total}</b><small>Puntos</small></div>
        <div><b>{jugados.length}</b><small>Hoyos</small></div>
        <div><b>{vsPar > 0 ? `+${vsPar}` : vsPar || 'E'}</b><small>vs par</small></div>
        <div><b>{yo.t.hj}</b><small>HCP juego</small></div>
      </div>

      {(['Ida', 'Vuelta'] as const).map((nombre, v) => (
        <div key={nombre}>
          <h2 style={{ margin: '6px 0' }}>{nombre}</h2>
          <div className="hoyos">
            {cancha.par.slice(v * 9, v * 9 + 9).map((_, k) => {
              const i = v * 9 + k
              const est = estadoHoyo(mio[i], yo.t.hoyos[i].marcador)
              return (
                <button key={i} aria-pressed={i === h} className={est} onClick={() => setH(i)}>
                  {i + 1}<small>{mio[i] ?? ''}</small>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <section className="hoyo-info">
        <img key={h} src={`/hoyo-${(h % 9) + 1}.svg`} alt={`Mapa del hoyo ${h + 1}`} />
        <div className="n">{h + 1}{h >= 9 && <small>= hoyo {h - 8}</small>}</div>
        <div className="hoyo-datos">
          <div><b>{cancha.par[h]}</b>Par</div>
          <div><b>{cancha.yardas[h]}</b>Yardas</div>
          <div><b>{cancha.hcp[h]}</b>HCP</div>
          <div><b>{recibe}</b>Recibes</div>
          <div><b><span className="pts">{ptsMio(h) ?? '–'}</span></b>Puntos</div>
        </div>
      </section>

      {error && <div className="aviso error">{error}</div>}

      <section className="tarjeta-ui anotar">
        <div className="contador">
          <div className="quien">Tus golpes<small>Tu marcador: {yo.marcador}{hy.marcador != null ? ` · anotó ${hy.marcador}` : ''}</small></div>
          <Paso valor={mio[h]} bloqueado={yo.firmada} onMenos={() => cambiar('mio', -1)} onMas={() => cambiar('mio', 1)} />
        </div>
        <div className={`estado ${estadoMio}`}>{TEXTO_ESTADO[estadoMio]}</div>

        {marcado && (
          <>
            <hr style={{ border: 0, borderTop: '1px solid var(--linea)', width: '100%' }} />
            <div className="contador">
              <div className="quien">Golpes de {marcado.nombre}<small>Tú marcas esta tarjeta{marcado.t.hoyos[h].propio != null ? ` · ${marcado.nombre} anotó ${marcado.t.hoyos[h].propio}` : ''}</small></div>
              <Paso valor={suyo[h]} bloqueado={marcado.firmada} onMenos={() => cambiar('suyo', -1)} onMas={() => cambiar('suyo', 1)} />
            </div>
            <div className={`estado ${estadoSuyo}`}>{TEXTO_ESTADO[estadoSuyo].replace('tu marcador', marcado.nombre)}</div>
          </>
        )}
        {h < 17 && <button className="btn lima" onClick={() => setH(h + 1)}>Siguiente hoyo →</button>}
      </section>

      {yo.firmada
        ? <div className="aviso" style={{ background: 'var(--lima-suave)', borderColor: 'var(--lima)', color: 'var(--verde)' }}>✔ Tarjeta firmada. Si hay que corregir algo, pídeselo al admin.</div>
        : <button className="btn" style={{ width: '100%' }} disabled={!listoFirmar} onClick={firmar}>
            {listoFirmar ? 'Firmar mi tarjeta' : 'Firmar (cuando los 18 hoyos estén validados)'}
          </button>}
    </>
  )
}

function Paso({ valor, bloqueado, onMenos, onMas }: { valor: number | null; bloqueado: boolean; onMenos: () => void; onMas: () => void }) {
  return (
    <div className="paso">
      <button aria-label="Restar golpe" disabled={bloqueado} onClick={onMenos}>−</button>
      <output>{valor ?? '–'}</output>
      <button aria-label="Sumar golpe" disabled={bloqueado} onClick={onMas}>+</button>
    </div>
  )
}
