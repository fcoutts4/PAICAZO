// Íconos de línea en SVG (no emojis: se ven iguales en todos los teléfonos).
const TRAZOS = {
  tarjeta: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  ranking: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />,
  cancha: <><path d="M6 21V3M6 4h11l-3 4 3 4H6" /><ellipse cx="12" cy="21" rx="8" ry="1.5" /></>,
  admin: <><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>,
  reglas: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4M12 17h.01" /></>,
  ok: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  mal: <path d="M6 6l12 12M18 6L6 18" />,
  espera: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  antes: <path d="M15 5l-7 7 7 7" />,
  despues: <path d="M9 5l7 7-7 7" />,
}

export type NombreIcono = keyof typeof TRAZOS

export default function Icono({ n, size = 22 }: { n: NombreIcono; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{TRAZOS[n]}</svg>
  )
}
