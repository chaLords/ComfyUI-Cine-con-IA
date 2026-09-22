"""Planificador heuristico y explicable para cargas H3."""

from .profiles import clamp


CAPACITY = {
    "8 GB": 0.75,
    "12 GB": 1.10,
    "16 GB": 1.55,
    "24 GB": 2.45,
    "32 GB": 3.35,
}


def plan_memory(width, height, frames, profile_name, refine, refine_scale,
                quality=70, detail=65, motion=65, vram_save=50):
    """Clasifica la solicitud sin prometer una cantidad exacta de VRAM.

    La unidad de carga es relativa a 416x736x192, la configuracion medida del
    workflow 038. La formula solo decide politica; no presenta GB estimados.
    """
    width = max(32, int(width))
    height = max(32, int(height))
    frames = max(1, int(frames))
    base = (width * height) / float(416 * 736) * (frames / 192.0)
    controls = (
        0.72
        + clamp(float(quality), 0, 100) / 260.0
        + clamp(float(detail), 0, 100) / 420.0
        + clamp(float(motion), 0, 100) / 700.0
    )
    second_pass = 0.0
    if refine:
        second_pass = base * max(1.0, float(refine_scale)) ** 2 * 0.34
    saving = 1.0 - (clamp(float(vram_save), 0, 100) / 100.0) * 0.18
    load = (base * controls + second_pass) * saving
    ratio = load / CAPACITY.get(profile_name, CAPACITY["16 GB"])
    if ratio <= 0.76:
        status = "SAFE"
    elif ratio <= 1.0:
        status = "TIGHT"
    else:
        status = "RISKY"

    recommendations = []
    if status in ("TIGHT", "RISKY"):
        recommendations.append("aumentar troceo de atencion/FFN")
    if status == "RISKY" and refine:
        recommendations.append("reducir escala del segundo pase o apagarlo")
    if status == "RISKY" and (width * height) > (416 * 736):
        recommendations.append("probar menor resolucion inicial sin cambiar la salida final deseada")
    if not recommendations:
        recommendations.append("mantener los valores del perfil")

    return {
        "status": status,
        "relative_load": round(load, 3),
        "capacity_ratio": round(ratio, 3),
        "recommendations": recommendations,
        "reference": "416x736x192 = carga relativa de referencia",
    }
