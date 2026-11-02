"""PDF de estadísticas del campeonato PAICAZO.

Entrada: el JSON que arma scripts/estadisticas.mjs a partir de los scores que baja scripts/bajar_scores.mjs (mismo motor de la app). Salida: un PDF A4 apaisado.
Uso: python scripts/estadisticas_pdf.py <stats.json> <salida.pdf>
"""
import json
import sys
import tempfile
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402
from reportlab.lib import colors  # noqa: E402
from reportlab.lib.enums import TA_CENTER  # noqa: E402
from reportlab.lib.pagesizes import A4, landscape  # noqa: E402
from reportlab.lib.styles import ParagraphStyle  # noqa: E402
from reportlab.lib.units import mm  # noqa: E402
from reportlab.platypus import (Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,  # noqa: E402
                                TableStyle)

RAIZ = Path(__file__).resolve().parent.parent
VERDE, VERDE2, LIMA = '#1B4332', '#2D6A4F', '#8CC63F'
TEXTO, GRIS, LINEA, FONDO = '#0F1F17', '#6B7A70', '#E6ECE3', '#F7F9F5'
CONTEXTO = '#C9D1C7'  # líneas de los demás en los gráficos de puesto
# resultado vs par, divergente: bajo el par en verde, par neutro, sobre el par en ámbar → rojo (validado: CVD y visión normal)
RESULTADO = {'eagle': '#1B4332', 'birdie': '#5E9C76', 'par': '#D3D9CF', 'bogey': '#D9861A', 'doble': '#C30B26'}
NOMBRE_RES = {'eagle': 'Eagle o mejor', 'birdie': 'Birdie', 'par': 'Par', 'bogey': 'Bogey', 'doble': 'Doble bogey o peor'}

plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 9, 'axes.edgecolor': LINEA, 'axes.labelcolor': GRIS,
                     'xtick.color': GRIS, 'ytick.color': GRIS, 'axes.spines.top': False, 'axes.spines.right': False})


def dec(n, d=2):
    """Número es-CL: coma decimal, sin decimales si es entero."""
    if float(n).is_integer():
        return f'{int(n)}'
    return f'{n:.{d}f}'.rstrip('0').rstrip('.').replace('.', ',')


def signo(n):
    return 'E' if n == 0 else f'+{n}' if n > 0 else f'{n}'


