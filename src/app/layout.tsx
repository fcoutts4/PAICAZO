import type { Metadata, Viewport } from 'next'
import { usuario, cerrarSesion } from '@/lib/sesion'
import { redirect } from 'next/navigation'
import Menu from './Menu'
import './globals.css'

export const metadata: Metadata = {
  title: 'PAICAZO',
  description: 'Campeonato de golf PAICAZO · Paico Alto',
  appleWebApp: { capable: true, title: 'PAICAZO', statusBarStyle: 'black-translucent' },
}
// viewportFit cover: en iPhone (app en pantalla de inicio) el contenido respeta la barra de estado con safe-area
export const viewport: Viewport = { themeColor: '#1B4332', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

async function salir() {
  'use server'
  await cerrarSesion()
  redirect('/login')
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const u = await usuario()
  return (
    <html lang="es-CL">
      <body>
        {u && (
          <header className="cabecera">
            <img src="/logo.png" alt="" />
            <div><b>PAICAZO</b><small>{u.nombre}</small></div>
            <form action={salir} style={{ marginLeft: 'auto' }}><button className="salir">Salir</button></form>
          </header>
        )}
        {children}
        {u && <Menu admin={!!u.admin} />}
      </body>
    </html>
  )
}
