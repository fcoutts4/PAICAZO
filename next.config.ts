import type { NextConfig } from 'next'

// PGlite solo se usa en local (sin DATABASE_URL); no se empaqueta.
const config: NextConfig = { serverExternalPackages: ['@electric-sql/pglite'] }
export default config
