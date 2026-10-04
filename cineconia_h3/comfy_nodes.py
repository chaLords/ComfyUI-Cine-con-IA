"""Nodos ComfyUI del optimizador y su sampler consumidor."""

import logging
import time

from .optimizer_config import build_optimizer_config
from .profiles import REFINE_STEPS
from .progressive import MODES as SAMPLING_MODES, run_selflift


def _samplers():
    try:
        import comfy.samplers
        values = list(comfy.samplers.KSampler.SAMPLERS)
    except Exception:
        values = []
    if "res_multistep" not in values:
        values.insert(0, "res_multistep")
    if "euler" not in values:
        # el modo progresivo lo necesita; en ComfyUI siempre esta
        values.append("euler")
    return values


def _schedulers():
    try:
        import comfy.samplers
        values = list(comfy.samplers.KSampler.SCHEDULERS)
    except Exception:
        values = []
    if "simple" not in values:
        values.insert(0, "simple")
    return values or ["simple"]


def _unwrap(output):
    if output is None:
        return None
    if isinstance(output, (tuple, list)):
        return output[0] if output else None
    args = getattr(output, "args", None)
    if args:
        return args[0]
    try:
        return output[0]
    except Exception:
        return output


def _call_node(node_id, **kwargs):
    try:
        import nodes as comfy_nodes
        cls = comfy_nodes.NODE_CLASS_MAPPINGS.get(node_id)
    except Exception:
        cls = None
    if cls is None:
        return None
    execute = getattr(cls, "execute", None)
    if execute is not None:
        return _unwrap(execute(**kwargs))
    function = getattr(cls, "FUNCTION", None)
    if function:
        return _unwrap(getattr(cls(), function)(**kwargs))
    return None


class CineH3Optimizer:
    """Detecta el hardware, aplica un perfil y prepara la ejecucion H3."""

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "width": ("INT", {"default": 416, "min": 32, "max": 8192, "step": 32}),
            "height": ("INT", {"default": 736, "min": 32, "max": 8192, "step": 32}),
            "frames": ("INT", {"default": 192, "min": 1, "max": 4096}),
            "modo": (["Auto", "Manual", "Advanced"], {"default": "Auto"}),
            "perfil": (["AUTO", "8 GB", "12 GB", "16 GB", "24 GB", "32 GB"], {"default": "AUTO"}),
            "calidad": ("INT", {"default": 70, "min": 0, "max": 100}),
            "detalle": ("INT", {"default": 65, "min": 0, "max": 100}),
            "movimiento": ("INT", {"default": 65, "min": 0, "max": 100}),
            "resolucion": ("INT", {"default": 60, "min": 0, "max": 100}),
            "refinar": ("BOOLEAN", {"default": True}),
            "ahorro_vram": ("INT", {"default": 50, "min": 0, "max": 100}),
            "pasos_advanced": ("INT", {"default": 20, "min": 1, "max": 100}),
            "sampler_advanced": (_samplers(), {"default": "res_multistep"}),
            "scheduler_advanced": (_schedulers(), {"default": "simple"}),
            "denoise_advanced": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
            "trocear_atencion_advanced": ("INT", {"default": 16, "min": 1, "max": 56}),
            "trocear_ffn_advanced": ("INT", {"default": 16, "min": 1, "max": 64}),
            "escala_refinado_advanced": ("FLOAT", {"default": 1.25, "min": 1.0, "max": 4.0, "step": 0.05}),
            "pasos_refinado_advanced": ([
                "3 pasos  ·  rapido", "4 pasos  ·  recomendado", "5 pasos  ·  maxima calidad"
            ], {"default": "4 pasos  ·  recomendado"}),
        }, "optional": {
            # Al final y opcionales: los workflows guardados antes siguen
            # cargando igual y toman estos valores por defecto.
            "muestreo": (list(SAMPLING_MODES), {
                "default": "Normal",
                "tooltip": "Progresivo: los primeros pasos a menor resolución y el final a la tuya "
                           "(SelfLift). Ahorra tiempo, no VRAM. Experimental."}),
            "transicion_advanced": ("INT", {
                "default": 10, "min": 1, "max": 99,
                "tooltip": "Solo Progresivo: pasos a baja resolución antes de subir a la final."}),
            "escala_inicial_advanced": ("FLOAT", {
                "default": 0.0, "min": 0.0, "max": 1.0, "step": 0.05,
                "tooltip": "Solo Progresivo: escala del tramo inicial. 0 = automática (lado corto "
                           "de 384 px o más); 0.5 = mitad de ancho y de alto."}),
        }}

    RETURN_TYPES = ("CINECONIA_H3_CONFIG", "STRING", "INT", "INT", "BOOLEAN", "FLOAT", REFINE_STEPS, "STRING")
    RETURN_NAMES = ("config", "perfil_activo", "trocear_atencion", "trocear_ffn", "refinar", "escala_refinado", "pasos_refinado", "info")
    FUNCTION = "configurar"
    CATEGORY = "Cine con IA/H3"
    DESCRIPTION = "Perfiles AUTO/8/12/16/24/32 GB, Memory Planner y modos Auto/Manual/Advanced para H3."

    def configurar(self, width, height, frames, modo, perfil, calidad, detalle,
                   movimiento, resolucion, refinar, ahorro_vram,
                   pasos_advanced, sampler_advanced, scheduler_advanced,
                   denoise_advanced, trocear_atencion_advanced,
                   trocear_ffn_advanced, escala_refinado_advanced,
                   pasos_refinado_advanced, muestreo="Normal",
                   transicion_advanced=10, escala_inicial_advanced=0.0):
        config, info = build_optimizer_config(
            modo, perfil, width, height, frames,
            calidad, detalle, movimiento, resolucion, refinar, ahorro_vram,
            pasos_advanced, sampler_advanced, scheduler_advanced,
            denoise_advanced, trocear_atencion_advanced,
            trocear_ffn_advanced, escala_refinado_advanced,
            pasos_refinado_advanced, sampling=muestreo,
            advanced_transition=transicion_advanced,
            advanced_lowres_scale=escala_inicial_advanced,
        )
        return {"ui": {"h3_config": [config], "text": [info]}, "result": (
            config, config["profile"], config["attention_chunks"],
            config["ffn_chunks"], config["refine"], config["refine_scale"],
            config["refine_steps"], info,
        )}


