# Estado de sesión — 2026-10-22

Rama: `sesion/2026-10-22-app` (sale de `sesion/2026-10-22-plan`). Sin remoto.

## Hecho
- Plan y modalidad: `entregables/docs/PLAN.md`.
- Cancha: par 70 (hoyos 1-9 × 2), yardas azules del plano. Par confirmado por el usuario con la tarjeta física (hoyo 3 par 3, hoyo 6 par 4; la app de golf del usuario los muestra al revés y se descartó). HCP oficial por hoyo (app del usuario): ida impares, vuelta pares. Slope 113 y rating 70 **provisorios**.
- Mapa propio generado desde el plano (`scripts/mapa.py`): cancha completa + 9 vistas giradas (tee abajo), etiquetas "1-10"… sin superposición.
- App Next.js 16: login nombre + PIN (derivado de `PAICAZO_SECRET`), tarjeta con validación cruzada jugador/marcador, firma, ranking (Stableford 95%, gross, skins netos con arrastre, copa por grupos), cancha, admin.
- Grupos de 3 (intercalados por índice): G1 PM/A. Guzman/MG · G2 M. Covarrubias/A. Ochagavía/IU · G3 F. Coutts/JPO/VC · G4 M. Undu/JP Undu. Cada uno marca al siguiente de su grupo.
- Juegos: Stableford neto 95% (copa), Skins gross (1 pto/hoyo, empates repartidos), Grupo neto (1 pto/hoyo dentro del grupo).

## Pruebas
`npm test`: 49 pruebas del motor de cálculo (node --test) + 7 del mapa (python), en verde. `tsc` sin errores.
Verificado en navegador local (375 px): login, anotar, conflicto marcador ≠ jugador, 403 al anotar a quien no marcas, admin bloqueado para no-admin.

## Decisiones
- Cálculo en TypeScript puro (`src/lib/golf.ts`), no en SQL: 12 jugadores × 18 hoyos, se prueba sin base.
- Jugadores y cancha en JSON del repo (no en BD): cambian poco; se edita y se redeploya.
- En la API el admin juega como jugador (si no, validaría su propia tarjeta); corrige solo vía /admin.
- Descartado: `<view>` del SVG para zoom por hoyo (no rota; hoyos diagonales quedaban chicos).

## Pendiente
- Slope y rating de la salida azul.
- Jugador 12.
- Approach / long drive: no implementados (se anotan a mano).
- Preview deploys sin `PAICAZO_SECRET` (solo está en Production): fallan al abrir, no importa.

## Publicado
- https://paicazo.vercel.app (repo privado github.com/fcoutts4/PAICAZO, rama `main`).
- Base Neon `paicazo-db` (Free, iad1) → `DATABASE_URL`. `PAICAZO_SECRET` en Production; copia local en `.env.produccion.local` (ignorado).
- Verificado sin sesión: /login 200; /, /ranking, /admin, /cancha → 307 a /login; API 401 sin sesión o con cookie falsa.

## Siguiente paso
Entrar como F. Coutts en producción y repartir los PIN desde Admin.

## Actualización 2026-10-26 (revisión + mejoras)
- Puto escalado por tamaño de grupo / 3 (en grupos de 2 valía 9 de promedio contra 6). En la demo el bonus le daba vuelta el General a quien tenía la mejor Copa.
- Marca "no juega" en Admin (tabla `no_juega`): el jugador sigue en la Copa y sale de Rey del Hoyo y Puto, así no bloquea hoyos. Si en un grupo queda uno solo, recibe 18 × ⅓ = 6 (el promedio).
- La tarjeta reintenta los golpes con 401/408/429/5xx (`src/lib/envio.ts`); solo descarta con 400/403/415.
- Login: 5 intentos por jugador cada 15 min (tabla `intentos`, un solo UPSERT atómico). El admin también puede quedar bloqueado 15 min.
- Firmar pide confirmación. KPI de la tarjeta: Neto (puntos − 2 × hoyos) y "±Par" en vez de "Gross". El General muestra los hoyos jugados.
- Pruebas: 122 en verde (node --test + PGlite en memoria para `intentos`), tsc limpio. En el navegador se verificaron el General, el Puto, la marca no juega y el bloqueo al 6º intento. No se probaron en vivo el reintento ante 5xx ni el confirm de la firma.
- Las tablas nuevas se crean solas al partir el proceso. En `next dev` hay que reiniciar el servidor, porque la conexión queda en caché.

### Siguiente paso
Revisar en el preview de Vercel de esta rama y mergear a `main` para publicar.
