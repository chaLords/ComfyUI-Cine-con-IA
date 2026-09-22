"""Camera Director H3: como se filma una escena ya definida."""


SHOTS = {
    "sin especificar": "",
    "primerisimo primer plano": "an extreme close-up",
    "primer plano": "a close-up",
    "plano medio corto": "a close shot",
    "plano medio": "a medium shot",
    "plano americano": "a medium-wide shot",
    "plano general": "a wide shot",
    "gran plano general": "an extreme wide shot",
}
ANGLES = {
    "sin especificar": "",
    "altura de los ojos": "at the subject's eye level",
    "contrapicado": "below the subject, looking up",
    "picado": "above the subject, looking down",
    "cenital": "directly overhead, looking straight down",
    "tres cuartos": "about forty-five degrees off the subject's front",
    "sobre el hombro": "just behind the subject's shoulder",
}
MOVEMENTS = {
    "sin especificar": "",
    "fijo": "holds a static shot for the entire shot",
    "acercarse": "pushes in toward the subject",
    "alejarse": "pulls out away from the subject",
    "zoom in": "zooms in on the subject",
    "zoom out": "zooms out from the subject",
    "panoramica izquierda": "pans left",
    "panoramica derecha": "pans right",
    "inclinar arriba": "tilts up",
    "inclinar abajo": "tilts down",
    "lateral izquierda": "trucks left",
    "lateral derecha": "trucks right",
    "grua arriba": "pedestals up",
    "grua abajo": "pedestals down",
    "orbita": "arcs around the subject with visible background parallax",
    "seguimiento": "follows the subject in a tracking shot",
    "camara en mano": "moves with a slight handheld shake",
}
INTENSITIES = {
    "normal": "",
    "suave": "with small amplitude at slow speed",
    "amplia y lenta": "with large amplitude at slow speed",
    "marcada": "with large amplitude at fast speed",
}
LENSES = ("sin especificar", "14 mm", "24 mm", "35 mm", "50 mm", "85 mm", "135 mm", "200 mm")
DEPTH = ("sin especificar", "profunda", "natural", "reducida", "muy reducida")

CONTINUITY_RULES = (
    "Identity, anatomy, clothing and object contact remain consistent. "
    "No person or limb enters the frame unless established by the scene. "
    "The requested framing and camera path take priority while scene geometry remains coherent."
)


def structured_camera(plano, angulo, movimiento, intensidad, lente, profundidad):
    phrases = []
    shot = SHOTS.get(plano, "")
    angle = ANGLES.get(angulo, "")
    if shot and angle:
        phrases.append("The shot is framed as {}, with the camera {}.".format(shot, angle))
    elif shot:
        phrases.append("The shot is framed as {}.".format(shot))
    elif angle:
        phrases.append("The camera is {}.".format(angle))
    movement = MOVEMENTS.get(movimiento, "")
    if movement:
        intensity = INTENSITIES.get(intensidad, "")
        phrases.append("The camera {}{}.".format(
            movement, " " + intensity if intensity else ""))
    if lente != "sin especificar":
        phrases.append("The image uses a {} lens.".format(lente))
    depth_map = {
        "profunda": "deep depth of field",
        "natural": "natural depth of field",
        "reducida": "shallow depth of field",
        "muy reducida": "very shallow depth of field",
    }
    if profundidad in depth_map:
        phrases.append("The shot has {}.".format(depth_map[profundidad]))
    return " ".join(phrases)


def build_prompt(scene, plano, angulo, movimiento, intensidad, lente,
                 profundidad_campo, instruccion_camara, reglas_continuidad):
    if not isinstance(scene, dict) or scene.get("schema") != "cineconia.h3.scene/v1":
        raise ValueError("Camera Director necesita la salida scene de CineConIA Scene / Prompt H3")
    camera = str(instruccion_camara or "").strip()
    generated = structured_camera(
        plano, angulo, movimiento, intensidad, lente, profundidad_campo)
    # Una receta completa se conserva como su propio parrafo. Los controles
    # estructurados van despues, igual que en CinePrompt6, para no reescribir
    # trayectorias verificadas como Pantalla dividida u Orbita 360.
    camera_text = "\n\n".join(part for part in (camera, generated) if part).strip()
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
    """Compila la escena y la direccion de camara al formato H3."""

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
        }}

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("prompt", "info")
    FUNCTION = "dirigir"
    CATEGORY = "Cine con IA/H3"
    DESCRIPTION = "Direccion de camara H3 separada de la escena: encuadre, angulo, movimiento, lente y profundidad."

    def dirigir(self, scene, plano, angulo, movimiento, intensidad, lente,
                profundidad_campo, instruccion_camara, reglas_continuidad):
        prompt, camera = build_prompt(
            scene, plano, angulo, movimiento, intensidad, lente,
            profundidad_campo, instruccion_camara, reglas_continuidad,
        )
        info = "Camera Director H3: {}".format(
            camera if camera else "sin instruccion de camara")
        return prompt, info