class CineH3OptimizedSampler:
    """Ejecuta el render con la politica producida por Optimizer.

    Normal: un solo tramo con el sampler del perfil. Progresivo: los primeros
    pasos a menor resolucion y el final a la del latente, con SelfLift.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "model": ("MODEL",),
            "positivo": ("CONDITIONING",),
            "latente": ("LATENT",),
            "config": ("CINECONIA_H3_CONFIG",),
            "semilla": ("INT", {"default": 833, "min": 0, "max": 0xffffffffffffffff,
                                "control_after_generate": True}),
        }}

    RETURN_TYPES = ("LATENT", "STRING")
    RETURN_NAMES = ("latent", "info")
    FUNCTION = "render"
    CATEGORY = "Cine con IA/H3"
    DESCRIPTION = ("Sampler H3 compatible con MODEL/CONDITIONING/LATENT y controlado por CineConIA H3 "
                   "Optimizer. En muestreo Progresivo usa SelfLift (instalado aparte).")

    def render(self, model, positivo, latente, config, semilla):
        if not isinstance(config, dict) or config.get("schema") != "cineconia.h3.optimizer/v1":
            raise ValueError("Conecta la salida config de CineConIA H3 Optimizer")
        started = time.perf_counter()
        sigmas = _call_node(
            "BasicScheduler", model=model, scheduler=config["scheduler"],
            steps=int(config["steps"]), denoise=float(config["denoise"]),
        )
        if sigmas is None:
            raise RuntimeError("Faltan los nodos de sampleo avanzado del core de ComfyUI")

        progressive = config.get("progressive") or {}
        if progressive.get("enabled"):
            output, detail = run_selflift(
                model, positivo, latente, sigmas, int(semilla), progressive, _call_node)
            elapsed = time.perf_counter() - started
            low_w, low_h = detail["low"]
            final = "{}x{}".format(*detail["full"]) if detail["full"] else "resolución del latente"
            info = (
                "{} · progresivo SelfLift · {} de {} pasos a {}x{} -> {} · euler / {} · "
                "semilla {} · {:.0f} s · Memory Planner {}"
                .format(config["profile"], detail["transition_step"], detail["steps"],
                        low_w, low_h, final, config["scheduler"], semilla, elapsed,
                        config["planner"]["status"]))
            summary = {"mode": "progresivo", "seconds": round(elapsed, 1),
                       "transition_step": detail["transition_step"], "steps": detail["steps"],
                       "low": [low_w, low_h], "full": list(detail["full"]) if detail["full"] else None,
                       "sampler": "euler", "scheduler": config["scheduler"], "seed": int(semilla)}
        else:
            sampler = _call_node("KSamplerSelect", sampler_name=config["sampler"])
            guider = _call_node("BasicGuider", model=model, conditioning=positivo)
            noise = _call_node("RandomNoise", noise_seed=int(semilla))
            if sampler is None or guider is None or noise is None:
                raise RuntimeError("Faltan los nodos de sampleo avanzado del core de ComfyUI")
            output = _call_node(
                "SamplerCustomAdvanced", noise=noise, guider=guider,
                sampler=sampler, sigmas=sigmas, latent_image=latente,
            )
            if output is None:
                raise RuntimeError("El sampleo optimizado H3 fallo")
            elapsed = time.perf_counter() - started
            info = (
                "{} · {} pasos · {} / {} · semilla {} · {:.0f} s · Memory Planner {}"
                .format(config["profile"], config["steps"], config["sampler"],
                        config["scheduler"], semilla, elapsed, config["planner"]["status"])
            )
            summary = {"mode": "normal", "seconds": round(elapsed, 1), "steps": int(config["steps"]),
                       "sampler": config["sampler"], "scheduler": config["scheduler"],
                       "seed": int(semilla)}
        logging.info("[Cine con IA] Render optimizado H3: %s", info)
        return {"ui": {"text": [info], "h3_render": [summary]}, "result": (output, info)}
