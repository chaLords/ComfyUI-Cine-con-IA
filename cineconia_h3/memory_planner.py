"""Planificador heuristico y explicable para cargas H3."""

from .profiles import clamp


# Capacidad relativa de cada tarjeta, en la misma unidad que la carga.
#
# No es una medicion: es la definicion de politica "el preset de cada tarjeta
# usa ~70 % de su capacidad a la carga de referencia". Se obtiene dividiendo la
# carga de referencia de cada preset (ver profiles.py) por 0.70.
#
# Datos medidos que la tabla respeta (RTX 4060 Ti, 16 GB):
#  - 033 v2: 416x736x192, segundo pase x2.0, SIN troceo -> OOM, pico 20.9 GB.
#    Aqui da 4.0 / 2.14 = 1.87, RIESGO.
#  - 038: 480x832x192, sin segundo pase, troceo 16/16 -> renderiza.
#    Aqui da 1.30 / 2.14 = 0.61, MARGEN.
#  - 043 A: 416x736x124, segundo pase x1.27, troceo 32/32 -> renderiza
#    (~115 s por paso de refinado). Aqui da 0.95 / 2.14 = 0.44, MARGEN.
#  - 043 B: 416x736x124, segundo pase x2.0, troceo 32/32 -> no da OOM pero el
#    refinado queda casi detenido (mas de 15 min sin terminar el primer paso,
#    dos veces). Aqui da 2.35 / 2.14 = 1.10, RIESGO. Con la politica anterior
#    (63 %, capacidad 2.38) salia JUSTO: por eso se subio al 70 %.
# 8, 12, 24 y 32 GB siguen sin benchmark propio.
CAPACITY = {
    "8 GB": 1.28,
    "12 GB": 1.67,
    "16 GB": 2.14,
    "24 GB": 2.82,
    "32 GB": 3.66,
}


def plan_memory(width, height, frames, profile_name, refine, refine_scale,
                quality=70, detail=65, motion=65, vram_save=50,
                attention_chunks=16, ffn_chunks=16):
    """Clasifica la solicitud sin prometer una cantidad exacta de VRAM.

    La unidad de carga es relativa a 416x736x192, la configuracion medida del
    workflow 038. La formula solo decide politica; no presenta GB estimados.
    """
    width = max(32, int(width))
    height = max(32, int(height))
    frames = max(1, int(frames))
    base = (width * height) / float(416 * 736) * (frames / 192.0)
    # Sequential passes do not coexist. Model the larger activation footprint.
    # Chunking only reduces part of that footprint; weights/latents still exist.
    peak = base * (max(1.0, float(refine_scale)) ** 2 if refine else 1.0)
    chunks = min(clamp(int(attention_chunks), 1, 56), clamp(int(ffn_chunks), 1, 64))
    saving = 0.82 + 0.18 * min(1.0, 16.0 / chunks)
    load = peak * saving
    ratio = load / CAPACITY.get(profile_name, CAPACITY["16 GB"])
    if ratio <= 0.76:
        status = "SAFE"
    elif ratio <= 1.0:
        status = "TIGHT"
    else:
        status = "RISKY"

    recommendations = []
    if status in ("TIGHT", "RISKY"):
        recommendations.append("aumentar troceo de atención/FFN" if chunks < 32
                               else "reducir duración o resolución inicial")
    if status == "RISKY" and refine:
        recommendations.append("reducir escala del segundo pase o apagarlo")
    if status == "RISKY" and (width * height) > (416 * 736):
        recommendations.append("probar menor resolución inicial sin cambiar la salida final deseada")
    if not recommendations:
        recommendations.append("mantener los valores del perfil")

    return {
        "status": status,
        "relative_load": round(load, 3),
        "capacity_ratio": round(ratio, 3),
        "recommendations": recommendations,
        "experimental": True,
        "reference": "416x736x192 = carga relativa de referencia",
    }
