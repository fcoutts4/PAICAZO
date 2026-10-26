'use client'
// Doble confirmación: primero "¿Seguro?", después escribir la palabra. El servidor vuelve a revisar la palabra.
export default function BotonPeligroso({ accion, texto, aviso, palabra, children }: {
  accion: (form: FormData) => Promise<void>; texto: string; aviso: string; palabra: string; children?: React.ReactNode
}) {
  return (
    <form action={accion} onSubmit={e => {
      const form = e.currentTarget
      if (!confirm(`${aviso}\n\n¿Seguro?`)) return e.preventDefault()
      const escrito = prompt(`Para confirmar, escribe ${palabra}`)
      if (escrito?.trim().toUpperCase() !== palabra) { e.preventDefault(); if (escrito != null) alert('No coincide. No se hizo nada.'); return }
      ;(form.elements.namedItem('confirmacion') as HTMLInputElement).value = palabra
    }}>
      {children}
      <input type="hidden" name="confirmacion" />
      <button className="btn peligro">{texto}</button>
    </form>
  )
}
