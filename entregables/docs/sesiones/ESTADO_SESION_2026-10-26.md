# Estado de sesión — 2026-10-26 (tarjeta oficial)

- Llegó la tarjeta oficial 2025 (`assets/tarjeta-paico-alto-2025.pdf`). `data/cancha.json` ahora la sigue: par 4 4 4 5 3 4 4 3 4 (×2, total 70); yardas azules distintas en ida (3242) y vuelta (3212); HCP Ventaja Var con la ida en pares y la vuelta en impares (el 9 es HCP 2 y el 18 es HCP 1).
- Los datos anteriores salían de `assets/plano-paico-alto.jpg`, que es el **Master Plan** de 18 hoyos y no la cancha construida: tenía otro par, otras yardas y otra numeración. Esto deja sin efecto la nota del 2026-10-22 sobre "hoyo 3 par 3".
- `src/lib/cancha.test.ts` fija los datos de la tarjeta. Suite: 130 en verde, tsc limpio.
- **Pendiente:** el mapa (`public/mapa-9-hoyos.svg` y `hoyo-1..9.svg`, generados por `scripts/mapa.py`) sigue dibujando el Master Plan, con otra numeración. Hay que reemplazarlo por el mapa de la tarjeta.
- Slope y rating siguen provisorios (113 / 70): la tarjeta no los trae y no se encontraron publicados.
- Se usó Ventaja Var (varones); Ventaja Damas no se usa.

## Siguiente paso
Decidir el mapa: mostrar el mapa oficial de la tarjeta o volver a trazar los 9 hoyos sobre él.
