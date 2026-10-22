"""Genera public/mapa-9-hoyos.svg: mapa propio de los hoyos 1-9 de Paico Alto.

Geometría trazada sobre assets/plano-paico-alto.jpg (recorte x680 y280, escala 2;
~1,7 px por yarda, verificado contra las yardas azules en tests/test_mapa.py).
Además genera public/hoyo-1..9.svg: cada hoyo girado (tee abajo, green arriba), vertical para el teléfono.
Uso: python scripts/mapa.py
"""
import functools
import math
import random
from pathlib import Path

PX_YD = 1.7
SALTO = chr(10)

# n, par, yardas azules, yardas blancas, lado del número (+1/-1), línea de juego tee → green
HOYOS = [
    (1, 4, 401, 371, -1, [(382, 1000), (560, 760), (664, 590), (750, 398)]),
    (2, 4, 397, 375, +1, [(838, 408), (720, 640), (612, 848), (448, 1024)]),
    (3, 3, 185, 162, -1, [(510, 1124), (834, 1068)]),
    (4, 4, 407, 383, -1, [(884, 1112), (1052, 644), (1144, 454)]),
    (5, 5, 506, 479, +1, [(1078, 430), (848, 870), (560, 1055)]),
    (6, 4, 381, 353, -1, [(628, 948), (920, 560), (900, 442)]),
    (7, 4, 327, 301, -1, [(1094, 380), (790, 300), (532, 222)]),
    (8, 3, 211, 185, -1, [(652, 108), (310, 92)]),
    (9, 4, 466, 436, +1, [(220, 98), (155, 580), (272, 862)]),
]
LAGOS = [  # cx, cy, rx, ry
    (205, 58, 62, 66), (565, 62, 58, 64), (540, 272, 34, 18),
    (985, 476, 28, 84), (425, 1092, 50, 26), (700, 1130, 100, 14),
]
LIMITE = [(100, 0), (690, 0), (705, 175), (1232, 382), (1000, 1210), (100, 1210)]
CAMINO = [(360, 300), (352, 560), (398, 622), (332, 900), (308, 1210)]
RANGE = [(505, 325), (640, 330), (652, 600), (565, 780), (452, 780), (448, 560)]
ETIQ_FIJA = {5: (1028, 428)}  # los tees del 5 y el 7 están pegados
CLUB = (95, 1010, 175, 85)  # x, y, w, h
TENIS = (226, 596, 166, 142)


def catmull(pts, paso=4.0, cerrada=False):
    """Curva suave (Catmull-Rom) que pasa por los puntos, muestreada cada ~paso px."""
    if cerrada:
        p, tramos = pts[-1:] + pts + pts[:2], len(pts)
    else:
        p, tramos = pts[:1] + pts + pts[-1:], len(pts) - 1
    out = []
    for i in range(1, tramos + 1):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        n = max(2, int(math.dist(p1, p2) / paso))
        for k in range(n):
            t = k / n
            out.append(tuple(
                0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                       + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in (0, 1)))
    if not cerrada:
        out.append(pts[-1])
    return out


def acumulado(linea):
    s = [0.0]
    for a, b in zip(linea, linea[1:]):
        s.append(s[-1] + math.dist(a, b))
    return s


def en(linea, s_acum, s):
    """Punto y dirección unitaria a la distancia s sobre la línea."""
    s = max(0.0, min(s, s_acum[-1]))
    for i in range(1, len(linea)):
        if s_acum[i] >= s:
            (x0, y0), (x1, y1) = linea[i - 1], linea[i]
            seg = s_acum[i] - s_acum[i - 1] or 1
            t = (s - s_acum[i - 1]) / seg
            return (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t), ((x1 - x0) / seg, (y1 - y0) / seg)
    return linea[-1], (1.0, 0.0)


def d(pts, cerrar=True):
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + (" Z" if cerrar else "")