def figura(fig, nombre, carpeta, ancho_mm):
    ruta = carpeta / f'{nombre}.png'
    fig.savefig(ruta, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    w, h = fig.get_size_inches()
    return Image(str(ruta), width=ancho_mm * mm, height=ancho_mm * mm * h / w)


def grafico_puestos(st, clave, titulo, carpeta, destacado):
    """Puesto hoyo a hoyo: todos en gris con su nombre al final; el campeón en verde."""
    puestos, n = st['puestos'][clave], len(st['jugador'])
    nombres = {j['id']: j['nombre'] for j in st['jugador']}
    orden = sorted(puestos, key=lambda i: (puestos[i][-1], nombres[i]))
    fig, ax = plt.subplots(figsize=(11.5, 6.2))
    x = list(range(1, 19))
    for i in orden[::-1]:
        es = i == destacado
        ax.plot(x, puestos[i], color=VERDE2 if es else CONTEXTO, lw=2.6 if es else 1.4, zorder=3 if es else 2,
                marker='o', ms=4.5 if es else 2.5, solid_capstyle='round')
    for k, i in enumerate(orden):  # etiqueta al final, en el orden final (sin choques en empates)
        ax.annotate(f'{k + 1}. {nombres[i]}', xy=(18, puestos[i][-1]), xytext=(18.45, k + 1), va='center', fontsize=8.5,
                    color=VERDE if i == destacado else TEXTO, fontweight='bold' if i == destacado else 'normal',
                    arrowprops=dict(arrowstyle='-', color=LINEA, lw=0.6) if puestos[i][-1] != k + 1 else None, annotation_clip=False)
    ax.set_ylim(n + 0.6, 0.4)
    ax.set_xlim(0.7, 18.3)
    ax.set_yticks(range(1, n + 1))
    ax.set_xticks(x)
    ax.set_xlabel('Hoyo')
    ax.set_ylabel('Puesto')
    ax.axvline(9.5, color=LINEA, lw=1, zorder=1)
    ax.text(5, n + 0.45, 'Ida', ha='center', color=GRIS, fontsize=8)
    ax.text(14, n + 0.45, 'Vuelta', ha='center', color=GRIS, fontsize=8)
    ax.grid(axis='y', color=LINEA, lw=0.6)
    ax.set_title(titulo, loc='left', fontsize=11, color=TEXTO, pad=10)
    return figura(fig, f'puestos-{clave}', carpeta, 262)


def mini_puestos(st, clave, carpeta):
    """Una mini gráfica por jugador: su línea en verde sobre las de los demás en gris."""
    puestos, n = st['puestos'][clave], len(st['jugador'])
    jug = sorted(st['jugador'], key=lambda j: puestos[j['id']][-1])
    cols = 5
    filas = -(-len(jug) // cols)
    fig, axs = plt.subplots(filas, cols, figsize=(12, 2.05 * filas), sharex=True, sharey=True)
    x = list(range(1, 19))
    for k, ax in enumerate(axs.flat):
        if k >= len(jug):
            ax.axis('off')
            continue
        j = jug[k]
        for o in jug:
            if o['id'] != j['id']:
                ax.plot(x, puestos[o['id']], color=CONTEXTO, lw=0.8)
        ax.plot(x, puestos[j['id']], color=VERDE2, lw=2.2, marker='o', ms=2.2)
        fin = puestos[j['id']][-1]
        mejor = min(puestos[j['id']])
        ax.set_title(f"{fin}º  {j['nombre']}", loc='left', fontsize=8.5, color=TEXTO, fontweight='bold')
        ax.text(18, n + 0.2, f'mejor: {mejor}º', ha='right', va='bottom', fontsize=7, color=GRIS)
        ax.set_ylim(n + 0.6, 0.4)
        ax.set_yticks([1, 5, 10, n])
        ax.set_xticks([1, 9, 18])
        ax.axvline(9.5, color=LINEA, lw=0.8)
        ax.grid(axis='y', color=LINEA, lw=0.4)
    fig.tight_layout(h_pad=1.4)
    return figura(fig, f'mini-{clave}', carpeta, 262)


def grafico_resultados(st, carpeta):
    """Barras apiladas de resultados por jugador (gross), del mejor de la Copa hacia abajo."""
    jug = sorted(st['jugador'], key=lambda j: [c['pos'] for c in st['copa'] if c['id'] == j['id']][0])[::-1]
    fig, ax = plt.subplots(figsize=(11.5, 5.4))
    izq = [0] * len(jug)
    for k in RESULTADO:
        vals = [j[k] for j in jug]
        ax.barh([j['nombre'] for j in jug], vals, left=izq, color=RESULTADO[k], edgecolor='white', linewidth=1.5, label=NOMBRE_RES[k], height=0.72)
        for y, (v, l) in enumerate(zip(vals, izq)):
            if v:
                ax.text(l + v / 2, y, str(v), ha='center', va='center', fontsize=7.5, color='white' if k in ('eagle', 'birdie', 'doble') else TEXTO)
        izq = [a + b for a, b in zip(izq, vals)]
    ax.set_xlim(0, 18)
    ax.set_xticks([0, 3, 6, 9, 12, 15, 18])
    ax.set_xlabel('Hoyos')
    ax.legend(ncol=5, loc='upper center', bbox_to_anchor=(0.5, 1.09), frameon=False, fontsize=8.5)
    ax.tick_params(axis='y', length=0)
    return figura(fig, 'resultados', carpeta, 262)


def grafico_hoyos(st, carpeta):
    """Dificultad por hoyo: golpes promedio sobre el par (una sola tonalidad: más oscuro = más difícil)."""
    hs = st['hoyos']
    fig, ax = plt.subplots(figsize=(11.5, 4.2))
    m = max(h['sobrePar'] for h in hs) or 1
    tonos = [matplotlib.colors.to_hex(matplotlib.colors.LinearSegmentedColormap.from_list('v', ['#CFE3C2', VERDE])(max(h['sobrePar'], 0) / m)) for h in hs]
    xs = [h['hoyo'] for h in hs]
    ax.bar(xs, [h['sobrePar'] for h in hs], color=tonos, width=0.72, edgecolor='white', linewidth=1.5)
    for h in hs:
        ax.text(h['hoyo'], h['sobrePar'] + 0.03, f"+{dec(h['sobrePar'], 2)}", ha='center', va='bottom', fontsize=7.5, color=TEXTO)
    ax.set_xticks(xs)
    ax.set_xticklabels([f"{h['hoyo']}\npar {h['par']}" for h in hs], fontsize=7.5)
    ax.set_ylabel('Golpes sobre el par (promedio)')
    ax.axvline(9.5, color=LINEA, lw=1)
    ax.grid(axis='y', color=LINEA, lw=0.6)
    ax.set_axisbelow(True)
    return figura(fig, 'hoyos', carpeta, 262)


def construir(st, salida):
    carpeta = Path(tempfile.mkdtemp())
    E = {
        'titulo': ParagraphStyle('t', fontName='Helvetica-Bold', fontSize=26, leading=30, textColor=colors.HexColor(VERDE)),
        'h1': ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=colors.HexColor(TEXTO), spaceAfter=2),
        'sub': ParagraphStyle('s', fontName='Helvetica', fontSize=9.5, leading=13, textColor=colors.HexColor(GRIS), spaceAfter=8),
        'cuerpo': ParagraphStyle('c', fontName='Helvetica', fontSize=9.5, leading=13, textColor=colors.HexColor(TEXTO)),
        'kpi': ParagraphStyle('k', fontName='Helvetica-Bold', fontSize=20, leading=24, alignment=TA_CENTER, textColor=colors.HexColor(TEXTO)),
        'kpil': ParagraphStyle('kl', fontName='Helvetica', fontSize=8, leading=10, alignment=TA_CENTER, textColor=colors.HexColor(GRIS)),
    }
    J = {j['id']: j for j in st['jugador']}
    copa, general = st['copa'], st['general']

    def tabla(datos, anchos, num_desde=1, destacar_primera=True, num_hasta=-1):
        t = Table(datos, colWidths=[a * mm for a in anchos], repeatRows=1)
        estilo = [
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 7.5), ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor(GRIS)),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(FONDO)), ('FONT', (0, 1), (-1, -1), 'Helvetica', 9),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor(TEXTO)), ('LINEBELOW', (0, 0), (-1, -1), 0.4, colors.HexColor(LINEA)),
            ('ALIGN', (num_desde, 0), (num_hasta, -1), 'RIGHT'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]
        if destacar_primera:
            estilo += [('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#EEF6E2')), ('FONT', (0, 1), (-1, 1), 'Helvetica-Bold', 9)]
        t.setStyle(TableStyle(estilo))
        return t

    def kpis(items):
        celdas = [[Paragraph(v, E['kpi']) for v, _ in items], [Paragraph(l, E['kpil']) for _, l in items]]
        t = Table(celdas, colWidths=[262 / len(items) * mm] * len(items))
        t.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor(LINEA)), ('INNERGRID', (0, 0), (-1, -1), 0, colors.white),
                               ('LINEAFTER', (0, 0), (-2, -1), 0.6, colors.HexColor(LINEA)), ('TOPPADDING', (0, 0), (-1, 0), 10),
                               ('BOTTOMPADDING', (0, 1), (-1, 1), 10), ('BACKGROUND', (0, 0), (-1, -1), colors.white)]))
        return t

    jug = st['jugador']
    gross_prom = sum(j['gross'] for j in jug) / len(jug)
    birdies = sum(j['birdie'] + j['eagle'] for j in jug)
    mejor_gross = min(jug, key=lambda j: j['gross'])
    mejor_neto = min(jug, key=lambda j: j['neto'])
    rey = max(jug, key=lambda j: j['rey'])
    mas_birdies = max(jug, key=lambda j: j['birdie'] + j['eagle'])
    lider = max(st['lideresCopa'].items(), key=lambda kv: kv[1])
    subida = st['subida'][0]
    hs = st['hoyos']
    dificil, facil = max(hs, key=lambda h: h['sobrePar']), min(hs, key=lambda h: h['sobrePar'])
    c1, g1 = copa[0], general[0]

    hist = []
    # ── 1. portada ──
    logo = RAIZ / 'public' / 'logo.png'
    hist += [Table([[Image(str(logo), width=34 * mm, height=34 * mm) if logo.exists() else '',
                     [Paragraph('PAICAZO', E['titulo']), Paragraph('Estadísticas del campeonato', E['h1']),
                      Paragraph(f"{st['cancha']['club']} · salida azul · 9 hoyos × 2 · par {st['cancha']['par']} · "
                                f"{len(jug)} jugadores · Stableford neto 95%", E['sub'])]]],
                   colWidths=[40 * mm, 222 * mm], style=[('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]), Spacer(1, 6 * mm)]
    hist.append(kpis([(g1['nombre'], 'Campeón General (Copa + bonus)'), (c1['nombre'], f"Campeón Copa Paicazo · {c1['puntos']} pts"),
                      (rey['nombre'], f"Rey del Hoyo · {dec(rey['rey'])} pts"), (mejor_gross['nombre'], f"Mejor gross · {mejor_gross['gross']} golpes")]))
    hist.append(Spacer(1, 5 * mm))
    hist.append(kpis([(str(len(jug)), 'Jugadores'), (dec(gross_prom, 1), 'Gross promedio'), (str(birdies), 'Birdies (o mejor)'),
                      (f"{dec(mejor_neto['neto'], 1)}", f"Mejor neto · {mejor_neto['nombre']}"), (str(dificil['hoyo']), f"Hoyo más difícil · +{dec(dificil['sobrePar'], 2)}")]))
    hist.append(Spacer(1, 6 * mm))
    hist.append(Paragraph('Lo destacado', E['h1']))
    for t in [
        f"<b>{g1['nombre']}</b> ganó el General con {dec(g1['total'])} puntos ({g1['stableford']} de Copa + {dec(g1['skins'] + g1['grupo'])} de bonus).",
        f"<b>{c1['nombre']}</b> ganó la Copa Paicazo con {c1['puntos']} puntos Stableford" + (
            f" (desempate por neto total: {dec(c1['neto'], 1)})." if len(copa) > 1 and copa[1]['puntos'] == c1['puntos'] else '.'),
        f"<b>{J[lider[0]]['nombre']}</b> fue líder de la Copa en {lider[1]} de los 18 hoyos.",
        f"<b>{subida['nombre']}</b> tuvo la mejor vuelta: pasó del {subida['de']}º al {subida['a']}º en los últimos 9 hoyos." if subida['sube'] > 0 else '',
        f"<b>{mas_birdies['nombre']}</b> hizo más birdies: {mas_birdies['birdie'] + mas_birdies['eagle']}.",
        f"El hoyo más difícil fue el <b>{dificil['hoyo']}</b> (par {dificil['par']}, +{dec(dificil['sobrePar'], 2)} de promedio) y el más fácil el <b>{facil['hoyo']}</b> (par {facil['par']}, {signo(round(facil['sobrePar'], 2)) if facil['sobrePar'] <= 0 else '+' + dec(facil['sobrePar'], 2)})."]:
        if t:
            hist += [Paragraph('• ' + t, E['cuerpo']), Spacer(1, 1.5 * mm)]
    hist.append(PageBreak())

    # ── 2. clasificaciones ──
    hist += [Paragraph('Clasificación final', E['h1']),
             Paragraph('General = Copa (Stableford neto) + Rey del Hoyo + Puto. Desempate: menor neto total (golpes − índice).', E['sub'])]
    tg = [['#', 'Jugador', 'Copa', 'Rey', 'Puto', 'Total']] + [
        [f['pos'], f['nombre'], f['stableford'], dec(f['skins']), dec(f['grupo']), dec(f['total'])] for f in general]
    tc = [['#', 'Jugador', 'Índ', 'HCP', 'Gross', '±', 'Neto', 'Pts']] + [
        [f['pos'], f['nombre'], dec(J[f['id']]['indice'], 1), f['hj'], f['gross'], signo(f['vsPar']), dec(f['neto'], 1), f['puntos']] for f in copa]
    hist.append(Table([[Paragraph('<b>General</b>', E['cuerpo']), Paragraph('<b>Copa Paicazo</b> (Stableford neto)', E['cuerpo'])],
                       [tabla(tg, [9, 40, 16, 16, 16, 20], 2), tabla(tc, [9, 38, 13, 12, 14, 12, 15, 13], 2)]],
                      colWidths=[124 * mm, 138 * mm], style=[('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0)]))
    hist.append(PageBreak())

    # ── 3–5. puesto hoyo a hoyo ──
    hist += [Paragraph('Puesto hoyo a hoyo · Copa Paicazo', E['h1']),
             Paragraph('Posición en la Copa después de cada hoyo (Stableford acumulado, con el mismo desempate de la app). 1º arriba.', E['sub']),
             grafico_puestos(st, 'copa', '', carpeta, c1['id']), PageBreak(),
             Paragraph('Puesto hoyo a hoyo · cada jugador', E['h1']),
             Paragraph('La línea verde es el jugador; las grises, el resto. Ordenados por puesto final en la Copa.', E['sub']),
             mini_puestos(st, 'copa', carpeta), PageBreak(),
             Paragraph('Puesto hoyo a hoyo · General', E['h1']),
             Paragraph('Posición en el General (Copa + Rey del Hoyo + Puto) después de cada hoyo.', E['sub']),
             grafico_puestos(st, 'general', '', carpeta, g1['id']), PageBreak()]

    # ── 6. Rey del Hoyo y Puto ──
    rey_t = [['Hoyo', 'Par', 'Mejor', 'Ganó']] + [[h['hoyo'], h['par'], h['mejor'], ', '.join(h['rey']) if len(h['rey']) <= 3 else f"empate de {len(h['rey'])}"] for h in hs]
    pj = sorted(jug, key=lambda j: -j['rey'])
    chico = ParagraphStyle('ch', parent=E['cuerpo'], fontSize=8.5, leading=11)
    rey_j = [['Jugador', 'Puntos', 'Hoyos ganados (parte del punto si empató)']] + [[j['nombre'], dec(j['rey']), Paragraph(', '.join(f"{h['hoyo']}" + ('' if h['valor'] == 1 else f" ({dec(h['valor'])})") for h in j['reyHoyos']) or '–', chico)] for j in pj if j['rey'] > 0]
    hist += [Paragraph('Rey del Hoyo (skins gross)', E['h1']),
             Paragraph('Cada hoyo vale 1 punto para el menor número de golpes, sin hándicap; los empates se reparten.', E['sub']),
             Table([[tabla(rey_t, [12, 10, 13, 70], 1, False, 2), tabla(rey_j, [38, 16, 90], 1, False, 1)]], colWidths=[110 * mm, 152 * mm],
                   style=[('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0)]), PageBreak()]
    puto = []
    for g in st['grupos']:
        filas = [[f"Grupo {g['grupo']}", 'Puntos']] + [[j['nombre'], dec(j['puntos'])] for j in g['jugadores']]
        unico = len(g['jugadores']) < 2 or g['jugadores'][0]['puntos'] > g['jugadores'][1]['puntos'] + 1e-9
        puto.append(tabla(filas, [44, 18], 1, unico))
    hist += [Paragraph('Puto (grupo neto)', E['h1']),
             Paragraph('Dentro de cada grupo, 1 punto por hoyo al mejor neto; en grupos de 4 cada hoyo vale 4/3 para que valga lo mismo que en uno de 3.', E['sub']),
             Table([puto[i:i + 2] for i in range(0, len(puto), 2)], colWidths=[70 * mm, 70 * mm],
                   style=[('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]),
             PageBreak()]

    # ── 7. resultados por jugador ──
    hist += [Paragraph('Resultados por jugador', E['h1']),
             Paragraph('Cuántos hoyos terminó cada uno en eagle, birdie, par, bogey o doble bogey (golpes reales, sin hándicap).', E['sub']),
             grafico_resultados(st, carpeta), PageBreak()]
    tr = [['Jugador', 'Eagle', 'Birdie', 'Par', 'Bogey', 'Doble+', 'Birdie neto', 'Pts ida', 'Pts vta', 'Gross ida', 'Gross vta']] + [
        [j['nombre'], j['eagle'], j['birdie'], j['par'], j['bogey'], j['doble'], j['netoBirdies'], j['ida'], j['vuelta'], j['grossIda'], j['grossVta']]
        for j in sorted(jug, key=lambda j: [c['pos'] for c in copa if c['id'] == j['id']][0])]
    hist += [Paragraph('Detalle por jugador', E['h1']), Paragraph('Ordenados por puesto en la Copa.', E['sub']),
             tabla(tr, [44, 18, 18, 18, 18, 18, 24, 20, 20, 22, 22], 1, False), PageBreak()]

    # ── 8. por hoyo ──
    th = [['Hoyo', 'Par', 'Yds', 'HCP', 'Promedio', 'Sobre par', 'Birdies', 'Pares', 'Bogeys', 'Dobles+', 'Mejor', 'Peor']] + [
        [h['hoyo'], h['par'], h['yardas'], h['hcp'], dec(h['promedio'], 2), f"+{dec(h['sobrePar'], 2)}" if h['sobrePar'] > 0 else dec(h['sobrePar'], 2),
         h['birdies'], h['pares'], h['bogeys'], h['dobles'], h['mejor'], h['peor']] for h in hs]
    hist += [Paragraph('Dificultad por hoyo', E['h1']),
             Paragraph('Golpes promedio sobre el par de todos los jugadores; más oscuro = más difícil.', E['sub']),
             grafico_hoyos(st, carpeta), PageBreak(),
             Paragraph('Detalle por hoyo', E['h1']), Spacer(1, 2 * mm),
             tabla(th, [14, 12, 14, 12, 20, 20, 18, 16, 18, 18, 16, 16], 1, False), PageBreak()]

    # ── 9. tarjetas de todos ──
    cab = ['#', 'Jugador'] + [str(i) for i in range(1, 19)] + ['Ida', 'Vta', 'Tot']
    filas = [cab, ['', 'Par'] + [str(p) for p in [h['par'] for h in hs]] + [str(sum(h['par'] for h in hs[:9])), str(sum(h['par'] for h in hs[9:])), str(sum(h['par'] for h in hs))]]
    estilo = [('FONT', (0, 0), (-1, 1), 'Helvetica-Bold', 7), ('TEXTCOLOR', (0, 0), (-1, 1), colors.HexColor(GRIS)),
              ('BACKGROUND', (0, 0), (-1, 1), colors.HexColor(FONDO)), ('FONT', (0, 2), (-1, -1), 'Helvetica', 8),
              ('ALIGN', (2, 0), (-1, -1), 'CENTER'), ('LINEBELOW', (0, 0), (-1, -1), 0.4, colors.HexColor(LINEA)),
              ('LINEAFTER', (10, 0), (10, -1), 0.8, colors.HexColor(LINEA)), ('LINEAFTER', (19, 0), (19, -1), 0.8, colors.HexColor(LINEA)),
              ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]
    for r, f in enumerate(copa, start=2):
        j = J[f['id']]
        g = j['golpes']
        filas.append([f['pos'], j['nombre']] + [str(x) if x is not None else '' for x in g] + [str(j['grossIda']), str(j['grossVta']), str(j['gross'])])
        for c, (x, p) in enumerate(zip(g, [h['par'] for h in hs]), start=2):
            if x is None:
                continue
            d = x - p
            k = 'eagle' if d <= -2 else 'birdie' if d == -1 else 'par' if d == 0 else 'bogey' if d == 1 else 'doble'
            if k != 'par':
                estilo.append(('BACKGROUND', (c, r), (c, r), colors.HexColor(RESULTADO[k])))
                estilo.append(('TEXTCOLOR', (c, r), (c, r), colors.white if k in ('eagle', 'birdie', 'doble') else colors.HexColor(TEXTO)))
    t = Table(filas, colWidths=[7 * mm, 34 * mm] + [10 * mm] * 18 + [11 * mm] * 3, repeatRows=2)
    t.setStyle(TableStyle(estilo))
    ley = ' · '.join(f'<font color="{RESULTADO[k]}">■</font> {NOMBRE_RES[k]}' for k in ('eagle', 'birdie', 'bogey', 'doble'))
    hist += [Paragraph('Tarjetas de todos', E['h1']), Paragraph(f'Golpes hoyo a hoyo, ordenados por puesto en la Copa. {ley}', E['sub']), t]

    def pie(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(colors.HexColor(GRIS))
        canvas.drawString(15 * mm, 8 * mm, 'PAICAZO · Estadísticas del campeonato · datos de paicazo.vercel.app')
        canvas.drawRightString(landscape(A4)[0] - 15 * mm, 8 * mm, f'{doc.page}')
        canvas.restoreState()

    SimpleDocTemplate(str(salida), pagesize=landscape(A4), leftMargin=15 * mm, rightMargin=15 * mm, topMargin=13 * mm, bottomMargin=14 * mm,
                      title='PAICAZO · Estadísticas del campeonato', author='PAICAZO').build(hist, onFirstPage=pie, onLaterPages=pie)


if __name__ == '__main__':
    construir(json.loads(Path(sys.argv[1]).read_text(encoding='utf-8')), Path(sys.argv[2]))
    print('ok', sys.argv[2])
