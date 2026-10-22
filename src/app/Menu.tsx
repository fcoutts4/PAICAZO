'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Menu({ admin }: { admin: boolean }) {
  const ruta = usePathname()
  const items: [string, string, string][] = [['/', '📝', 'Tarjeta'], ['/ranking', '🏆', 'Ranking'], ['/cancha', '⛳', 'Cancha']]
  if (admin) items.push(['/admin', '⚙️', 'Admin'])
  return (
    <nav className="menu">
      {items.map(([href, icono, texto]) => (
        <Link key={href} href={href} aria-current={ruta === href ? 'page' : undefined}><span>{icono}</span>{texto}</Link>
      ))}
    </nav>
  )
}
