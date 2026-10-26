# Estado de sesión — 2026-10-26 (tarjeta oficial)

- Llegó la tarjeta oficial 2025 (`assets/tarjeta-paico-alto-2025.pdf`). `data/cancha.json` ahora la sigue: par 4 4 4 5 3 4 4 3 4 (×2, total 70); yardas azules distintas en ida (3242) y vuelta (3212); HCP Ventaja Var con la ida en pares y la vuelta en impares (el 9 es HCP 2 y el 18 es HCP 1).
- Los datos anteriores salían de `assets/plano-paico-alto.jpg`, que es el **Master Plan** de 18 hoyos y no la cancha construida: tenía otro par, otras yardas y otra numeración. Esto deja sin efecto la nota del 2026-10-22 sobre "hoyo 3 par 3".
- `src/lib/cancha.test.ts` fija los datos de la tarjeta. Suite: 130 en verde, tsc limpio.
- Mapa retrazado sobre el mapa de la tarjeta (`scripts/mapa.py`, función `_t`: píxeles de la pág. 1 a 400 dpi → SVG). Ruta 1→9 verificada (cada green junto al tee del siguiente). El mapa del club es esquemático: el largo de los hoyos calza ±15% con las yardas. En la tarjeta, los hoyos 10-18 en gris son la ampliación futura, no se juegan. Nueva prueba: el par y las yardas del mapa = `cancha.json`.
- Slope y rating siguen provisorios (113 / 70): la tarjeta no los trae y no se encontraron publicados.
- Se usó Ventaja Var (varones); Ventaja Damas no se usa.

## Siguiente paso
Mergear `sesion/2026-10-22-app` a `main` para publicar.

## Deploy
- Si `main` avanza por fast-forward a un commit que ya se desplegó como preview (porque antes se subió la rama), Vercel no crea el deploy de producción. Pasó con `54ec65a`, que tuvo un solo deploy (el preview). Para publicar: subir `main` antes que la rama, o hacer un commit nuevo en `main`.
