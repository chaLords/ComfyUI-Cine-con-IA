"""Camera Director adaptable: una intención, vocabulario por modelo."""

import logging
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

# Planos que dejan fuera pies y piernas. Si la escena los pide, el modelo
# tiene que elegir entre encuadre y acción: en los renders del 050
# (2026-10-02/03) H3 lo resolvió con una segunda figura de cuerpo entero
# detrás del primer plano. Solo se avisa; el prompt no se reescribe.
_PIES = r"feet|foot|shoes?|boots?|full[- ]body|full[- ]length|head[- ]to[- ]toe|whole body"
_SIN_PIERNAS = re.compile(r"\b(" + _PIES + r"|legs?|knees?)\b", re.IGNORECASE)
_SIN_PIES = re.compile(r"\b(" + _PIES + r")\b", re.IGNORECASE)
_FUERA_DE_PLANO = {
    "primerisimo primer plano": _SIN_PIERNAS, "primer plano": _SIN_PIERNAS,
    "plano medio corto": _SIN_PIERNAS, "plano medio": _SIN_PIERNAS,
    "plano americano": _SIN_PIES,   # corta por las rodillas
}
_PLANOS_SIN_PIES = tuple(_FUERA_DE_PLANO)
_SECCIONES_ACCION = re.compile(
    r"(?ms)^(?:summary|detailed_description):[ \t]*\n?(.*?)"
    r"(?=^(?:subject_definitions|summary|retention_analysis|detailed_description|"
    r"overall_soundscape|non_diegetic_music):|\Z)")


def _texto_accion(scene):
    """Lo que pasa en el plano; la descripción del personaje queda fuera."""
    if "raw_prompt" in scene:
        texto = str(scene["raw_prompt"])
        secciones = _SECCIONES_ACCION.findall(texto)
        return "\n".join(secciones) if secciones else texto
    return "\n".join(str(scene.get(k, "")) for k in
                     ("summary", "action", "setting", "visual_style"))


# La ley del texto automático: el prompt de escena dice qué pasa y el Director
# decide cómo se ve. Con el modo automático encendido, estas palabras en la
# acción indican que la escena trae cámara y puede pelear con los botones
# (la mirada «a cámara» o «fuera de cuadro» decide el ángulo de la cara).
_CAMARA_EN_ESCENA = re.compile(
    r"\b(extreme close-up|close-up|close shot|medium(?:-wide)? shot|wide shot|full shot|"
    r"establishing shot|long shot|camera|lens|zoom(?:s|ing|ed)?|dolly|push(?:es)? in|"
    r"pull(?:s)? out|tracking shot|arc shot|framing|in frame|the frame|off-screen|on-screen|"
    r"eye level|low angle|high angle|over-the-shoulder|\d+\s?mm|bokeh|blur(?:red|ry)?|"
    r"out of focus|in focus|depth of field|shallow focus|deep focus)\b", re.IGNORECASE)


def scene_law_warnings(scene):
    """Cámara escrita en el prompt de escena. Solo avisa; no se borra nada."""
    if not isinstance(scene, dict):
        return []
    halladas = []
    for m in _CAMARA_EN_ESCENA.finditer(_texto_accion(scene)):
        palabra = m.group(1).lower()
        if palabra not in halladas:
            halladas.append(palabra)
    if not halladas:
        return []
    return ["el prompt de escena trae cámara ({}); con el texto automático la cámara "
            "va solo en el Director. Quítala de la escena para que los botones manden"
            .format(", ".join("«{}»".format(h) for h in halladas[:5]))]


def framing_warnings(scene, plano, movimiento):
    """Contradicciones entre el encuadre pedido y la escena. No cambia nada."""
    avisos = []
    if plano in _FUERA_DE_PLANO and isinstance(scene, dict):
        patron = _FUERA_DE_PLANO[plano]
        partes = sorted({m.group(1).lower() for m in patron.finditer(_texto_accion(scene))})
        if partes:
            avisos.append(
                "el {} no muestra {}, pero la escena lo pide; riesgo de que el modelo "
                "añada una segunda figura de cuerpo entero. Abre el plano o quita esas "
                "partes de la acción".format(plano, ", ".join(partes)))
    if plano == "primerisimo primer plano" and movimiento in ("acercarse", "zoom in"):
        avisos.append(
            "{} desde un primerísimo primer plano deja poco recorrido; H3 puede "
            "empezar más abierto (observado, sin prueba controlada)".format(movimiento))
    return avisos


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


