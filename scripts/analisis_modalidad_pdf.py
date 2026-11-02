"""PDF "¿Fue justa la modalidad?": hándicap vs resultados, slope/rating y diez modalidades simuladas con los scores reales.

Entrada: el JSON de scripts/simular_modalidades.mjs. Usa los mismos colores y formatos que scripts/estadisticas_pdf.py.
Uso: python scripts/analisis_modalidad_pdf.py <modalidades.json> <salida.pdf>
"""
import json
import sys
import tempfile
from pathlib import Path

import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

sys.path.insert(0, str(Path(__file__).resolve().parent))
from estadisticas_pdf import FONDO, GRIS, LIMA, LINEA, RAIZ, TEXTO, VERDE, VERDE2, dec, figura  # noqa: E402

E = {
    'titulo': ParagraphStyle('t', fontName='Helvetica-Bold', fontSize=24, leading=28, textColor=colors.HexColor(VERDE)),
    'h1': ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=colors.HexColor(TEXTO), spaceAfter=2),
    'h2': ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=11.5, leading=15, textColor=colors.HexColor(TEXTO), spaceBefore=4, spaceAfter=3),
    'sub': ParagraphStyle('s', fontName='Helvetica', fontSize=9.5, leading=13, textColor=colors.HexColor(GRIS), spaceAfter=8),
    'cuerpo': ParagraphStyle('c', fontName='Helvetica', fontSize=9.5, leading=13.5, textColor=colors.HexColor(TEXTO)),
    'chico': ParagraphStyle('ch', fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor(TEXTO)),
    'kpi': ParagraphStyle('k', fontName='Helvetica-Bold', fontSize=17, leading=21, alignment=TA_CENTER, textColor=colors.HexColor(TEXTO)),
    'kpil': ParagraphStyle('kl', fontName='Helvetica', fontSize=8, leading=10.5, alignment=TA_CENTER, textColor=colors.HexColor(GRIS)),
}


def tabla(datos, anchos, num=(), destacar=None, extra=()):
    t = Table(datos, colWidths=[a * mm for a in anchos], repeatRows=1)
    estilo = [('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 7.5), ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor(GRIS)),
              ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(FONDO)), ('FONT', (0, 1), (-1, -1), 'Helvetica', 9),
              ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor(TEXTO)), ('LINEBELOW', (0, 0), (-1, -1), 0.4, colors.HexColor(LINEA)),
              ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]
    estilo += [('ALIGN', (c, 0), (c, -1), 'RIGHT') for c in num]
    if destacar is not None:
        estilo += [('BACKGROUND', (0, destacar), (-1, destacar), colors.HexColor('#EEF6E2')), ('FONT', (0, destacar), (-1, destacar), 'Helvetica-Bold', 9)]
    t.setStyle(TableStyle(estilo + list(extra)))
    return t


def cajas(items):
    t = Table([[Paragraph(v, E['kpi']) for v, _ in items], [Paragraph(l, E['kpil']) for _, l in items]], colWidths=[262 / len(items) * mm] * len(items))
    t.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor(LINEA)), ('LINEAFTER', (0, 0), (-2, -1), 0.6, colors.HexColor(LINEA)),
                           ('TOPPADDING', (0, 0), (-1, 0), 9), ('BOTTOMPADDING', (0, 1), (-1, 1), 9)]))
    return t


def puntos(textos):
    out = []
    for t in textos:
        out += [Paragraph('• ' + t, E['cuerpo']), Spacer(1, 1.8 * mm)]
    return out


def pendiente(jug):
    """Golpes netos sobre el par que suma cada punto de índice (recta de mínimos cuadrados)."""
    xs, ys = [j['indice'] for j in jug], [j['netoSobrePar'] for j in jug]
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)


def grafico_dispersion(jug, carpeta):
    """Índice vs golpes netos sobre el par: sobre la línea punteada = jugó peor que su hándicap."""
    fig, ax = plt.subplots(figsize=(7.2, 4.6))
    xs, ys = [j['indice'] for j in jug], [j['netoSobrePar'] for j in jug]
    ax.scatter(xs, ys, s=46, color=VERDE2, edgecolor='white', linewidth=1.2, zorder=3)
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    ax.plot([min(xs), max(xs)], [my + b * (min(xs) - mx), my + b * (max(xs) - mx)], color=GRIS, lw=1, ls='--', zorder=2)
    for j in jug:
        dx, dy = {'M Covarrubias': (-8, -11), 'M Undurraga': (5, -10), 'S Molina': (5, -9)}.get(j['nombre'], (5, 4))  # etiquetas que se tocan
        ax.annotate(j['nombre'], (j['indice'], j['netoSobrePar']), xytext=(dx, dy), textcoords='offset points', fontsize=7.5, color=TEXTO,
                    ha='right' if dx < 0 else 'left')
    ax.set_xlabel('Índice')
    ax.set_ylabel('Golpes netos sobre el par (gross − HCP − 70)')
    ax.grid(color=LINEA, lw=0.6)
    ax.set_axisbelow(True)
    return figura(fig, 'dispersion', carpeta, 150)


