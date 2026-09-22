"""Scene/Prompt H3: que ocurre, sin decidir como se filma."""


def build_scene(personajes_y_referencias, resumen, retencion, accion,
                lugar_y_contexto, estilo_visual, sonido, musica):
    return {
        "schema": "cineconia.h3.scene/v1",
        "subject_definitions": str(personajes_y_referencias or "").strip(),
        "summary": str(resumen or "").strip(),
        "retention_analysis": str(retencion or "").strip(),
        "action": str(accion or "").strip(),
        "setting": str(lugar_y_contexto or "").strip(),
        "visual_style": str(estilo_visual or "").strip(),
        "overall_soundscape": str(sonido or "").strip(),
        "non_diegetic_music": str(musica or "").strip(),
    }


class CineScenePromptH3:
    """Describe personajes, accion y lugar sin mezclar la camara."""

    @classmethod
    def INPUT_TYPES(cls):
        text = {"multiline": True, "default": ""}
        return {"required": {
            "personajes_y_referencias": ("STRING", dict(text, tooltip="Personajes y correspondencia con <Picture N>.")),
            "resumen": ("STRING", dict(text, tooltip="Resumen H3, incluido [reference generation] cuando corresponda.")),
            "retencion": ("STRING", dict(text, tooltip="Que identidad o elementos conserva cada referencia.")),
            "accion": ("STRING", dict(text, tooltip="Que hacen los personajes; no describas movimientos de camara aqui.")),
            "lugar_y_contexto": ("STRING", dict(text, tooltip="Lugar, objetos, luz y contexto visible.")),
            "estilo_visual": ("STRING", dict(text, tooltip="Estetica, material fotografico, color y luz.")),
            "sonido": ("STRING", dict(text, tooltip="Ambiente y sonido diegetico.")),
            "musica": ("STRING", dict(text, tooltip="Musica no diegetica o N/A.")),
        }}

    RETURN_TYPES = ("CINECONIA_H3_SCENE", "STRING")
    RETURN_NAMES = ("scene", "info")
    FUNCTION = "crear"
    CATEGORY = "Cine con IA/H3"
    DESCRIPTION = "Escena H3 modular: personajes, accion, lugar, estilo y sonido; la camara se decide aparte."

    def crear(self, personajes_y_referencias, resumen, retencion, accion,
              lugar_y_contexto, estilo_visual, sonido, musica):
        scene = build_scene(
            personajes_y_referencias, resumen, retencion, accion,
            lugar_y_contexto, estilo_visual, sonido, musica,
        )
        info = "Escena H3: {} · {}".format(
            "con personajes" if scene["subject_definitions"] else "sin personajes",
            "con accion" if scene["action"] else "sin accion",
        )
        return scene, info
