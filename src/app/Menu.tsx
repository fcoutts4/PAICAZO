'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icono, { type NombreIcono } from './Icono'

export default function Menu({ admin }: { admin: boolean }) {
  const ruta = usePathname()
  const items: [string, NombreIcono, string][] = [['/', 'tarjeta', 'Tarjeta'], ['/ranking', 'ranking', 'Ranking'], ['/cancha', 'cancha', 'Cancha'], ['/reglas', 'reglas', 'Reglas']]
  if (admin) items.push(['/admin', 'admin', 'Admin'])
  return (
    <nav className="menu">
      {items.map(([href, icono, texto]) => (
        <Link key={href} href={href} aria-current={ruta === href ? 'page' : undefined}><Icono n={icono} />{texto}</Link>
      ))}
    </nav>
  )
}
