"""python -m pytest tests  (o python tests/test_mapa.py)"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import mapa  # noqa: E402


def test_largo_de_cada_hoyo_calza_con_sus_yardas():
    # el dibujo es fiel al plano: largo trazado ≈ yardas azules × 1,7 px (±15%)
    for n, par, yaz, *_, pts in mapa.HOYOS:
        largo = mapa.acumulado(mapa.catmull(pts))[-1]
        assert abs(largo / (yaz * mapa.PX_YD) - 1) < 0.15, (n, largo, yaz)


def test_pares_suman_35():
    assert sum(h[1] for h in mapa.HOYOS) == 35


def test_curva_pasa_por_tee_y_green():
    pts = [(0, 0), (50, 80), (100, 0)]
    c = mapa.catmull(pts)
    assert c[0] == pts[0] and c[-1] == pts[-1]


def test_dentro_poligono():
    cuadro = [(0, 0), (10, 0), (10, 10), (0, 10)]
    assert mapa.dentro((5, 5), cuadro)
    assert not mapa.dentro((15, 5), cuadro)


def test_svg_completo_bien_formado():
    svg = mapa.generar()
    assert svg.startswith("<svg") and svg.endswith("</svg>")


def test_vista_de_hoyo_girada_tee_abajo_green_arriba():
    for n, *_, pts in mapa.HOYOS:
        ang, c = mapa.giro(pts)
        tee, green = mapa.rotar(pts[0], c, ang), mapa.rotar(pts[-1], c, ang)
        assert abs(tee[0] - green[0]) < 1e-6, n  # misma vertical
        assert tee[1] > green[1], n               # tee abajo


def test_vista_de_hoyo_es_vertical_y_trae_su_numero():
    for n in range(1, 10):
        svg = mapa.generar_hoyo(n)
        w, h = map(float, svg.split('viewBox="')[1].split('"')[0].split()[2:])
        assert h > w * 1.4, (n, w, h)
        assert f">{n}-{n + 9}</text>" in svg


def test_mapa_solo_muestra_numeros_de_hoyo():
    # yardas, par y HCP van en la tabla de la app, no sobre el mapa
    svg = mapa.generar()
    assert "yds" not in svg and "Par " not in svg and "PAICAZO" not in svg
    for n in range(1, 10):
        assert f">{n}-{n + 9}</text>" in svg


def test_numeros_no_se_tocan():
    _, numeros, *_ = mapa.dibujo()
    pos = list(numeros.items())
    for i, (a, (xa, ya)) in enumerate(pos):
        for b, (xb, yb) in pos[i + 1:]:
            separados = abs(xa - xb) > mapa.ETIQ_W + 4 or abs(ya - yb) > mapa.ETIQ_H + 4
            assert separados, (a, b)


if __name__ == "__main__":
    for nombre, f in list(globals().items()):
        if nombre.startswith("test_"):
            f()
    print("ok")