def mancha(cx, cy, r, ang=0.0, alarg=1.0, rug=0.22, n=12):
    """Contorno orgánico (bunker, laguna)."""
    fases = [random.uniform(0, 6.28) for _ in range(3)]
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r * (1 + rug * sum(math.sin((k + 2) * a + f) / (k + 1) for k, f in enumerate(fases)) / 1.8)
        x, y = rr * alarg * math.cos(a), rr * math.sin(a)
        pts.append((cx + x * math.cos(ang) - y * math.sin(ang), cy + x * math.sin(ang) + y * math.cos(ang)))
    return d(catmull(pts, 3, cerrada=True))


def dist_linea(p, linea):
    best = 1e9
    for (ax, ay), (bx, by) in zip(linea, linea[1:]):
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy or 1)))
        best = min(best, math.dist(p, (ax + t * dx, ay + t * dy)))
    return best


def dentro(p, poli):
    x, y, c = p[0], p[1], False
    for (x0, y0), (x1, y1) in zip(poli, poli[1:] + poli[:1]):
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
            c = not c
    return c


@functools.cache
def dibujo():
    """Cuerpo del mapa (sin <svg> raíz) y posición del número de cada hoyo."""
    random.seed(7)  # mismo mapa en cada corrida
    lineas = {n: catmull(pts) for n, *_, pts in HOYOS}
    camino = catmull(CAMINO)
    svg = []
    add = svg.append

    add(f"""<defs>
<radialGradient id="gGreen" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#A9DE6E"/><stop offset="1" stop-color="#6DB43F"/></radialGradient>
<linearGradient id="gAgua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FBEE0"/><stop offset="1" stop-color="#3B82B5"/></linearGradient>
<radialGradient id="gArena" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FBF1D2"/><stop offset="1" stop-color="#E6CD8E"/></radialGradient>
<filter id="sombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.5" dy="2" stdDeviation="1.6" flood-opacity=".35"/></filter>
<filter id="textura" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="3" seed="4"/>
<feColorMatrix values="0 0 0 0 .2  0 0 0 0 .38  0 0 0 0 .12  0 0 0 .5 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<clipPath id="cancha"><path d="{d(LIMITE)}"/></clipPath>
</defs>""")

    # terreno
    add('<rect x="100" y="0" width="1140" height="1210" fill="#EFE8D8"/>')
    add(f'<path d="{d(LIMITE)}" fill="#86B45A"/>')
    add(f'<path d="{d(LIMITE)}" fill="#86B45A" filter="url(#textura)"/>')
    add('<g clip-path="url(#cancha)">')

    # pasillo de rough de cada hoyo
    for linea in lineas.values():
        add(f'<path d="{d(linea, False)}" fill="none" stroke="#9CCB6B" stroke-width="112" stroke-linecap="round" stroke-linejoin="round"/>')

    # cancha de práctica, tenis, camino y casa club
    add(f'<path d="{d(RANGE)}" fill="#A9D17A" stroke="#93BF67" stroke-width="3"/>')
    for i in range(4):
        add(f'<circle cx="{540 + (i % 2) * 40}" cy="{420 + i * 70}" r="{8 + i * 1.5}" fill="#BDE28C" stroke="#fff" stroke-width="2"/>')
    add('<rect x="458" y="758" width="104" height="16" rx="4" fill="#78A84E"/>')
    x, y, w, h = TENIS
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="#9CC575"/>')
    for i in range(3):
        for j in range(2):
            add(f'<rect x="{x + 10 + i * 52}" y="{y + 12 + j * 66}" width="42" height="56" rx="3" fill="#C96B3C" stroke="#fff" stroke-width="2"/>')
    add(f'<path d="{d(camino, False)}" fill="none" stroke="#B5B0A3" stroke-width="13" stroke-linecap="round"/>')
    add(f'<path d="{d(camino, False)}" fill="none" stroke="#DAD6CC" stroke-width="9" stroke-linecap="round"/>')
    add('<circle cx="360" cy="300" r="17" fill="#DAD6CC" stroke="#B5B0A3" stroke-width="3"/>')
    x, y, w, h = CLUB
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#C3D6A4"/>')
    add(f'<g filter="url(#sombra)"><path d="M{x + 16},{y + 22} l92,-8 l5,34 l-92,8 Z" fill="#8C5A3C"/>'
        f'<path d="M{x + 28},{y + 54} l74,0 l0,24 l-74,0 Z" fill="#A06A48"/>'
        f'<circle cx="{x + 142}" cy="{y + 40}" r="22" fill="#B7D58C" stroke="#fff" stroke-width="2"/></g>')

    # lagunas
    for cx, cy, rx, ry in LAGOS:
        r = min(rx, ry)
        path = mancha(cx, cy, r, 0 if rx >= ry else math.pi / 2, max(rx, ry) / r, 0.16)
        add(f'<path d="{path}" fill="#D9E9DA" stroke="#D9E9DA" stroke-width="9" stroke-linejoin="round"/>')
        add(f'<path d="{path}" fill="url(#gAgua)" stroke="#2F6F9A" stroke-width="1.5"/>')

    # árboles: grupos al azar fuera de pasillos, lagunas, camino e instalaciones
    arboles = []
    for _ in range(650):
        cx, cy = random.uniform(100, 1232), random.uniform(0, 1210)
        for _ in range(random.randint(3, 9)):
            p = (cx + random.gauss(0, 16), cy + random.gauss(0, 16))
            if not dentro(p, LIMITE) or dentro(p, RANGE):
                continue
            if any(dist_linea(p, l) < 64 for l in lineas.values()) or dist_linea(p, camino) < 14:
                continue
            if any(((p[0] - lx) / (rx + 12)) ** 2 + ((p[1] - ly) / (ry + 12)) ** 2 < 1 for lx, ly, rx, ry in LAGOS):
                continue
            if any(b[0] - 8 < p[0] < b[0] + b[2] + 8 and b[1] - 8 < p[1] < b[1] + b[3] + 8 for b in (CLUB, TENIS)):
                continue
            arboles.append((p, random.uniform(6, 12), random.choice(["#2E6B2E", "#3B7F34", "#24572A", "#4A8A3A", "#356F3F"])))
    arboles.sort(key=lambda a: a[0][1])
    for (x, y), r, _ in arboles:
        add(f'<circle cx="{x + r * .35:.1f}" cy="{y + r * .45:.1f}" r="{r:.1f}" fill="#1D3A1A" opacity=".3"/>')
    for (x, y), r, color in arboles:
        add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{color}"/>'
            f'<circle cx="{x - r * .3:.1f}" cy="{y - r * .3:.1f}" r="{r * .45:.1f}" fill="#8CC063" opacity=".4"/>')

    # calles, bunkers, tees y greens
    banderas = {}
    for n, par, yaz, ybl, lado, pts in HOYOS:
        linea = lineas[n]
        s = acumulado(linea)
        L = s[-1]
        ang = math.degrees(math.atan2(pts[-1][1] - pts[0][1], pts[-1][0] - pts[0][0]))
        add(f'<pattern id="corte{n}" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate({ang:.1f})">'
            f'<rect width="28" height="28" fill="#4FA83C"/><rect width="14" height="28" fill="#5CB648"/></pattern>')

        # calle: ancho que respira a lo largo del hoyo (en par 3 solo un antegreen)
        s0, s1, W = {3: (L - 72, L - 24, 17), 4: (0.30 * L, L - 30, 28), 5: (0.20 * L, L - 30, 30)}[par]
        fase = random.uniform(0, 6.28)
        izq, der = [], []
        for k in range(int((s1 - s0) / 5) + 1):
            sk = s0 + k * 5
            t = (sk - s0) / (s1 - s0)
            (px, py), (ux, uy) = en(linea, s, sk)
            w = W * (0.55 + 0.45 * math.sin(math.pi * min(1, t * 1.2)) ** 0.6)
            wi, wd = w * (1 + 0.13 * math.sin(t * 9 + fase)), w * (1 + 0.13 * math.sin(t * 6 + fase + 2))
            izq.append((px - uy * wi, py + ux * wi))
            der.append((px + uy * wd, py - ux * wd))
        calle = d(izq + der[::-1])
        add(f'<path d="{calle}" fill="#B2D98A" stroke="#B2D98A" stroke-width="12" stroke-linejoin="round"/>')
        add(f'<path d="{calle}" fill="url(#corte{n})" stroke="#4FA83C" stroke-width="1"/>')

        (gx, gy), (ux, uy) = en(linea, s, L)
        bunker = 'fill="url(#gArena)" stroke="#CBB277" stroke-width="1.2" filter="url(#sombra)"'
        for lb in ((-1, 1) if par == 3 else (random.choice([-1, 1]),)):  # junto al green
            bx, by = gx - ux * 8 - uy * 35 * lb, gy - uy * 8 + ux * 35 * lb
            add(f'<path d="{mancha(bx, by, 9, math.atan2(uy, ux) + 1.4, 1.8)}" {bunker}/>')
        if par >= 4:  # en la zona de caída del drive
            (bx, by), (vx, vy) = en(linea, s, min(240 * PX_YD, L - 120))
            add(f'<path d="{mancha(bx + vy * 38 * lado, by - vx * 38 * lado, 10, math.atan2(vy, vx), 1.9)}" {bunker}/>')

        # tee: caja larga con salida azul (atrás) y blanca (adelante)
        (tx, ty), (vx, vy) = en(linea, s, 0)
        largo = (yaz - ybl) * PX_YD
        add(f'<g transform="translate({tx:.1f} {ty:.1f}) rotate({math.degrees(math.atan2(vy, vx)):.1f})" filter="url(#sombra)">'
            f'<rect x="-11" y="-9" width="{largo + 22:.1f}" height="18" rx="5" fill="#62BC4C" stroke="#3E8E35" stroke-width="1.5"/>'
            f'<circle r="3.8" fill="#1F5FBF" stroke="#fff" stroke-width="1"/>'
            f'<circle cx="{largo:.1f}" r="3.8" fill="#fff" stroke="#555" stroke-width="1"/></g>')

        # green con antegreen y bandera
        add(f'<g transform="translate({gx:.1f} {gy:.1f}) rotate({math.degrees(math.atan2(uy, ux)):.1f})" filter="url(#sombra)">'
            f'<ellipse rx="31" ry="26" fill="#68BD4B"/><ellipse rx="25" ry="20.5" fill="url(#gGreen)"/></g>')
        banderas[n] = (gx + random.uniform(-7, 7), gy + random.uniform(-6, 6))  # se dibujan aparte, siempre derechas

        add(f'<path d="{d(linea, False)}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 7" stroke-linecap="round" opacity=".85"/>')

    add('</g>')  # fin del recorte a la cancha
    add(f'<path d="{d(LIMITE)}" fill="none" stroke="#5E7F45" stroke-width="2" stroke-dasharray="10 6"/>')

    # número del hoyo junto al tee (par, yardas y HCP van en la tabla de la app)
    numeros = {}
    for n, par, yaz, ybl, lado, pts in HOYOS:
        linea, s = lineas[n], acumulado(lineas[n])
        (tx, ty), (ux, uy) = en(linea, s, 0)
        numeros[n] = ETIQ_FIJA.get(n) or (tx - ux * 30 - uy * 26 * lado, ty - uy * 30 + ux * 26 * lado)
    return SALTO.join(svg), numeros, banderas, lineas


