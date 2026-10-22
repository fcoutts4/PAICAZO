'use client'
// Salir pide confirmación: está arriba y es fácil tocarlo sin querer.
export default function BotonSalir({ salir }: { salir: () => Promise<void> }) {
  return (
    <form action={salir} style={{ marginLeft: 'auto' }}
      onSubmit={e => { if (!confirm('¿Salir de PAICAZO? Para volver vas a necesitar tu PIN.')) e.preventDefault() }}>
      <button className="salir">Salir</button>
    </form>
  )
}
