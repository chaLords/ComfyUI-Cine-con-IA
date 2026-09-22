"""Construccion de la configuracion consumida por el sampler H3."""

from .hardware import detect_hardware, select_auto_profile
from .memory_planner import plan_memory
from .profiles import PROFILE_NAMES, clamp, get_profile


MODES = ("Auto", "Manual", "Advanced")


def _steps_label(detail):
    if detail >= 82:
        return "5 pasos  ·  maxima calidad"
    if detail >= 48:
        return "4 pasos  ·  recomendado"
    return "3 pasos  ·  rapido"


def build_optimizer_config(
        mode, profile, width, height, frames,
        quality=70, detail=65, motion=65, resolution=60,
        refine=True, vram_save=50,
        advanced_steps=20, advanced_sampler="res_multistep",
        advanced_scheduler="simple", advanced_denoise=1.0,
        advanced_attention_chunks=16, advanced_ffn_chunks=16,
        advanced_refine_scale=1.25,
        advanced_refine_steps="4 pasos  ·  recomendado",
        hardware=None):
    mode = mode if mode in MODES else "Auto"
    hardware = hardware or detect_hardware()
    if mode == "Auto":
        profile_name, selection_note = select_auto_profile(hardware)
    else:
        profile_name = profile if profile in PROFILE_NAMES else "16 GB"
        selection_note = "perfil elegido manualmente"

    values = get_profile(profile_name)
    quality = int(clamp(int(quality), 0, 100))
    detail = int(clamp(int(detail), 0, 100))
    motion = int(clamp(int(motion), 0, 100))
    resolution = int(clamp(int(resolution), 0, 100))
    vram_save = int(clamp(int(vram_save), 0, 100))

    if mode == "Advanced":
        values.update({
            "steps": int(clamp(int(advanced_steps), 1, 100)),
            "sampler": str(advanced_sampler),
            "scheduler": str(advanced_scheduler),
            "denoise": float(clamp(float(advanced_denoise), 0.0, 1.0)),
            "attention_chunks": int(clamp(int(advanced_attention_chunks), 1, 64)),
            "ffn_chunks": int(clamp(int(advanced_ffn_chunks), 1, 64)),
            "refine": bool(refine),
            "refine_scale": float(clamp(float(advanced_refine_scale), 1.0, 4.0)),
            "refine_steps": str(advanced_refine_steps),
        })
    else:
        values["steps"] = int(clamp(values["steps"] + round((quality - 60) / 10), 4, 30))
        values["refine"] = bool(refine)
        if values["refine"]:
            # El control Resolucion afecta solo al multiplicador del segundo
            # pase. Nunca cambia silenciosamente width/height solicitados.
            values["refine_scale"] = round(clamp(
                values["refine_scale"] + (resolution - 60) / 200.0, 1.0, 2.0), 2)
            values["refine_steps"] = _steps_label(detail)
        else:
            values["refine_scale"] = 1.0

        extra_chunks = round(vram_save / 100.0 * 12)
        values["attention_chunks"] = int(clamp(values["attention_chunks"] + extra_chunks, 1, 64))
        values["ffn_chunks"] = int(clamp(values["ffn_chunks"] + extra_chunks, 1, 64))

    planner = plan_memory(
        width, height, frames, profile_name,
        values["refine"], values["refine_scale"],
        quality, detail, motion, vram_save,
    )
    if planner["status"] == "TIGHT":
        values["attention_chunks"] = max(values["attention_chunks"], 24)
        values["ffn_chunks"] = max(values["ffn_chunks"], 24)
    elif planner["status"] == "RISKY":
        values["attention_chunks"] = max(values["attention_chunks"], 32)
        values["ffn_chunks"] = max(values["ffn_chunks"], 32)

    config = {
        "schema": "cineconia.h3.optimizer/v1",
        "mode": mode,
        "profile": profile_name,
        "width": int(width),
        "height": int(height),
        "frames": int(frames),
        "quality": quality,
        "detail": detail,
        "motion": motion,
        "resolution": resolution,
        "vram_save": vram_save,
        "hardware": hardware,
        "planner": planner,
        **values,
    }
    detected = (
        "{:.1f} GB total / {:.1f} GB libres".format(
            hardware["total_gb"], hardware["free_gb"])
        if hardware.get("total_gb") is not None and hardware.get("free_gb") is not None
        else "VRAM no disponible"
    )
    info = (
        "{} · {} · {} · {}\n"
        "{}x{} · {} frames · {} pasos · troceo {}/{}\n"
        "refinado: {} x{} ({})\n"
        "Memory Planner: {}\n"
        "Perfiles v1 experimentales: falta validacion con render real."
    ).format(
        mode, profile_name, detected, selection_note,
        width, height, frames, values["steps"],
        values["attention_chunks"], values["ffn_chunks"],
        "si" if values["refine"] else "no", values["refine_scale"],
        values["refine_steps"], planner["status"],
    )
    return config, info
