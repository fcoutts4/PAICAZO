# PAICAZO

App del campeonato de golf PAICAZO (Paico Alto, 9 hoyos × 2, Stableford neto). Pensada para teléfono.

- **Tarjeta**: anotas tus golpes y los de quien marcas; cada hoyo se valida cuando ambos coinciden.
- **Ranking en vivo**: Stableford neto (95%), gross, skins netos y copa por grupos.
- **Cancha**: tabla de par/yardas/HCP y mapa por hoyo.
- **Admin** (F. Coutts): PIN de cada jugador, corregir hoyos, destrabar tarjetas firmadas.

## Local

```bash
npm install
npm run dev
```

Necesita `.env.local` con `PAICAZO_SECRET` (ver `.env.example`). Sin `DATABASE_URL` usa PGlite en `node_modules/.cache`.

```bash
npm test
```

Prueba de punta a punta (con `npm run dev` corriendo): grupos, anotación cruzada, permisos, firma y puntos de Copa, Rey, Puto y General. **Borra los scores y sortea grupos en la base local**; solo apunta a localhost.

```bash
npm run e2e
```

Los mapas se regeneran con `npm run mapa` (escribe `public/mapa-9-hoyos.svg` y `public/hoyo-1..9.svg`).

## Publicar en Vercel

1. Subir el repo a GitHub e importarlo en Vercel.
2. En Vercel → Storage → agregar **Neon** (Postgres, plan gratis): crea `DATABASE_URL`.
3. Agregar la variable `PAICAZO_SECRET` (24+ caracteres al azar). Cambiarla cambia todos los PIN.
4. Deploy. Las tablas se crean solas en el primer uso.
5. Entrar como F. Coutts → Admin → repartir los PIN.

## Datos

- `data/jugadores.json`: lista inicial (nombre, índice, grupo y a quién marca cada uno). Desde **Admin** se agregan jugadores (entran al grupo más chico), se cambia nombre o índice y se quita a cualquiera menos al admin (su id y su PIN no se reutilizan). Para un ausente o retirado es mejor "No juega".
- `data/cancha.json`: par, yardas, HCP por hoyo, slope y rating (**HCP, slope y rating son provisorios**).