def construir(d, salida):
    carpeta = Path(tempfile.mkdtemp())
    esc = {e['letra']: e for e in d['escenarios']}
    actual = esc['A']['filas']
    gana = {e['letra']: e['filas'][0]['nombre'] for e in d['escenarios']}
    nombres_ganadores = {}
    for l, n in gana.items():
        nombres_ganadores.setdefault(n, []).append(l)
    jug = d['jugadores']
    altos = [j for j in jug if j['indice'] >= 22]
    resto = [j for j in jug if j['indice'] < 22]
    prom = lambda xs: sum(xs) / len(xs)  # noqa: E731

    h = []
    # ── 1. portada y respuesta corta ──
    logo = RAIZ / 'public' / 'logo.png'
    h += [Table([[Image(str(logo), width=30 * mm, height=30 * mm) if logo.exists() else '',
                  [Paragraph('¿Fue justa la modalidad?', E['titulo']),
                   Paragraph('PAICAZO · análisis del formato con los scores reales del campeonato', E['h2']),
                   Paragraph('Mismos golpes de todos, distintas formas de sumar los juegos. Todo calculado con el motor de la app.', E['sub'])]]],
                colWidths=[36 * mm, 226 * mm], style=[('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]), Spacer(1, 5 * mm)]
    orden_g = sorted(nombres_ganadores.items(), key=lambda kv: -len(kv[1]))
    h.append(cajas([(n, f"Campeón en {len(ls)} de {len(esc)} modalidades ({', '.join(ls)})") for n, ls in orden_g]))
    h += [Spacer(1, 6 * mm), Paragraph('La respuesta corta', E['h1'])]
    h += puntos([
        'La <b>Copa</b> (Stableford neto) fue justa: los 6 mejores van de índice 2,7 a 18,1 y la ganó un índice 18.',
        'El <b>General</b> lo decidieron los bonus: S Molina ganó la Copa pero quedó 5º en el General.',
        'El <b>Rey del Hoyo en gross</b> favorece claramente a los hándicaps bajos; el <b>Puto</b> escalado en grupos de 4 '
        'amplifica la suerte del grupo que te tocó, y fue lo que definió al campeón General.',
        'Los hándicaps altos (22 o más) quedaron abajo en todas las modalidades porque jugaron más lejos de su hándicap, no por el formato.',
        '<b>Recomendación:</b> que el campeón sea el de la Copa y que Rey y Puto sean premios aparte; si se mantiene el General, '
        'Rey del Hoyo en neto y grupos del mismo tamaño.',
    ])
    h.append(Paragraph('Ojo: son 14 jugadores y una sola vuelta; hay mucho azar. Son tendencias, no pruebas.', E['sub']))
    h.append(PageBreak())

    # ── 2. cada juego frente al hándicap ──
    lect = {'Copa (Stableford neto)': 'Moderada: el podio es variado (índices 18, 12,6 y 2,7).',
            'Rey del Hoyo (gross)': 'Fuerte: premia al de hándicap bajo (P Mingo, 2,7, sacó 4,59 de 18).',
            'Puto (grupo neto)': 'Débil: depende mucho del grupo que te toca.',
            'General': 'Los bonus amplifican la ventaja de los hándicaps bajos.'}
    tj = [['Juego', 'Relación con el índice', 'Por orden', 'Lectura']] + [
        [j['nombre'], dec(round(j['pearson'], 2), 2), dec(round(j['spearman'], 2), 2), Paragraph(lect.get(j['nombre'], ''), E['chico'])] for j in d['juegos']]
    h += [Paragraph('Cada juego frente al hándicap', E['h1']),
          Paragraph('Correlación entre el índice y lo que sacó cada uno: negativo = a menor índice, más puntos; cerca de 0 = parejo.', E['sub']),
          tabla(tj, [55, 38, 26, 143], num=(1, 2)), Spacer(1, 5 * mm)]
    txt = [Paragraph('¿Por qué quedaron abajo los hándicaps altos?', E['h2'])] + puntos([
        f"Los de índice 22 o más jugaron en promedio <b>+{dec(round(prom([j['netoSobrePar'] for j in altos]), 1), 1)}</b> golpes netos sobre el par; "
        f"el resto, <b>+{dec(round(prom([j['netoSobrePar'] for j in resto]), 1), 1)}</b>.",
        f"El mejor de ellos en la Copa fue {min(altos, key=lambda j: j['posCopa'])['nombre']} ({min(j['posCopa'] for j in altos)}º).",
        'Es lo esperable en golf: los hándicaps altos tienen más variación hoyo a hoyo y en una sola vuelta les cuesta más jugar a su hándicap.',
        'El gráfico muestra cada jugador: los que están más arriba jugaron peor respecto de su hándicap.',
        f"La línea punteada es la tendencia: cada punto de índice sumó en promedio <b>+{dec(round(pendiente(jug), 2), 2)}</b> golpes netos sobre el par."])
    h.append(Table([[grafico_dispersion(jug, carpeta), txt]], colWidths=[156 * mm, 106 * mm], style=[('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    h.append(PageBreak())

    # ── 3. slope y rating ──
    ts = [['Escenario', 'Slope', 'Rating', 'Podio de la Copa', 'Podio del General', 'Índice 22+ en la Copa']]
    idx = {j['id']: j['indice'] for j in jug}
    for s in d['slopes']:
        ts.append([s['nombre'], s['slope'], dec(s['rating'], 1),
                   Paragraph(' · '.join(f"{f['pos']}. {f['nombre']} ({f['puntos']})" for f in s['copa'][:3]), E['chico']),
                   Paragraph(' · '.join(f"{f['pos']}. {f['nombre']} ({dec(round(f['total'], 1), 1)})" for f in s['general'][:3]), E['chico']),
                   Paragraph(', '.join(f"{f['nombre']} {f['pos']}º" for f in s['copa'] if idx[f['id']] >= 22), E['chico'])])
    h += [Paragraph('¿Y si el slope y el rating fueran los reales?', E['h1']),
          Paragraph('La app usó slope 113 y rating 70 (la tarjeta no los trae). Simulé valores realistas para una cancha de 6.454 yardas par 70.', E['sub']),
          tabla(ts, [32, 16, 16, 66, 66, 66], num=(1, 2)), Spacer(1, 5 * mm)]
    h += puntos(['<b>El podio de la Copa no cambia.</b> Todos reciben más golpes, pero en proporción, y el orden se mantiene.',
                 'Usar el slope y el rating reales es lo correcto, pero no habría cambiado el resultado de este campeonato.'])
    h.append(PageBreak())

    # ── 4. diez modalidades ──
    tm = [['', 'Modalidad', 'Cómo se suma', 'Campeón', '2º', '3º', 'Sesgo']]
    for e in d['escenarios']:
        f = e['filas']
        tm.append([e['letra'], e['nombre'], Paragraph(e['descripcion'], E['chico']),
                   f"{f[0]['nombre']} ({dec(round(f[0]['total'], 1), 1)})", f[1]['nombre'], f[2]['nombre'], dec(round(e['sesgo'], 2), 2)])
    h += [Paragraph('Diez modalidades con los mismos golpes', E['h1']),
          Paragraph('Sesgo = correlación entre índice y puesto: 0 = parejo, +1 = ganan siempre los de índice bajo.', E['sub']),
          tabla(tm, [8, 30, 92, 46, 30, 30, 18], num=(6,), destacar=1), PageBreak()]

    # ── 5. matriz de puestos ──
    letras = [e['letra'] for e in d['escenarios']]
    cab = ['Jugador', 'Índ'] + [f"{e['letra']}\n{e['nombre']}" for e in d['escenarios']]
    filas = [cab]
    extra = [('ALIGN', (1, 0), (-1, -1), 'CENTER'), ('FONT', (2, 0), (-1, 0), 'Helvetica-Bold', 6.8)]
    pos = {e['letra']: {f['id']: f['pos'] for f in e['filas']} for e in d['escenarios']}
    for r, f in enumerate(actual, start=1):
        fila = [f['nombre'], dec(idx[f['id']], 1)]
        for c, l in enumerate(letras, start=2):
            p = pos[l][f['id']]
            fila.append(str(p))
            if p == 1:
                extra += [('BACKGROUND', (c, r), (c, r), colors.HexColor(VERDE2)), ('TEXTCOLOR', (c, r), (c, r), colors.white),
                          ('FONT', (c, r), (c, r), 'Helvetica-Bold', 9)]
            elif p <= 3:
                extra += [('BACKGROUND', (c, r), (c, r), colors.HexColor('#DCEBCB'))]
        filas.append(fila)
    h += [Paragraph('Puesto de cada jugador en cada modalidad', E['h1']),
          Paragraph('Verde oscuro = campeón; verde claro = 2º o 3º. Ordenados por el resultado real (modalidad A).', E['sub']),
          tabla(filas, [36, 14] + [21.2] * len(letras), extra=extra), PageBreak()]

    # ── 6. lo que muestran y recomendación ──
    mc = next(f for f in esc['A']['filas'] if f['pos'] == 1)
    d3 = esc['D']['filas']
    h += [Paragraph('Lo que muestran las simulaciones', E['h1']), Spacer(1, 2 * mm)]
    h += puntos([
        f"<b>Darle más puntos al Rey del Hoyo no cambia al ganador</b>, pero acerca a P Mingo: con el Rey ×3 queda a "
        f"{dec(round(d3[0]['total'] - d3[1]['total'], 1), 1)} puntos. Con ×4 probablemente ganaría él. El Rey en gross premia casi solo al hándicap bajo.",
        f"<b>El Rey en neto es el ajuste más parejo:</b> con doble puntaje sube A Guzmán (18,1) al 2º y es la única modalidad que baja el sesgo "
        f"(de {dec(round(esc['A']['sesgo'], 2), 2)} a {dec(round(esc['F']['sesgo'], 2), 2)}).",
        f"<b>Lo que decidió el General fue el Puto, no el Rey.</b> {mc['nombre']} jugó en un grupo de 4, donde cada hoyo vale ×4/3, y sacó "
        f"{dec(round(mc['puto'], 2), 2)} (el máximo). Sin el Puto, o sin esa escala, gana P Mingo. La escala iguala el promedio entre grupos, "
        "pero agranda la suerte de quien gana muchos hoyos en un grupo de 4.",
        '<b>El hándicap al 100% no cambia nada arriba.</b>',
        f"<b>Solo con la Copa gana {esc['B']['filas'][0]['nombre']}</b>, el mejor en el juego principal, que quedó 5º en el General actual.",
        f"<b>El sesgo hacia los hándicaps bajos es casi igual en todas</b> (alrededor de {dec(round(esc['A']['sesgo'], 2), 2)}): viene de cómo jugó cada uno en la Copa, no de los bonus.",
    ])
    h += [Spacer(1, 4 * mm), Paragraph('Recomendación para el próximo PAICAZO', E['h1']), Spacer(1, 2 * mm)]
    rec = Table([[Paragraph('<b>1. Lo más limpio</b><br/>El campeón es el de la Copa. Rey del Hoyo y Puto quedan como premios aparte, '
                            'sin sumarse. El juego principal no lo dan vuelta los bonus.', E['cuerpo']),
                  Paragraph('<b>2. Si se mantiene el General</b><br/>Rey del Hoyo en <b>neto</b> y Puto con <b>todos los grupos del mismo tamaño</b> '
                            '(de 3, sin escala) o con la mitad del peso. Así no depende del grupo que te tocó.', E['cuerpo']),
                  Paragraph('<b>3. Ajustes menores</b><br/>Conseguir el slope y el rating reales de la salida azul, y considerar el 100% del '
                            'hándicap. No habrían cambiado este resultado, pero son lo correcto.', E['cuerpo'])]],
                colWidths=[87 * mm] * 3)
    rec.setStyle(TableStyle([('BOX', (0, 0), (0, 0), 1.2, colors.HexColor(LIMA)), ('BOX', (1, 0), (1, 0), 0.6, colors.HexColor(LINEA)),
                             ('BOX', (2, 0), (2, 0), 0.6, colors.HexColor(LINEA)), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                             ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8), ('LEFTPADDING', (0, 0), (-1, -1), 8),
                             ('RIGHTPADDING', (0, 0), (-1, -1), 8), ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F4FAEC'))]))
    h.append(rec)

    def pie(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(colors.HexColor(GRIS))
        canvas.drawString(15 * mm, 8 * mm, 'PAICAZO · ¿Fue justa la modalidad? · simulaciones con los scores reales')
        canvas.drawRightString(landscape(A4)[0] - 15 * mm, 8 * mm, f'{doc.page}')
        canvas.restoreState()

    SimpleDocTemplate(str(salida), pagesize=landscape(A4), leftMargin=15 * mm, rightMargin=15 * mm, topMargin=13 * mm, bottomMargin=14 * mm,
                      title='PAICAZO · ¿Fue justa la modalidad?', author='PAICAZO').build(h, onFirstPage=pie, onLaterPages=pie)


if __name__ == '__main__':
    construir(json.loads(Path(sys.argv[1]).read_text(encoding='utf-8')), Path(sys.argv[2]))
    print('ok', sys.argv[2])
