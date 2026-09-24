"""Muestreo progresivo para H3: los primeros pasos a menor resolucion.

CineConIA no reimplementa SelfLift. Lo llama como nodo instalado
(facok/comfyui-SelfLift, probado en el commit 835c3cf) y aqui solo se decide
la politica: cuantos pasos van a baja resolucion y a que escala. El
repositorio de SelfLift no declara licencia, asi que no se copia su codigo.

Lo que se sabe y lo que falta medir:
- SelfLift ahorra TIEMPO, no VRAM. El pico lo marca el tramo final, que va a
  la resolucion del latente, asi que el semaforo de memoria no cambia.
- El tramo inicial no baja de 384 px de lado corto. Es el tamano que el propio
  SelfLift usa como referencia para H3 (768 -> 384 con escala 0.5), y su
  README advierte que por debajo H3 puede salirse de lo que conoce.
- La mitad de los pasos a baja resolucion es un punto de partida, no un
  benchmark. El paper usa 6 de 8 pasos en modelos de imagen destilados.
- Se usa el escalador latente de H3 con rho=0: la ruta practica que SelfLift
  trae por defecto para H3. No hace falta el VAE en la transicion.
"""

import math
import sys

from .profiles import clamp

SELFLIFT_NODE = "SelfLiftH3Sampler"
SELFLIFT_COMMIT = "835c3cf"
SELFLIFT_REPO = "https://github.com/facok/comfyui-SelfLift"
UPSCALER_HINT = "huggingface.co/LBH-123-AI/Minimax_h3_latent_Upscaler"

MODES = ("Normal", "Progresivo")
VAE_RATIO = 16          # H3: un pixel de latente son 16 pixeles de video
MIN_SHORT_EDGE = 384    # lado corto minimo del tramo inicial en modo guiado
BASE_FRACTION = 0.5     # parte de los pasos a baja resolucion con calidad 70
NO_GAIN_SCALE = 0.9     # desde aqui el tramo inicial casi no ahorra

FALTA_SELFLIFT = (
    "El modo Progresivo necesita SelfLift (facok/comfyui-SelfLift) y no está "
    "instalado o no cargó.\n"
    "Instálalo en ComfyUI/custom_nodes y reinicia ComfyUI:\n"
    "  git clone " + SELFLIFT_REPO + "\n"
    "CineConIA está probado con el commit " + SELFLIFT_COMMIT + ". "
    "O vuelve a muestreo Normal en el Optimizador."
)

FALTA_ESCALADOR = (
    "El modo Progresivo sube la resolución con el escalador latente de H3 y no "
    "hay ninguno en models/latent_upscale_models (se busca un archivo con 'h3' "
    "en el nombre). SelfLift indica descargarlo desde " + UPSCALER_HINT + ". "
    "Ponlo en esa carpeta y reinicia ComfyUI, o vuelve a muestreo Normal."
)


