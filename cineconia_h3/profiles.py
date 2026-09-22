"""Perfiles conservadores para el primer prototipo del optimizador H3.

Los valores describen una politica, no un benchmark. Se mantienen separados
del nodo para poder afinarlos sin cambiar su interfaz ni los workflows.
"""

from copy import deepcopy


PROFILE_NAMES = ("8 GB", "12 GB", "16 GB", "24 GB", "32 GB")

PROFILES = {
    "8 GB": {
        "steps": 10,
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
        "steps": 14,
        "sampler": "res_multistep",
        "scheduler": "simple",
        "denoise": 1.0,
        "attention_chunks": 24,
        "ffn_chunks": 24,
        "refine": True,
        "refine_scale": 1.15,
        "refine_steps": "3 pasos  ·  rapido",
        "policy": "ahorro alto y segundo pase moderado",
    },
    "16 GB": {
        "steps": 16,
        "sampler": "res_multistep",
        "scheduler": "simple",
        "denoise": 1.0,
        "attention_chunks": 20,
        "ffn_chunks": 20,
        "refine": True,
        "refine_scale": 1.20,
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
        "refine_scale": 1.25,
        "refine_steps": "4 pasos  ·  recomendado",
        "policy": "calidad: segundo pase conservando margen",
    },
    "32 GB": {
        "steps": 24,
        "sampler": "res_multistep",
        "scheduler": "simple",
        "denoise": 1.0,
        "attention_chunks": 8,
        "ffn_chunks": 8,
        "refine": True,
        "refine_scale": 1.50,
        "refine_steps": "5 pasos  ·  maxima calidad",
        "policy": "calidad alta y troceo minimo",
    },
}


def closest_profile(vram_gb):
    """Devuelve el perfil nominal que no supera la VRAM detectada."""
    try:
        value = float(vram_gb)
    except (TypeError, ValueError):
        return "16 GB"
    selected = "8 GB"
    for name in PROFILE_NAMES:
        if value >= int(name.split()[0]):
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
