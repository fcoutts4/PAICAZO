# Estado de sesión — 2026-10-22

Rama: `sesion/2026-10-22-app` (sale de `sesion/2026-10-22-plan`). Sin remoto.

## Hecho
- Plan y modalidad: `entregables/docs/PLAN.md`.
- Cancha: par 70 (hoyos 1-9 × 2), yardas azules del plano. Par confirmado por el usuario con la tarjeta física (hoyo 3 par 3, hoyo 6 par 4; la app de golf del usuario los muestra al revés y se descartó). HCP oficial por hoyo (app del usuario): ida impares, vuelta pares. Slope 113 y rating 70 **provisorios**.
- Mapa propio generado desde el plano (`scripts/mapa.py`): cancha completa + 9 vistas giradas (tee abajo), etiquetas "1-10"… sin superposición.
- App Next.js 16: login nombre + PIN (derivado de `PAICAZO_SECRET`), tarjeta con validación cruzada jugador/marcador, firma, ranking (Stableford 95%, gross, skins netos con arrastre, copa por grupos), cancha, admin.
- Grupos (snake por índice): G1 PM/JPO/A. Ochagavía · G2 M. Covarrubias/JP Undu/A. Guzman/VC · G3 F. Coutts/M. Undu/MG/IU. Cada uno marca al siguiente de su grupo.

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
