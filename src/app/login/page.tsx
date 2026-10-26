import { redirect } from 'next/navigation'
import { jugador, jugadores } from '@/lib/datos'
import { sql } from '@/lib/db'
import { olvidarIntentos, puedeIntentar } from '@/lib/intentos'
import { iniciarSesion, pinValido, usuario } from '@/lib/sesion'

async function entrar(form: FormData) {
  'use server'
  const id = String(form.get('id') ?? ''), pin = String(form.get('pin') ?? '')
  if (jugador(id) && !await puedeIntentar(sql, id)) redirect('/login?e=2') // 5 intentos cada 15 min por jugador
  if (!pinValido(id, pin)) {
    await new Promise(r => setTimeout(r, 1000))
    redirect('/login?e=1')
  }
  await olvidarIntentos(sql, id)
  await iniciarSesion(id)
  redirect('/')
}

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await usuario()) redirect('/')
  const { e } = await searchParams
  const orden = [...await jugadores()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return (
    <main className="login">
      <img src="/logo.png" alt="PAICAZO" />
      {e && <div className="aviso error">{e === '2' ? 'Demasiados intentos. Espera 15 minutos.' : 'Nombre o PIN incorrecto.'}</div>}
      <form action={entrar}>
        <fieldset className="nombres">
          <legend>¿Quién eres?</legend>
          {orden.map(j => (
            <label key={j.id}>
              <input type="radio" name="id" value={j.id} required />
              <span>{j.nombre}</span>
            </label>
          ))}
        </fieldset>
        <label htmlFor="pin">PIN</label>
        <input id="pin" name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" required placeholder="••••" />
        <button className="btn">Entrar</button>
      </form>
    </main>
  )
}
