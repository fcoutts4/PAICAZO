import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { usuario, cerrarSesion } from '@/lib/sesion'
import { redirect } from 'next/navigation'
import Menu from './Menu'
import BotonSalir from './BotonSalir'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--fuente' })

export const metadata: Metadata = {
  title: 'PAICAZO',
  description: 'Campeonato de golf PAICAZO · Paico Alto',
  appleWebApp: { capable: true, title: 'PAICAZO', statusBarStyle: 'black-translucent' },
}
// viewportFit cover: en iPhone (app en pantalla de inicio) el contenido respeta la barra de estado con safe-area
export const viewport: Viewport = { themeColor: '#F4F6F2', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

async function salir() {
  'use server'
  await cerrarSesion()
  redirect('/login')
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const u = await usuario()
  return (
    <html lang="es-CL" className={inter.variable}>
      <body>
        {u && (
          <header className="cabecera">
            <img src="/logo.png" alt="" />
            <div><b>PAICAZO</b><small>{u.nombre}</small></div>
            <BotonSalir salir={salir} />
          </header>
        )}
        {children}
        {u && <Menu admin={!!u.admin} />}
      </body>
    </html>
  )
}
