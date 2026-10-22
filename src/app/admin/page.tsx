import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { cancha, firmadas, golpes, guardarGolpe, jugador, jugadores, renombrar } from '@/lib/datos'
import { sql } from '@/lib/db'
import { limpiarNombre, tarjeta } from '@/lib/golf'
import { pinDe, requiereUsuario } from '@/lib/sesion'

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
  if (!jugador(id) || !Number.isInteger(hoyo) || hoyo < 1 || hoyo > 18 || (g != null && (!Number.isInteger(g) || g < 1 || g > 15))) return
  for (const por_marcador of [false, true]) await guardarGolpe({ jugador: id, hoyo, por_marcador, golpes: g })
  revalidatePath('/admin')
}

async function cambiarNombre(form: FormData) {
  'use server'
  await soloAdmin()
  const id = String(form.get('jugador')), nombre = limpiarNombre(String(form.get('nombre') ?? ''))
  if (!jugador(id) || !nombre) return
  await renombrar(id, nombre)
  revalidatePath('/', 'layout')
}

async function destrabar(form: FormData) {
  'use server'
  await soloAdmin()
  await sql('DELETE FROM firmas WHERE jugador = $1', [String(form.get('jugador'))])
  revalidatePath('/admin')
}

export default async function Admin() {
  await soloAdmin()
  const [js, filas, firmas] = await Promise.all([jugadores(), golpes(), firmadas()])
  const nombre = (id: string) => js.find(j => j.id === id)?.nombre
  return (
    <main>
      <h1>Admin</h1>
      <h2>Jugadores y PIN</h2>
      <p className="nota">Manda a cada uno su PIN por interno. Cambiar PAICAZO_SECRET cambia todos los PIN.</p>
      <div>
        <table className="admin-tabla">
          <thead><tr><th>Jugador</th><th className="num">Índ</th><th className="num">HCP</th><th>PIN</th><th>G</th><th>Marca</th><th>Ok/mal/falta</th><th /></tr></thead>
          <tbody>
            {js.map(j => {
              const t = tarjeta(j, filas, cancha)
              const n = (e: string) => t.hoyos.filter(h => h.estado === e).length
              return (
                <tr key={j.id}>
                  <td>{j.nombre}</td><td className="num">{j.indice}</td><td className="num">{t.hj}</td>
                  <td><code>{pinDe(j.id)}</code></td><td>{j.grupo}</td><td>{nombre(j.marca)}</td>
                  <td>{n('ok')} / <span style={{ color: n('conflicto') ? 'var(--rojo)' : undefined }}>{n('conflicto')}</span> / {n('pendiente')}</td>
                  <td>{firmas.has(j.id) && (
                    <form action={destrabar}><input type="hidden" name="jugador" value={j.id} /><button className="btn chico">Destrabar</button></form>
                  )}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2>Cambiar nombre</h2>
      <p className="nota">Es el nombre que se ve en el ingreso, la tarjeta y el ranking. El PIN no cambia.</p>
      <form action={cambiarNombre} className="admin-form tarjeta-ui">
        <select name="jugador" required>{js.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}</select>
        <input name="nombre" required maxLength={24} placeholder="Nuevo nombre" style={{ flex: 1, minWidth: 140 }} />
        <button className="btn chico">Guardar</button>
      </form>

      <h2>Corregir un hoyo</h2>
      <p className="nota">Guarda el mismo valor como jugador y como marcador (queda validado). Vacío = borrar.</p>
      <form action={corregir} className="admin-form tarjeta-ui">
        <select name="jugador" required>{js.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}</select>
        <select name="hoyo">{cancha.par.map((_, i) => <option key={i} value={i + 1}>Hoyo {i + 1}</option>)}</select>
        <input name="golpes" type="number" min={1} max={15} placeholder="Golpes" style={{ width: 90 }} />
        <button className="btn chico">Guardar</button>
      </form>
    </main>
  )
}
