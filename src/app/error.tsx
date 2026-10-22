'use client'
// Falla de servidor o de red al cargar una pantalla: mensaje claro y reintento.
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="estado-pagina">
      <p><b>No se pudo cargar.</b><br />Puede ser la señal. Lo que anotaste en la tarjeta queda guardado en tu teléfono.</p>
      <button className="btn" onClick={reset}>Reintentar</button>
    </main>
  )
}
