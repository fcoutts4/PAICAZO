import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PAICAZO', short_name: 'PAICAZO', start_url: '/', display: 'standalone',
    background_color: '#F6F8F3', theme_color: '#1B4332',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
  }
}
