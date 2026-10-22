import Link from 'next/link'

export default function NoExiste() {
  return (
    <main className="estado-pagina">
      <p><b>Esta página no existe.</b></p>
      <Link className="btn" href="/">Ir a mi tarjeta</Link>
    </main>
  )
}
