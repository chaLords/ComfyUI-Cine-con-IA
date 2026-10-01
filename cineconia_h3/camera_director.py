"""Camera Director adaptable: una intención, vocabulario por modelo."""

import re

from .camera_recipes import MODEL_NAMES, resolve_recipe

_H3 = resolve_recipe()[1]["director"]
SHOTS = _H3["shots"]
ANGLES = _H3["angles"]
MOVEMENTS = _H3["movements"]
INTENSITIES = _H3["intensities"]
LENSES = tuple(_H3["lenses"])
DEPTH = tuple(_H3["depth"])

CONTINUITY_RULES = (
    "Identity, anatomy, clothing and object contact remain consistent. "
    "No person or limb enters the frame unless established by the scene. "
    "The requested framing and camera path take priority while scene geometry remains coherent."
)


def _compile_camera(recipe, plano, angulo, movimiento, intensidad, lente, profundidad):
    director = recipe["director"]
    templates = director["templates"]
    phrases = []
    shot = director["shots"].get(plano, "")
    angle = director["angles"].get(angulo, "")
    if shot and angle:
        phrases.append(templates["shot_angle"].format(shot=shot, angle=angle))
    elif shot:
        phrases.append(templates["shot"].format(shot=shot))
    elif angle:
        phrases.append(templates["angle"].format(angle=angle))
    movement = director["movements"].get(movimiento, "")
    if movement:
        intensity = director["intensities"].get(intensidad, "")
        phrases.append(templates["movement"].format(
            movement=movement, intensity=" " + intensity if intensity else ""))
    if lente != "sin especificar":
        phrases.append(templates["lens"].format(lens=lente))
    depth = director["depth"].get(profundidad, "")
    if depth:
        phrases.append(templates["depth"].format(depth=depth))
    return " ".join(phrases)


def structured_camera(plano, angulo, movimiento, intensidad, lente, profundidad,
                      perfil_modelo=None):
    """Traduce los controles con la receta seleccionada; sin perfil usa H3."""
    return _compile_camera(
        resolve_recipe(perfil_modelo)[1], plano, angulo, movimiento,
        intensidad, lente, profundidad)


def build_prompt(scene, plano, angulo, movimiento, intensidad, lente,
                 profundidad_campo, instruccion_camara, reglas_continuidad,
                 perfil_modelo=None):
    if not isinstance(scene, dict) or scene.get("schema") != "cineconia.h3.scene/v1":
        raise ValueError("Camera Director necesita la salida scene de CineConIA Scene / Prompt H3")
    camera = str(instruccion_camara or "").strip()
    generated = structured_camera(
        plano, angulo, movimiento, intensidad, lente, profundidad_campo,
        perfil_modelo)
    # Una receta completa se conserva como su propio parrafo. Los controles
    # estructurados van despues, igual que en CinePrompt6, para no reescribir
    # trayectorias verificadas como Pantalla dividida u Orbita 360.
    camera_text = "\n\n".join(part for part in (camera, generated) if part).strip()
    if "raw_prompt" in scene:
        prompt = str(scene["raw_prompt"]).strip()
        if camera_text:
            section = re.search(
                r"(?ms)^detailed_description:[ \t]*\n?(.*?)(?=^(?:subject_definitions|summary|retention_analysis|overall_soundscape|non_diegetic_music):|\Z)",
                prompt)
            if section:
                start, end = section.span(1)
                content = section.group(1)
                if re.search(r"(?m)^[ \t]*\[Shot 1\]", content):
                    content = re.sub(r"(?m)^([ \t]*\[Shot 1\])",
                                     lambda m: m.group(1) + " " + camera_text,
                                     content, count=1)
                else:
                    content = "[Shot 1] " + camera_text + "\n" + content
                prompt = prompt[:start] + content + prompt[end:]
            elif re.search(r"(?m)^\[Shot 1\]", prompt):
                prompt = re.sub(r"(?m)^\[Shot 1\]", lambda _: "[Shot 1] " + camera_text,
                                prompt, count=1)
            else:
                prompt += "\n\n" + camera_text
        if reglas_continuidad and "### Shot constraints" not in prompt:
            prompt += "\n\n### Shot constraints\n\n" + CONTINUITY_RULES
        return prompt.strip(), camera_text
    description_parts = [scene.get("visual_style", "").strip()]
    shot_parts = [camera_text, scene.get("action", "").strip(), scene.get("setting", "").strip()]
    shot = " ".join(part for part in shot_parts if part).strip()
    if shot:
        description_parts.append("[Shot 1] " + shot)
    detailed = "\n".join(part for part in description_parts if part)
    sections = (
        ("subject_definitions", scene.get("subject_definitions", "")),
        ("summary", scene.get("summary", "")),
        ("retention_analysis", scene.get("retention_analysis", "")),
        ("detailed_description", detailed),
        ("overall_soundscape", scene.get("overall_soundscape", "")),
        ("non_diegetic_music", scene.get("non_diegetic_music", "")),
    )
    prompt = "\n\n".join(
        "{}:\n{}".format(name, value.strip())
        for name, value in sections if str(value or "").strip()
    )
    if reglas_continuidad:
        prompt += "\n\n### Shot constraints\n\n" + CONTINUITY_RULES
    return prompt, camera_text


class CineCameraDirectorH3:
    """Compila escena y cámara con una receta local por familia."""

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "scene": ("CINECONIA_H3_SCENE",),
            "plano": (list(SHOTS), {"default": "sin especificar"}),
            "angulo": (list(ANGLES), {"default": "sin especificar"}),
            "movimiento": (list(MOVEMENTS), {"default": "sin especificar"}),
            "intensidad": (list(INTENSITIES), {"default": "normal"}),
            "lente": (list(LENSES), {"default": "sin especificar"}),
            "profundidad_campo": (list(DEPTH), {"default": "sin especificar"}),
            "instruccion_camara": ("STRING", {"multiline": True, "default": "",
                "tooltip": "Trayectoria o receta H3 completa. Se conserva y los controles estructurados se anaden despues."}),
            "reglas_continuidad": ("BOOLEAN", {"default": True}),
        }, "optional": {
            # Siempre al final: los ocho widgets históricos conservan posición.
            "perfil_modelo": (list(MODEL_NAMES), {"default": "MiniMax H3",
                "tooltip": "Receta interna de cámara. No carga pesos. Sin elegir conserva MiniMax H3."}),
        }}

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("prompt", "info")
    FUNCTION = "dirigir"
    CATEGORY = "Cine con IA/H3"
    DESCRIPTION = "Dirección de cámara adaptable: mismos controles, vocabulario local según el modelo."

    def dirigir(self, scene, plano, angulo, movimiento, intensidad, lente,
                profundidad_campo, instruccion_camara, reglas_continuidad,
                perfil_modelo=None):
        key, recipe, warning = resolve_recipe(perfil_modelo)
        prompt, camera = build_prompt(
            scene, plano, angulo, movimiento, intensidad, lente,
            profundidad_campo, instruccion_camara, reglas_continuidad,
            perfil_modelo,
        )
        info = "Camera Director · {} · receta {} · {}: {}".format(
            recipe["display_name"], recipe["version"], recipe["status"],
            camera if camera else "sin instrucción de cámara")
        if warning:
            info += " · AVISO: " + warning
        if key != "minimax_h3" and str(instruccion_camara or "").strip():
            info += " · el texto manual se conservó literalmente; no se traduce"
        return prompt, info
