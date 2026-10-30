import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { agregarJugador, borrarScores, idsUsados, cambiarIndice, cancha, firmadas, golpes, guardarGolpe, guardarGolpesEnLote, guardarGrupos, jugador, jugadores, quitarJugador, renombrar } from '@/lib/datos'
import { sql } from '@/lib/db'
import { armarGrupos, golpesDemo, gruposSolos, hcpJuego, horaSalida, intercambiar, moverAGrupo, limpiarIndice, limpiarNombre, nuevoId, porHandicap, sacarDeGrupo, sePuedeQuitar, sumarAGrupo, tarjeta } from '@/lib/golf'
import { pinDe, requiereUsuario } from '@/lib/sesion'
import canchaJson from '../../../data/cancha.json'
import BotonPeligroso from './BotonPeligroso'

export const dynamic = 'force-dynamic'

async function soloAdmin() {
  const u = await requiereUsuario()
  if (!u.admin) redirect('/')
}

async function corregir(form: FormData) {
  'use server'
  await soloAdmin()
  const id = String(form.get('jugador')), hoyo = Number(form.get('hoyo')), txt = String(form.get('golpes') ?? '')
  const g = txt === '' ? null : Number(txt)
  if (!await jugador(id) || !Number.isInteger(hoyo) || hoyo < 1 || hoyo > 18 || (g != null && (!Number.isInteger(g) || g < 1 || g > 15))) return
  for (const por_marcador of [false, true]) await guardarGolpe({ jugador: id, hoyo, por_marcador, golpes: g })
  revalidatePath('/admin')
}

async function cambiarNombre(form: FormData) {
  'use server'
  await soloAdmin()
  const id = String(form.get('jugador')), nombre = limpiarNombre(String(form.get('nombre') ?? ''))
  if (!await jugador(id) || !nombre) return
  await renombrar(id, nombre)
  revalidatePath('/', 'layout')
}

async function resetear(form: FormData) {
  'use server'
  await soloAdmin()
  if (form.get('confirmacion') !== 'BORRAR') return // segunda confirmación, revisada en el servidor
  await borrarScores()
  revalidatePath('/', 'layout')
}

async function cargarDemo(form: FormData) {
  'use server'
  await soloAdmin()
  if (form.get('confirmacion') !== 'DEMO') return
  // 18 hoyos de todos, anotados por el jugador y su marcador (quedan validados)
  const filas = (await jugadores()).flatMap(j => golpesDemo(j, cancha).flatMap((g, i) =>
    [false, true].map(por_marcador => ({ jugador: j.id, hoyo: i + 1, por_marcador, golpes: g }))))
  await sql('DELETE FROM firmas')
  await guardarGolpesEnLote(filas)
  revalidatePath('/', 'layout')
}

const asignacion = (js: { id: string; grupo: number; marca: string }[]) => js.map(({ id, grupo, marca }) => ({ id, grupo, marca }))

async function moverJugador(form: FormData) {
  'use server'
  await soloAdmin()
  const js = await jugadores(), id = String(form.get('jugador')), destino = Number(form.get('grupo'))
  if (!js.some(j => j.id === id) || !Number.isInteger(destino) || destino < 0) return
  await guardarGrupos(moverAGrupo(asignacion(js), id, destino))
  revalidatePath('/', 'layout')
}

async function intercambiarJugadores(form: FormData) {
  'use server'
  await soloAdmin()
  const js = await jugadores(), a = String(form.get('a')), b = String(form.get('b'))
  if (!js.some(j => j.id === a) || !js.some(j => j.id === b)) return
  await guardarGrupos(intercambiar(asignacion(js), a, b))
  revalidatePath('/', 'layout')
}

async function sortear(form: FormData) {
  'use server'
  await soloAdmin()
  if (form.get('confirmacion') !== 'SORTEAR') return
  await guardarGrupos(armarGrupos((await jugadores()).map(j => j.id), Math.random, form.getAll('tarde').map(String)))
  revalidatePath('/', 'layout')
}

