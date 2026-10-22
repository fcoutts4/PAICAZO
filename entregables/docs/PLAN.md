# PAICAZO — Plan del campeonato y la app

Campeonato de golf entre amigos, 18 hoyos, Club de Golf El Paico.

## 1. Modalidad de juego

**Principal: Stableford neto individual (95% del hándicap de juego).**

- Por qué: con índices de 2.7 a 22.1, el Stableford neto empareja la cancha
  y un hoyo malo no mata la ronda (se levanta la bola al llegar a 0 puntos),
  así el juego es más rápido y todos siguen vivos hasta el final.
- Puntos por hoyo (neto): doble bogey o peor 0 · bogey 1 · par 2 ·
  birdie 3 · eagle 4 · albatros 5.
- Hándicap de cancha = Índice × Slope / 113 + (Course Rating − Par).
  Hándicap de juego = 95% del de cancha, redondeado. Se reparte por el
  índice de dificultad (HCP) de cada hoyo de la tarjeta.
- Desempate: últimos 9, últimos 6, últimos 3, último hoyo (en puntos).

**Juegos paralelos (lo que lo hace entretenido):**

| Juego | Cómo | Dónde lo calcula la app |
|---|---|---|
| Skins netos | Cada hoyo lo gana quien tenga el mejor neto **solo**; si empatan, el skin se acumula al siguiente | Automático |
| Gross (scratch) | Premio al menor número de golpes brutos | Automático |
| Approach | Más cerca del hoyo en los par 3 | Carga manual del marcador |
| Long drive | Drive más largo en un par 5 elegido | Carga manual del marcador |
| Copa por grupos | Grupos de 3–4; suman los 2 mejores Stableford del grupo por hoyo | Automático |

## 2. Validación cruzada de tarjetas

Igual que en un torneo real: **cada jugador tiene un marcador** (otro del
mismo grupo).

1. El jugador anota sus golpes hoyo a hoyo en su celular.
2. El marcador anota, en paralelo, los golpes de su marcado.
3. La app compara: si coinciden, el hoyo queda verde; si no, queda rojo y
   ambos ven la diferencia para corregir.
4. Al terminar, el jugador **firma** su tarjeta (solo se puede si los 18
   hoyos coinciden). Firmada = entra al ranking oficial.
5. El admin (F. Coutts) puede destrabar una tarjeta en disputa.

## 3. La app

- **Stack:** Next.js en Vercel + Postgres (Neon, desde el Marketplace de
  Vercel, plan gratis). Una sola app, sin servicios extra.
- **Usuarios:** uno por jugador, ingreso con nombre + PIN de 4 dígitos
  (sin correos ni contraseñas). Un usuario admin.
- **Pantallas (mobile first, se instala como app en el teléfono):**
  1. Ingreso (elige tu nombre + PIN).
  2. Mi tarjeta: hoyo a hoyo, botones +/− grandes, muestra par, HCP del
     hoyo, golpes recibidos y puntos al instante.
  3. Tarjeta de mi marcado (la validación cruzada).
  4. Ranking en vivo: Stableford neto, gross, skins, copa por grupos.
  5. Admin: jugadores, índices, grupos, marcadores, cerrar torneo.
- **Cálculo:** en la base de datos (vistas SQL), la app solo muestra.
- **Estilo:** colores del logo — verde oscuro `#1B4332`, verde lima
  `#8CC63F`, gris `#6B6B6B`, blanco. Logo en `assets/logo-paicazo.jpg`.

## 4. Jugadores confirmados (11)

| # | Jugador | Índice |
|---|---|---|
| 1 | F. Coutts (admin, asado) | 13.4 |
| 2 | A. Guzman | 18.1 |
| 3 | M. Undu | 15.8 |
| 4 | JP Undu | 16.5 |
| 5 | MG | 18.8 |
| 6 | JPO | 17.8 |
| 7 | PM | 2.7 |
| 8 | IU | 22.1 |
| 9 | VC | 22.1 |
| 10 | A. Ochagavía | 18.0 |
| 11 | M. Covarrubias | 12.6 |
| 12 | *por confirmar* | — |

Grupos sugeridos: 3 grupos de 4 (con 11: 4-4-3), mezclando índices bajos y
altos en cada grupo para que la copa por grupos sea pareja.

## 5. Falta para empezar

- [ ] Tarjeta de la cancha (foto/PDF): par, HCP por hoyo, y Slope /
      Course Rating de la salida que se jugará.
- [ ] Fecha y salida (tees) del campeonato.
- [ ] Nombres completos / apodos que quieren ver en la app.
- [ ] Cuenta Vercel + GitHub donde se publica.

## 6. Etapas

1. Datos: cargar tarjeta, jugadores y grupos (seed).
2. Cálculo: hándicap de juego, Stableford, skins, copa — con pruebas.
3. App: ingreso, mi tarjeta, validación cruzada, ranking.
4. Admin y firma de tarjetas.
5. Deploy en Vercel + prueba con 2–3 teléfonos antes del día.
