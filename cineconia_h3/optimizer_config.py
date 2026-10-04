"""Construccion de la configuracion consumida por el sampler H3."""

from .hardware import detect_hardware, select_auto_profile
from .memory_planner import plan_memory
from .progressive import MODES as SAMPLING_MODES, describe as describe_progressive, plan_progressive
from .profiles import PROFILE_NAMES, REFINE_STEPS, closest_profile, clamp, get_profile


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
        sampling="Normal", advanced_transition=10, advanced_lowres_scale=0.0,
        hardware=None, progressive_env=None):
    mode = mode if mode in MODES else "Auto"
    hardware = detect_hardware() if hardware is None else hardware
    if profile == "AUTO":
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
            "attention_chunks": int(clamp(int(advanced_attention_chunks), 1, 56)),
            "ffn_chunks": int(clamp(int(advanced_ffn_chunks), 1, 64)),
            "refine": bool(refine),
            "refine_scale": float(clamp(float(advanced_refine_scale), 1.0, 4.0)),
            "refine_steps": str(advanced_refine_steps) if advanced_refine_steps in REFINE_STEPS else REFINE_STEPS[1],
        })
    else:
        values["steps"] = int(clamp(values["steps"] + round((quality - 70) / 10), 4, 30))
        values["refine"] = bool(refine) and values["refine"]
        if values["refine"]:
            # El control Resolucion afecta solo al multiplicador del segundo
            # pase. Nunca cambia silenciosamente width/height solicitados.
            values["refine_scale"] = round(clamp(
                values["refine_scale"] + (resolution - 60) / 200.0, 1.0, 2.0), 2)
            values["refine_steps"] = _steps_label(detail)
        else:
            values["refine_scale"] = 1.0

        extra_chunks = round(vram_save / 100.0 * 12)
        values["attention_chunks"] = int(clamp(values["attention_chunks"] + extra_chunks, 1, 56))
        values["ffn_chunks"] = int(clamp(values["ffn_chunks"] + extra_chunks, 1, 64))

    # El preset decide la CARGA; la tarjeta real decide la CAPACIDAD. Asi, con
    # una GPU de 16 GB, los presets de 8/12/16 quedan en verde, 24 en amarillo
    # y 32 en rojo: el color le dice al usuario cual le sirve. Sin GPU detectada
    # se simula la tarjeta del preset elegido.
    total = hardware.get("total_gb")
    capacity_profile = closest_profile(total) if total else profile_name
    por_encima = bool(total) and PROFILE_NAMES.index(profile_name) > PROFILE_NAMES.index(capacity_profile)
    if por_encima:
        selection_note += " · por encima de tu GPU ({})".format(capacity_profile)
    planner = plan_memory(
        width, height, frames, capacity_profile,
        values["refine"], values["refine_scale"],
        attention_chunks=values["attention_chunks"], ffn_chunks=values["ffn_chunks"],
    )
    planner["capacity_profile"] = capacity_profile
    planner["basis"] = "GPU detectada · " + capacity_profile if total else "simulación manual"
    if por_encima and planner["status"] != "SAFE":
        planner["recommendations"].insert(
            0, "elige el preset de tu GPU ({}) o AUTO".format(capacity_profile))
    if profile == "AUTO" and not total:
        planner.update(status="UNKNOWN", basis="GPU sin detectar",
                       recommendations=["elige tu VRAM para simular un perfil"])
    elif total and total < 7.75:
        planner.update(status="RISKY", basis="GPU por debajo de los perfiles disponibles",
                       recommendations=["menos de 8 GB: esta carga requiere validación específica"])
    if refine and not values["refine"]:
        selection_note += " · perfil de 8 GB: refinado apagado; Advanced permite forzarlo"

    # Muestreo progresivo (SelfLift): ahorra tiempo, no memoria. El pico lo
    # marca el tramo final, a la resolucion pedida, asi que el planificador
    # de arriba sigue valiendo tal cual.
    sampling = sampling if sampling in SAMPLING_MODES else "Normal"
    progressive = plan_progressive(
        sampling == "Progresivo", mode, width, height, values["steps"], quality,
        advanced_transition, advanced_lowres_scale, values["refine"], env=progressive_env)

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
        "sampling": sampling,
        "progressive": progressive,
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
        "{}\n"
        "Perfiles experimentales: falta validacion con render real.\n"
        "{}"
    ).format(
        mode, profile_name, detected, selection_note,
        width, height, frames, values["steps"],
        values["attention_chunks"], values["ffn_chunks"],
        "si" if values["refine"] else "no", values["refine_scale"],
        values["refine_steps"], planner["status"], describe_progressive(progressive),
        " · ".join(planner["recommendations"]),
    )
    return config, info