def bandera(x, y):
    return (f'<g transform="translate({x:.1f} {y:.1f})"><ellipse cx="7" cy="1" rx="9" ry="2" fill="#000" opacity=".2"/>'
            f'<circle r="2.2" fill="#1B4332"/><line y2="-30" stroke="#F4F4F4" stroke-width="2"/>'
            f'<path d="M0,-30 L17,-25 L0,-19 Z" fill="#C30B26"/></g>')


ETIQ_W, ETIQ_H = 46, 22  # píldora "1-10": hoyo de la ida y de la vuelta


def numero(n, x, y):
    return (f'<g filter="url(#sombra)"><rect x="{x - ETIQ_W / 2:.1f}" y="{y - ETIQ_H / 2:.1f}" width="{ETIQ_W}" height="{ETIQ_H}" '
            f'rx="{ETIQ_H / 2}" fill="#1B4332" stroke="#fff" stroke-width="2"/>'
            f'<text x="{x:.1f}" y="{y + 5.5:.1f}" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">{n}-{n + 9}</text></g>')


RAIZ = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="{}" font-family="Inter, Arial, sans-serif">'


def generar():
    """Cancha completa: public/mapa-9-hoyos.svg"""
    cuerpo, numeros, banderas, _ = dibujo()
    return SALTO.join([RAIZ.format("100 0 1140 1210"), cuerpo, *(bandera(*p) for p in banderas.values()),
                       *(numero(n, *p) for n, p in numeros.items()), "</svg>"])