def low_side(pixels, scale):
    """Lado del tramo inicial en pixeles, con el mismo redondeo que SelfLift."""
    latent = max(1, int(pixels) // VAE_RATIO)
    return max(2, round(latent * float(scale) / 2) * 2) * VAE_RATIO


def auto_scale(width, height):
    """Escala mas pequena que deja el lado corto en 384 px o mas; nunca < 0.5."""
    short = min(int(width), int(height))
    if short <= 0:
        return 1.0
    scale = max(0.5, MIN_SHORT_EDGE / float(short))
    return min(1.0, math.ceil(scale * 20 - 1e-9) / 20.0)


def transition_for(steps, quality, mode, advanced_transition):
    """Cuantas evaluaciones van a baja resolucion. Siempre entre 1 y pasos-1."""
    steps = int(steps)
    if mode == "Advanced":
        k = int(advanced_transition)
    else:
        # Mas calidad deja mas pasos a la resolucion final; menos, mas rapido.
        fraction = clamp(BASE_FRACTION - (int(quality) - 70) / 300.0, 0.3, 0.75)
        k = int(round(steps * fraction))
    return int(clamp(k, 1, max(1, steps - 1)))


def detect_environment():
    """Mira lo que ComfyUI ya cargo, sin importar nada nuevo.

    selflift: True/False, o None si no se puede saber (fuera de ComfyUI).
    upscaler: nombre del archivo, "" si se verifico que no hay, None si no se sabe.
    """
    mapping = getattr(sys.modules.get("nodes"), "NODE_CLASS_MAPPINGS", None)
    selflift = (SELFLIFT_NODE in mapping) if isinstance(mapping, dict) else None
    upscaler = None
    folder_paths = sys.modules.get("folder_paths")
    if folder_paths is not None:
        try:
            names = folder_paths.get_filename_list("latent_upscale_models")
            upscaler = next((n for n in names if "h3" in n.lower()), "")
        except Exception:
            upscaler = None
    return {"selflift": selflift, "upscaler": upscaler}


def plan_progressive(requested, mode, width, height, steps, quality=70,
                     advanced_transition=10, advanced_scale=0.0, refine=False,
                     env=None):
    """Politica del modo progresivo. No carga modelos ni toca la GPU.

    advanced_scale solo cuenta en Advanced; 0 significa automatica, igual
    que en los modos guiados.
    """
    plan = {
        "requested": bool(requested), "enabled": False, "status": "OFF",
        "transition_step": 0, "steps": int(steps), "lowres_scale": 1.0,
        "low_width": int(width), "low_height": int(height),
        "sampler": "euler", "rho": 0.0, "upscaler": None, "selflift": None,
        "notes": [],
    }
    if not requested:
        return plan

    env = detect_environment() if env is None else env
    explicit = mode == "Advanced" and float(advanced_scale) > 0
    if explicit:
        scale = round(float(clamp(float(advanced_scale), 0.25, 1.0)), 2)
    else:
        scale = auto_scale(width, height)
    low_w, low_h = low_side(width, scale), low_side(height, scale)
    plan.update(
        enabled=True, status="READY", lowres_scale=scale,
        low_width=low_w, low_height=low_h,
        transition_step=transition_for(steps, quality, mode, advanced_transition),
        upscaler=env.get("upscaler") or None, selflift=env.get("selflift"),
    )
    notes = plan["notes"]

    if int(steps) < 2:
        plan.update(enabled=False, status="NO_APLICA", transition_step=0)
        notes.append("hacen falta al menos 2 pasos")
        return plan
    if not explicit and scale >= NO_GAIN_SCALE:
        plan.update(enabled=False, status="NO_APLICA")
        notes.append("a {}x{} el tramo inicial saldría casi igual de grande; "
                     "el modo progresivo rinde desde ~0.5 MP".format(width, height))
        return plan

    if env.get("selflift") is False:
        plan["status"] = "FALTA_SELFLIFT"
    elif env.get("upscaler") == "":
        plan["status"] = "FALTA_ESCALADOR"
    elif env.get("selflift") is None or env.get("upscaler") is None:
        plan["status"] = "SIN_VERIFICAR"

    if min(low_w, low_h) < MIN_SHORT_EDGE:
        notes.append("tramo inicial de {}x{}: bajo 384 px, fuera de lo probado".format(low_w, low_h))
    if refine:
        notes.append("con segundo pase el video se escala dos veces; pruébalo primero sin él")
    return plan


def describe(plan):
    """Una linea para el info del Optimizador."""
    if not plan.get("requested"):
        return "muestreo: normal"
    if plan["status"] == "NO_APLICA":
        return "muestreo: progresivo no aplica ({}) · se renderiza normal".format(
            "; ".join(plan["notes"]))
    base = "muestreo: progresivo (SelfLift) · {} de {} pasos a {}x{} (x{:.2f}) · euler".format(
        plan["transition_step"], plan["steps"], plan["low_width"], plan["low_height"],
        plan["lowres_scale"])
    extra = {
        "FALTA_SELFLIFT": "falta SelfLift (facok/comfyui-SelfLift)",
        "FALTA_ESCALADOR": "falta el escalador latente H3 en models/latent_upscale_models",
        "SIN_VERIFICAR": "SelfLift sin verificar",
    }.get(plan["status"])
    parts = [base] + ([extra] if extra else []) + list(plan["notes"]) + ["experimental"]
    return " · ".join(parts)


def _compatible_kwargs(cls, kwargs):
    """Filtra a lo que declara el SelfLift instalado y avisa si cambio."""
    spec = cls.INPUT_TYPES()
    required = set(spec.get("required", {}))
    known = required | set(spec.get("optional", {}))
    missing = sorted(required - set(kwargs))
    if missing:
        raise RuntimeError(
            "La versión instalada de SelfLift pide entradas que CineConIA no conoce ({}). "
            "CineConIA está probado con el commit {}.".format(", ".join(missing), SELFLIFT_COMMIT))
    return {k: v for k, v in kwargs.items() if k in known}


def _video_hw(latent):
    samples = latent.get("samples") if isinstance(latent, dict) else None
    tensors = getattr(samples, "tensors", None)
    video = tensors[0] if tensors else samples
    shape = getattr(video, "shape", None)
    if shape is None or len(shape) < 2:
        return None
    return int(shape[-2]), int(shape[-1])


def run_selflift(model, positive, latent, sigmas, seed, plan, call_node, mapping=None):
    """Ejecuta SelfLift con la politica del plan. Devuelve (latent, detalle)."""
    if mapping is None:
        try:
            import nodes as comfy_nodes
            mapping = comfy_nodes.NODE_CLASS_MAPPINGS
        except Exception:
            mapping = {}
    cls = mapping.get(SELFLIFT_NODE)
    if cls is None:
        raise RuntimeError(FALTA_SELFLIFT)

    upscaler = plan.get("upscaler") or detect_environment().get("upscaler")
    if not upscaler:
        raise RuntimeError(FALTA_ESCALADOR)

    sampler = call_node("KSamplerSelect", sampler_name="euler")
    if sampler is None:
        raise RuntimeError("Falta KSamplerSelect del core de ComfyUI")
    # Con cfg 1 el negativo nunca se evalua (igual que BasicGuider), pero
    # SelfLift lo pide: se le da el positivo en cero.
    negative = call_node("ConditioningZeroOut", conditioning=positive) or positive

    last = len(sigmas) - 1
    if last < 2:
        raise RuntimeError("El modo progresivo necesita al menos 2 pasos")
    k = int(clamp(int(plan["transition_step"]), 1, last - 1))
    while k < last - 1 and float(sigmas[k]) >= 1.0:
        k += 1

    kwargs = _compatible_kwargs(cls, dict(
        model=model, positive=positive, negative=negative, vae=None,
        latent_image=latent, sampler=sampler, sigmas=sigmas, seed=int(seed),
        cfg=1.0, transition_step=k, lowres_scale=float(plan["lowres_scale"]),
        rho=0.0, w_min=0.5, w_max=1.0, upscaler_model=upscaler,
        highres_tiling=False, upscaler_unload=True,
    ))
    output = getattr(cls(), cls.FUNCTION)(**kwargs)
    result = output[0] if isinstance(output, (tuple, list)) else output

    hw = _video_hw(latent)
    if hw:
        H, W = hw
        scale = float(plan["lowres_scale"])
        low = (max(2, round(W * scale / 2) * 2) * VAE_RATIO, max(2, round(H * scale / 2) * 2) * VAE_RATIO)
        full = (W * VAE_RATIO, H * VAE_RATIO)
    else:
        low = (plan["low_width"], plan["low_height"])
        full = None
    detail = {"transition_step": k, "steps": last, "low": low, "full": full, "upscaler": upscaler}
    return result, detail