def auto_camera(plano, angulo, movimiento, intensidad, lente, profundidad,
                perfil_modelo=None):
    """Texto completo de la caja «instrucción de cámara» en modo automático.

    Es el texto de siempre más los refuerzos de la receta: frases que describen
    el resultado visible de cada botón, lo que antes tenía que escribir el
    prompt de escena. Devuelve (texto, aviso).
    """
    _, recipe, aviso = resolve_recipe(perfil_modelo)
    if movimiento in ("fijo", "sin especificar"):
        # una cámara quieta no tiene amplitud ni velocidad
        intensidad = "normal"
    base = _compile_camera(recipe, plano, angulo, movimiento, intensidad, lente, profundidad)
    refuerzos = recipe["director"].get("refuerzos") or {}
    extra = [refuerzos.get(grupo, {}).get(valor, "") for grupo, valor in (
        ("shots", plano), ("angles", angulo), ("movements", movimiento), ("depth", profundidad))]
    if not refuerzos:
        aviso = "; ".join(a for a in (aviso, "esta receta no tiene textos de apoyo") if a)
    return " ".join(p for p in [base, *extra] if p), aviso


def build_prompt(scene, plano, angulo, movimiento, intensidad, lente,
                 profundidad_campo, instruccion_camara, reglas_continuidad,
                 perfil_modelo=None, camara_automatica=False):
    if not isinstance(scene, dict) or scene.get("schema") != "cineconia.h3.scene/v1":
        raise ValueError("Camera Director necesita la salida scene de CineConIA Scene / Prompt H3")
    camera = str(instruccion_camara or "").strip()
    if camara_automatica:
        # La caja ya trae el texto de los botones (lo escribe la interfaz y el
        # usuario puede retocarlo): se usa tal cual, sin sumarle el de siempre.
        # Vacía solo si nadie la rellenó, por ejemplo desde la API.
        camera, generated = "", camera or auto_camera(
            plano, angulo, movimiento, intensidad, lente, profundidad_campo, perfil_modelo)[0]
    else:
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
            "camara_automatica": ("BOOLEAN", {"default": False,
                "tooltip": "Cada botón escribe en la caja de instrucción el texto completo de cámara, "
                           "con frases de apoyo. El prompt de escena no lleva cámara. Experimental."}),
        }}

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("prompt", "info")
    FUNCTION = "dirigir"
    CATEGORY = "Cine con IA/H3"
    DESCRIPTION = "Dirección de cámara adaptable: mismos controles, vocabulario local según el modelo."

    def dirigir(self, scene, plano, angulo, movimiento, intensidad, lente,
                profundidad_campo, instruccion_camara, reglas_continuidad,
                perfil_modelo=None, camara_automatica=False):
        key, recipe, warning = resolve_recipe(perfil_modelo)
        prompt, camera = build_prompt(
            scene, plano, angulo, movimiento, intensidad, lente,
            profundidad_campo, instruccion_camara, reglas_continuidad,
            perfil_modelo, camara_automatica,
        )
        info = "Camera Director · {} · receta {} · {}: {}".format(
            recipe["display_name"], recipe["version"], recipe["status"],
            camera if camera else "sin instrucción de cámara")
        if warning:
            info += " · AVISO: " + warning
        if key != "minimax_h3" and str(instruccion_camara or "").strip() and not camara_automatica:
            info += " · el texto manual se conservó literalmente; no se traduce"
        if camara_automatica:
            info += " · texto automático (experimental, sin probar)"
        avisos = framing_warnings(scene, plano, movimiento)
        if camara_automatica:
            avisos += scene_law_warnings(scene)
        if avisos:
            info += " · AVISO: " + " | ".join(avisos)
            logging.warning("[Cine con IA] Director de cámara: %s", " | ".join(avisos))
        return {"ui": {"camara_avisos": avisos}, "result": (prompt, info)}