def giro(pts):
    """Ángulo (grados) y centro para dejar el tee abajo y el green arriba."""
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    return -90 - math.degrees(math.atan2(y1 - y0, x1 - x0)), ((x0 + x1) / 2, (y0 + y1) / 2)


def rotar(p, c, ang):
    a = math.radians(ang)
    dx, dy = p[0] - c[0], p[1] - c[1]
    return c[0] + dx * math.cos(a) - dy * math.sin(a), c[1] + dx * math.sin(a) + dy * math.cos(a)


def generar_hoyo(n, pad=70, alto_ancho=1.6):
    """Un hoyo girado como en un GPS de golf, vertical: public/hoyo-N.svg"""
    cuerpo, numeros, banderas, lineas = dibujo()
    pts = next(h[-1] for h in HOYOS if h[0] == n)
    ang, c = giro(pts)
    xs, ys = zip(*(rotar(p, c, ang) for p in catmull(pts)))
    x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
    w, h = x1 - x0, y1 - y0
    if h < w * alto_ancho:
        y0, h = y0 - (w * alto_ancho - h) / 2, w * alto_ancho
    else:
        x0, w = x0 - (h / alto_ancho - w) / 2, h / alto_ancho
    caja = f"{x0:.0f} {y0:.0f} {w:.0f} {h:.0f}"
    return SALTO.join([
        RAIZ.format(caja),
        f'<rect x="{x0:.0f}" y="{y0:.0f}" width="{w:.0f}" height="{h:.0f}" fill="#EFE8D8"/>',
        f'<g transform="rotate({ang:.2f} {c[0]:.1f} {c[1]:.1f})">', cuerpo,
        # foco: el resto de la cancha queda atenuado
        f'<mask id="foco"><rect x="-500" y="-500" width="2300" height="2300" fill="#fff"/>'
        f'<path d="{d(lineas[n], False)}" fill="none" stroke="#000" stroke-width="150" stroke-linecap="round" stroke-linejoin="round"/></mask>'
        '<rect x="-500" y="-500" width="2300" height="2300" fill="#F6F8F3" opacity=".42" mask="url(#foco)"/>',
        "</g>",
        bandera(*rotar(banderas[n], c, ang)),
        numero(n, *rotar(numeros[n], c, ang)),
        "</svg>",
    ])

if __name__ == "__main__":
    public = Path(__file__).resolve().parent.parent / "public"
    (public / "mapa-9-hoyos.svg").write_text(generar(), encoding="utf-8")
    for n, *_ in HOYOS:
        (public / f"hoyo-{n}.svg").write_text(generar_hoyo(n), encoding="utf-8")
    print(public, "mapa + 9 hoyos")