async function agregar(form: FormData) {
  'use server'
  await soloAdmin()
  const nombre = limpiarNombre(String(form.get('nombre') ?? '')), indice = limpiarIndice(String(form.get('indice') ?? ''))
  if (!nombre || indice == null) return
  const js = await jugadores()
  const id = nuevoId(nombre, await idsUsados())
  await agregarJugador(id, nombre, indice)
  await guardarGrupos(sumarAGrupo(js.map(({ id, grupo, marca }) => ({ id, grupo, marca })), id)) // entra al grupo más chico
  revalidatePath('/', 'layout')
}

async function editarIndice(form: FormData) {
  'use server'
  await soloAdmin()
  const id = String(form.get('jugador')), indice = limpiarIndice(String(form.get('indice') ?? ''))
  if (!await jugador(id) || indice == null) return
  await cambiarIndice(id, indice)
  revalidatePath('/', 'layout')
}

async function quitar(form: FormData) {
  'use server'
  await soloAdmin()
  const js = await jugadores(), id = String(form.get('jugador')), j = js.find(x => x.id === id)
  if (form.get('confirmacion') !== 'QUITAR' || !j || !sePuedeQuitar(j)) return
  await guardarGrupos(sacarDeGrupo(js.map(({ id, grupo, marca }) => ({ id, grupo, marca })), id))
  await quitarJugador(id)
  revalidatePath('/', 'layout')
}

