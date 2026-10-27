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

## Jugadores desde el Admin
- Agregar (nombre e índice): se guarda en la tabla `agregados` con un id sacado del nombre, que no cambia porque el PIN sale de él. Entra al grupo más chico, insertado en la cadena de marcadores (`sumarAGrupo`).
- Cambiar índice de cualquiera (tabla `indices`). Quitar solo a los agregados, con todo lo suyo en una sola sentencia; la cadena de marcadores se cierra sola (`sacarDeGrupo`).
- `guardarGrupos` ahora es una sola sentencia (upsert + delete): si falla, no queda a medias.
- El login valida contra JSON + agregados (`jugador()` pasó a ser async).
- El botón "No" de la columna Juega ya no hereda el ancho completo de `.btn.peligro`.
- Verificado en local: agregar, entrar con el PIN del nuevo, cambiar índice (20,5 → HCP 19) y quitar. Suite: 146 en verde.
- Nota de prueba: con el panel del navegador oculto, React no reemplaza el "Cargando…" del streaming (no corre requestAnimationFrame) y la página no se hidrata. No es un bug de la app.

## 2026-10-27 · Quitar a cualquier jugador
- Se puede quitar a cualquiera menos al admin (`sePuedeQuitar`). Los del JSON quedan en la tabla `quitados`, que los oculta; su id queda reservado (`idsUsados`) para que un jugador nuevo no herede el mismo PIN.
- El desplegable de la zona de peligro usa el mismo estilo que los del Admin y parte en "Elige a quién quitar" (antes partía en el primero de la lista).
- Verificado en local con VC: sale del ingreso y del Admin, y el G3 queda cerrado. La base local se respaldó antes y se restauró después. Suite: 149 en verde.
