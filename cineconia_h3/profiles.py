"""Perfiles conservadores para el primer prototipo del optimizador H3.

Los valores describen una politica, no un benchmark. Se mantienen separados
del nodo para poder afinarlos sin cambiar su interfaz ni los workflows.

Los pasos de denoising NO dependen de la VRAM y por eso valen igual en todos
los perfiles. Los pasos son secuenciales: el pico de memoria lo marca una
pasada, no cuantas se hagan. Una tarjeta de 8 GB puede dar 30 pasos igual que
una de 32, solo que tarda mas. Lo que si cambia con la VRAM es el troceo, si
hay segundo pase y con que escala. Los pasos los decide el usuario con el
control de calidad.

ESCALERA. La escala del segundo pase crece con la tarjeta de modo que la
carga de referencia (416x736x192, ajustes guiados por defecto) sube ~1.3x
por escalon. Junto con CAPACITY de memory_planner.py eso garantiza que el
preset de tu GPU (y los menores) queden en MARGEN, el de un escalon arriba
en JUSTO y los de dos o mas en RIESGO. test_h3_ladder.py lo comprueba.
"""

from copy import deepcopy
import math

REFINE_STEPS = ["3 pasos  ·  rapido", "4 pasos  ·  recomendado", "5 pasos  ·  maxima calidad"]


PROFILE_NAMES = ("8 GB", "12 GB", "16 GB", "24 GB", "32 GB")

PROFILES = {
    "8 GB": {
        "steps": 20,
        "sampler": "res_multistep",
        "scheduler": "simple",
        "denoise": 1.0,
        "attention_chunks": 32,
        "ffn_chunks": 32,
        "refine": False,
        "refine_scale": 1.0,
        "refine_steps": "3 pasos  ·  rapido",
        "policy": "supervivencia: troceo maximo y sin segundo pase por defecto",
    },
    "12 GB": {
        "steps": 20,
        "sampler": "res_multistep",
        "scheduler": "simple",
        "denoise": 1.0,
        "attention_chunks": 24,
        "ffn_chunks": 24,
        "refine": True,
        "refine_scale": 1.13,
        "refine_steps": "3 pasos  ·  rapido",
        "policy": "ahorro alto y segundo pase moderado",
    },
    "16 GB": {
        "steps": 20,
        "sampler": "res_multistep",
        "scheduler": "simple",
        "denoise": 1.0,
        "attention_chunks": 20,
        "ffn_chunks": 20,
        "refine": True,
        "refine_scale": 1.27,
        "refine_steps": "4 pasos  ·  recomendado",
        "policy": "equilibrado: calidad y margen de memoria",
    },
    "24 GB": {
        "steps": 20,
        "sampler": "res_multistep",
        "scheduler": "simple",
        "denoise": 1.0,
        "attention_chunks": 16,
        "ffn_chunks": 16,
        "refine": True,
        "refine_scale": 1.44,
        "refine_steps": "4 pasos  ·  recomendado",
        "policy": "calidad: segundo pase conservando margen",
    },
    "32 GB": {
        "steps": 20,
        "sampler": "res_multistep",
        "scheduler": "simple",
        "denoise": 1.0,
        "attention_chunks": 8,
        "ffn_chunks": 8,
        "refine": True,
        "refine_scale": 1.60,
        "refine_steps": "5 pasos  ·  maxima calidad",
        "policy": "calidad alta y troceo minimo",
    },
}


def closest_profile(vram_gb):
    """Devuelve el perfil nominal que no supera la VRAM detectada."""
    try:
        value = float(vram_gb)
    except (TypeError, ValueError):
        return "8 GB"
    if not math.isfinite(value):
        return "8 GB"
    selected = "8 GB"
    for name in PROFILE_NAMES:
        if value >= int(name.split()[0]) - 0.25:
            selected = name
    return selected


def get_profile(name):
    if name not in PROFILES:
        name = "16 GB"
    return deepcopy(PROFILES[name])


def previous_profile(name):
    try:
        index = PROFILE_NAMES.index(name)
    except ValueError:
        return "16 GB"
    return PROFILE_NAMES[max(0, index - 1)]


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))
