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


def test_svg_trae_vista_por_hoyo():
    svg = mapa.generar()
    for n in range(1, 10):
        assert f'<view id="h{n}"' in svg
    assert svg.startswith("<svg") and svg.endswith("</svg>")


if __name__ == "__main__":
    for nombre, f in list(globals().items()):
        if nombre.startswith("test_"):
            f()
    print("ok")