async function destrabar(form: FormData) {
  'use server'
  await soloAdmin()
  await sql('DELETE FROM firmas WHERE jugador = $1', [String(form.get('jugador'))])
  revalidatePath('/admin')
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  await soloAdmin()
  const { v } = await searchParams
  const vista = v === 'tarjetas' ? 'tarjetas' : 'jugadores'
  const [js, filas, firmas] = await Promise.all([jugadores(), golpes(), firmadas()])
  const nombre = (id: string) => js.find(j => j.id === id)?.nombre
  const orden = porHandicap(js)
  const numeros = [...new Set(js.map(j => j.grupo))].sort((a, b) => a - b)
  const solos = gruposSolos(js)
  return (
    <main>
      <h1>Admin</h1>
      <nav className="tabs">
        <Link href="/admin?v=jugadores" aria-current={vista === 'jugadores' ? 'page' : undefined}>Jugadores</Link>
        <Link href="/admin?v=tarjetas" aria-current={vista === 'tarjetas' ? 'page' : undefined}>Tarjetas</Link>
      </nav>

      {vista === 'tarjetas' && (() => {
        const ts = orden.map(j => ({ j, t: tarjeta(j, filas, cancha) }))
        const cuenta = (t: (typeof ts)[number]['t'], e: string) => t.hoyos.filter(h => h.estado === e).length
        const conflictos = ts.flatMap(({ j, t }) => t.hoyos.filter(h => h.estado === 'conflicto').map(h => ({ j, h })))
        return (
          <>
            <p className="nota">Hoyos de cada tarjeta: <b>ok</b> = jugador y marcador anotaron lo mismo, <b>mal</b> = anotaron distinto, <b>falta</b> = anotó solo uno.</p>
            <table className="admin-tabla">
              <thead><tr><th className="num">#</th><th>Jugador</th><th className="num centro">Ok</th><th className="num centro">Mal</th><th className="num centro">Falta</th><th>Tarjeta</th></tr></thead>
              <tbody>
                {ts.map(({ j, t }, i) => (
                  <tr key={j.id}>
                    <td className="num">{i + 1}</td><td>{j.nombre}</td>
                    <td className="num centro">{cuenta(t, 'ok')}</td>
                    <td className="num centro" style={{ color: cuenta(t, 'conflicto') ? 'var(--rojo)' : undefined, fontWeight: cuenta(t, 'conflicto') ? 700 : undefined }}>{cuenta(t, 'conflicto')}</td>
                    <td className="num centro">{cuenta(t, 'pendiente')}</td>
                    <td>{firmas.has(j.id)
                      ? <form action={destrabar}><input type="hidden" name="jugador" value={j.id} /><button className="btn chico">Destrabar</button></form>
                      : <span className="nota">sin firmar</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2>Hoyos en conflicto</h2>
            {conflictos.length
              ? <ul className="conflictos tarjeta-ui">{conflictos.map(({ j, h }) => (
                  <li key={`${j.id}-${h.hoyo}`}><b>{j.nombre}</b> · hoyo {h.hoyo}: anotó <b>{h.propio}</b>, su marcador <b>{h.marcador}</b></li>
                ))}</ul>
              : <p className="nota">No hay hoyos en conflicto.</p>}

            <h2>Corregir un hoyo</h2>
            <p className="nota">Guarda el mismo valor como jugador y como marcador (queda validado). Vacío = borrar.</p>
            <form action={corregir} className="admin-form tarjeta-ui">
              <select name="jugador" required>{orden.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}</select>
              <select name="hoyo">{cancha.par.map((_, i) => <option key={i} value={i + 1}>Hoyo {i + 1}</option>)}</select>
              <input name="golpes" type="number" min={1} max={15} placeholder="Golpes" style={{ width: 90 }} />
              <button className="btn chico">Guardar</button>
            </form>
          </>
        )
      })()}

      {vista === 'jugadores' && (<>
      <h2>Jugadores y PIN</h2>
      <p className="nota">Manda a cada uno su PIN por interno. Cambiar PAICAZO_SECRET cambia todos los PIN.</p>
      <div className="tabla-scroll">
        <table className="admin-tabla">
          <thead><tr><th className="num">#</th><th>Jugador</th><th className="num">Índ</th><th className="num">HCP</th><th className="num centro">PIN</th><th className="num centro">Grupo</th><th>Marca</th></tr></thead>
          <tbody>
            {orden.map((j, i) => (
              <tr key={j.id}>
                <td className="num">{i + 1}</td><td>{j.nombre}</td><td className="num">{j.indice}</td><td className="num">{hcpJuego(j.indice, cancha)}</td>
                <td className="num centro"><code>{pinDe(j.id)}</code></td><td className="num centro">{j.grupo}</td><td>{nombre(j.marca)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Armar grupos a mano</h2>
      {solos.length > 0 && (
        <p className="aviso error">
          {solos.map(g => `Grupo ${g}`).join(', ')} {solos.length === 1 ? 'tiene' : 'tienen'} un solo jugador: nadie lo marca y no podrá firmar. Mueve a alguien ahí o muévelo a otro grupo.
        </p>
      )}
      <p className="nota">Los grupos pueden ser de cualquier tamaño (de 2, 3, 4…). Al mover o intercambiar, quién marca a quién se rearma solo dentro de cada grupo. Míralo en la pestaña Grupos.</p>
      <form action={moverJugador} className="admin-form tarjeta-ui">
        <select name="jugador" required>{orden.map(j => <option key={j.id} value={j.id}>{j.nombre} (G{j.grupo})</option>)}</select>
        <select name="grupo" required>
          {numeros.map(g => <option key={g} value={g}>Grupo {g} · {horaSalida(g, canchaJson.salidas.primera, canchaJson.salidas.cada_min)} ({js.filter(j => j.grupo === g).length})</option>)}
          <option value={0}>Grupo nuevo</option>
        </select>
        <button className="btn chico">Mover</button>
      </form>
      <form action={intercambiarJugadores} className="admin-form tarjeta-ui">
        <select name="a" required>{orden.map(j => <option key={j.id} value={j.id}>{j.nombre} (G{j.grupo})</option>)}</select>
        <span className="nota" style={{ margin: 0, alignSelf: 'center' }}>⇄</span>
        <select name="b" required defaultValue={orden[1]?.id}>{orden.map(j => <option key={j.id} value={j.id}>{j.nombre} (G{j.grupo})</option>)}</select>
        <button className="btn chico">Intercambiar</button>
      </form>

      <h2>Agregar jugador</h2>
      <p className="nota">Entra al grupo más chico (un grupo de 3 pasa a 4) y a su cadena de marcadores; o sortea grupos de nuevo. Su PIN aparece arriba en la tabla.</p>
      <form action={agregar} className="admin-form tarjeta-ui">
        <input name="nombre" required maxLength={24} placeholder="Nombre" style={{ flex: 1, minWidth: 140 }} />
        <input name="indice" required inputMode="decimal" pattern="[0-9]{1,2}([.,][0-9])?" placeholder="Índice" style={{ width: 80 }} />
        <button className="btn chico">Agregar</button>
      </form>

      <h2>Cambiar índice</h2>
      <form action={editarIndice} className="admin-form tarjeta-ui">
        <select name="jugador" required>{orden.map(j => <option key={j.id} value={j.id}>{j.nombre} ({j.indice})</option>)}</select>
        <input name="indice" required inputMode="decimal" pattern="[0-9]{1,2}([.,][0-9])?" placeholder="Índice" style={{ width: 80 }} />
        <button className="btn chico">Guardar</button>
      </form>

      <h2>Cambiar nombre</h2>
      <p className="nota">Es el nombre que se ve en el ingreso, la tarjeta y el ranking. El PIN no cambia.</p>
      <form action={cambiarNombre} className="admin-form tarjeta-ui">
        <select name="jugador" required>{orden.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}</select>
        <input name="nombre" required maxLength={24} placeholder="Nuevo nombre" style={{ flex: 1, minWidth: 140 }} />
        <button className="btn chico">Guardar</button>
      </form>

      <h2>Zona de peligro</h2>
      <div className="peligro-zona">
        <div>
          <b>Armar grupos al azar</b>
          <p className="nota">Grupos de 3 y 4 sorteados, nunca de 2; primero salen los de 3 (con 14: 3, 3, 4, 4). Cada uno marca al siguiente de su grupo. Cambia quién marca a quién: mejor hacerlo antes de jugar.</p>
          <BotonPeligroso accion={sortear} texto="Sortear grupos" palabra="SORTEAR"
            aviso="Se van a sortear grupos nuevos y cambiar los marcadores de todos.">
            <fieldset className="tarde">
              <legend>Llegan tarde: van juntos en el último grupo, que es de 4 (si son menos, se completa con otros al azar). Los grupos de 3 salen primero.</legend>
              {orden.map(j => <label key={j.id}><input type="checkbox" name="tarde" value={j.id} /> {j.nombre}</label>)}
            </fieldset>
          </BotonPeligroso>
        </div>
        <div>
          <b>Cargar demo</b>
          <p className="nota">Rellena los 18 hoyos de todos con scores de mentira (según el hándicap de cada uno) para mostrar cómo se ve la app. Reemplaza lo que haya.</p>
          <BotonPeligroso accion={cargarDemo} texto="Cargar demo" palabra="DEMO"
            aviso="Se van a reemplazar los golpes de TODOS por scores de demo." />
        </div>
        <div>
          <b>Quitar un jugador</b>
          <p className="nota">Lo borra con sus golpes y lo saca del ingreso y de la tabla; quien lo marcaba pasa a marcar al siguiente.</p>
          <BotonPeligroso accion={quitar} texto="Quitar jugador" palabra="QUITAR" aviso="Se va a borrar ese jugador con todos sus golpes.">
            <select name="jugador" required defaultValue="">
              <option value="" disabled>Elige a quién quitar</option>
              {js.filter(sePuedeQuitar).map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </BotonPeligroso>
        </div>
        <div>
          <b>Borrar todos los scores</b>
          <p className="nota">Borra los golpes y las firmas de todos los jugadores. No se puede deshacer.</p>
          <BotonPeligroso accion={resetear} texto="Borrar scores" palabra="BORRAR"
            aviso="Se van a borrar TODOS los golpes y firmas del campeonato." />
        </div>
      </div>
      </>)}
    </main>
  )
}
