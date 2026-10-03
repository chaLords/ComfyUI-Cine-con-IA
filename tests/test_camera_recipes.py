"""Recetas de cámara versionadas y compatibilidad con el comportamiento 1.6."""

import hashlib
import importlib.util
import itertools
import json
from pathlib import Path
import unittest

from cineconia_h3.camera_director import (
    ANGLES,
    DEPTH,
    INTENSITIES,
    LENSES,
    MOVEMENTS,
    SHOTS,
    CineCameraDirectorH3,
    structured_camera,
)
from cineconia_h3.camera_recipes import (
    MODEL_NAMES,
    RECIPE_SCHEMA,
    load_registry,
    model_profile,
    resolve_recipe,
)


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("cineconia_recipe_nodes", ROOT / "nodes.py")
NODES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(NODES)


def _digest(values):
    payload = json.dumps(list(values), ensure_ascii=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class ExistingRecipeCompatibilityTests(unittest.TestCase):
    """El traslado a JSON no cambia ni un carácter de H3/LTX ya publicado."""

    def test_prompt6_h3_all_4704_combinations_are_byte_identical(self):
        values = (
            NODES._frase_camara(*parts)
            for parts in itertools.product(
                [k for k, _ in NODES.PLANOS],
                [k for k, _ in NODES.ANGULOS],
                [k for k, _ in NODES.MOVIMIENTOS],
                [k for k, _ in NODES.INTENSIDADES],
            )
        )
        self.assertEqual(
            _digest(values),
            "fc7ea2d9bc67aa3843eeaf8a994667f420ac389f68ff1dc8456321bb88dace00",
        )

    def test_prompt6_ltx_all_1176_ui_combinations_are_byte_identical(self):
        # Prompt6 ofrece la lista compartida de 21 movimientos; LTX deja en
        # blanco los dos que históricamente no tradujo. Eso también se fija.
        values = (
            NODES._frase_camara_ltx(*parts)
            for parts in itertools.product(
                NODES.LTX_PLANOS,
                NODES.LTX_ANGULOS,
                [k for k, _ in NODES.MOVIMIENTOS],
            )
        )
        self.assertEqual(
            _digest(values),
            "62cbcb7b439fd136f6dac37b25adebd5e253939e67b8890957ab143058245249",
        )

    def test_director_h3_all_241920_combinations_are_byte_identical(self):
        values = (
            structured_camera(*parts)
            for parts in itertools.product(
                SHOTS, ANGLES, MOVEMENTS, INTENSITIES, LENSES, DEPTH)
        )
        self.assertEqual(
            _digest(values),
            "b217229b56591a98e0e1d95bf58c47bdf0458d3f142cff0e86914e585394ff4b",
        )


class AdaptiveRecipeTests(unittest.TestCase):
    def test_registry_is_versioned_and_evidence_is_explicit(self):
        registry = load_registry()
        self.assertEqual(registry["schema"], RECIPE_SCHEMA)
        self.assertEqual(registry["default_recipe"], "minimax_h3")
        for recipe in registry["recipes"].values():
            self.assertTrue(recipe["version"])
            self.assertIn(recipe["status"], {"probada", "sin probar", "experimental"})
            self.assertTrue(recipe["evidence"])
            self.assertTrue(recipe["source"].startswith("https://"))

    def test_all_profiles_keep_the_same_director_buttons(self):
        baseline = resolve_recipe("MiniMax H3")[1]["director"]
        for model in MODEL_NAMES:
            director = resolve_recipe(model)[1]["director"]
            for field in ("shots", "angles", "movements", "intensities", "lenses", "depth"):
                self.assertEqual(list(director[field]), list(baseline[field]), (model, field))

    def test_translation_changes_internally_without_loading_weights(self):
        h3 = structured_camera(
            "plano medio", "frontal", "lateral izquierda", "normal",
            "sin especificar", "sin especificar", "MiniMax H3")
        ltx = structured_camera(
            "plano medio", "frontal", "lateral izquierda", "normal",
            "sin especificar", "sin especificar", "LTX-2.5")
        self.assertIn("trucks left", h3)
        self.assertIn("dollies left", ltx)
        self.assertNotEqual(h3, ltx)
        self.assertEqual(model_profile("LTX-2.5")["family"], "ltx_2_5")

    def test_uncertain_and_unknown_profiles_are_visible(self):
        _, wan, warning = resolve_recipe("Wan 2.2")
        self.assertEqual(wan["status"], "experimental")
        self.assertIn("sin probar", warning)
        key, _, fallback = resolve_recipe("Modelo futuro")
        self.assertEqual(key, "minimax_h3")
        self.assertIn("fallback", fallback)

    def test_profile_is_optional_inside_the_existing_director(self):
        spec = CineCameraDirectorH3.INPUT_TYPES()
        self.assertEqual(spec["optional"]["perfil_modelo"][1]["default"], "MiniMax H3")
        self.assertNotIn("CineModelProfile", NODES.NODE_CLASS_MAPPINGS)


# Prompt de las corridas 050 del 2026-10-02/03 con personaje duplicado.
PROMPT_050 = """subject_definitions:
<Subject 1> is the adult man represented in <Picture 1>. The left panel defines his facial features, hairstyle and beard. The center and right panels define his clothing: a brown leather jacket, a white shirt, a brown tie, beige pleated trousers and dark brown shoes. All panels describe the same person.

summary:
[reference generation] <Subject 1> stands calmly inside a spacious photography studio, breathing naturally and gradually forming a subtle, relaxed smile.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve his facial structure, hairstyle, beard, body proportions and clothing from <Picture 1>. Use the reference sheet for the character, not for the studio environment.

detailed_description:
Naturalistic live-action photography with realistic skin texture, detailed leather and soft daylight. The studio has a wooden floor, tall windows along one wall and brick pillars at different distances. A wooden chair stands several metres behind <Subject 1>.
[Shot 1] <Subject 1> stands comfortably with his arms resting at his sides. He maintains his body orientation and looks toward a fixed point in the room. He breathes naturally, blinks occasionally and gradually forms a subtle smile. His feet remain in place.

overall_soundscape:
Quiet studio ambience and faint clothing rustle. No speech.

non_diegetic_music:
N/A"""


class FramingWarningTests(unittest.TestCase):
    """El Director avisa de contradicciones de encuadre sin tocar el prompt."""

    def dirigir(self, plano, movimiento, texto=PROMPT_050):
        scene = {"schema": "cineconia.h3.scene/v1", "raw_prompt": texto}
        return CineCameraDirectorH3().dirigir(
            scene, plano, "perfil", movimiento, "suave", "85 mm", "profunda", "", True, "MiniMax H3")

    def test_tight_shot_with_feet_in_the_action_warns(self):
        out = self.dirigir("primerisimo primer plano", "acercarse")
        avisos = out["ui"]["camara_avisos"]
        self.assertEqual(len(avisos), 2)
        self.assertIn("feet", avisos[0])
        # los zapatos de subject_definitions describen identidad, no la acción
        self.assertNotIn("shoes", avisos[0])
        self.assertIn("AVISO", out["result"][1])

    def test_warning_never_changes_the_prompt(self):
        from cineconia_h3.camera_director import build_prompt
        scene = {"schema": "cineconia.h3.scene/v1", "raw_prompt": PROMPT_050}
        esperado, _ = build_prompt(scene, "primerisimo primer plano", "perfil", "acercarse",
                                   "suave", "85 mm", "profunda", "", True, "MiniMax H3")
        self.assertEqual(self.dirigir("primerisimo primer plano", "acercarse")["result"][0], esperado)

    def test_coherent_framing_is_silent(self):
        for plano in ("plano general", "gran plano general", "sin especificar"):
            out = self.dirigir(plano, "fijo")
            self.assertEqual(out["ui"]["camara_avisos"], [], plano)
            self.assertNotIn("AVISO", out["result"][1])
        sin_pies = PROMPT_050.replace(" His feet remain in place.", "")
        self.assertEqual(self.dirigir("primer plano", "fijo", sin_pies)["ui"]["camara_avisos"], [])
        # el plano americano corta por las rodillas: piernas sí, pies no
        rodillas = sin_pies.replace("arms resting at his sides", "hands resting on his knees")
        self.assertEqual(self.dirigir("plano americano", "fijo", rodillas)["ui"]["camara_avisos"], [])
        self.assertTrue(self.dirigir("plano americano", "fijo")["ui"]["camara_avisos"])

    def test_warned_shots_exist_in_the_registry(self):
        from cineconia_h3.camera_director import _PLANOS_SIN_PIES
        for plano in _PLANOS_SIN_PIES:
            self.assertIn(plano, SHOTS)


if __name__ == "__main__":
    unittest.main()


# Prompt universal: la escena no trae cámara (ley del texto automático).
PROMPT_UNIVERSAL = """subject_definitions:
<Subject 1> is the adult man in <Picture 1>, with his facial features, hairstyle and beard. He wears a brown leather jacket over a white shirt and a brown tie.

summary:
[reference generation] <Subject 1> stands calmly in a bright, spacious photography studio, breathing naturally and gradually forming a subtle, relaxed smile.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve his facial structure, hairstyle, beard and clothing from <Picture 1>.

detailed_description:
Naturalistic live-action photography with realistic skin texture and soft daylight. The studio has a wooden floor, tall windows along one wall and brick pillars.
[Shot 1] <Subject 1> is the only person in the scene. He stands relaxed in one place and keeps his body orientation. His head and gaze stay aligned with his body, looking straight ahead. He breathes naturally, blinks occasionally and gradually forms a subtle smile.

overall_soundscape:
Quiet studio ambience and faint clothing rustle. No speech.

non_diegetic_music:
N/A"""


class AutoCameraTests(unittest.TestCase):
    """Texto automático: los botones escriben toda la cámara; la escena no la trae."""

    def test_every_h3_button_has_a_supporting_phrase_without_negations(self):
        director = resolve_recipe("MiniMax H3")[1]["director"]
        refuerzos = director["refuerzos"]
        self.assertEqual(refuerzos["status"], "experimental")
        for grupo in ("shots", "angles", "movements", "depth"):
            self.assertEqual(set(refuerzos[grupo]), set(director[grupo]), grupo)
            for texto in refuerzos[grupo].values():
                self.assertNotRegex(texto, r"(?i)\b(no|not|never|without|avoid)\b", texto)

    def test_auto_text_adds_support_and_drops_speed_on_a_static_camera(self):
        from cineconia_h3.camera_director import auto_camera
        texto, aviso = auto_camera("primer plano", "frontal", "fijo", "suave", "85 mm", "reducida")
        self.assertEqual(aviso, "")
        self.assertTrue(texto.startswith(structured_camera(
            "primer plano", "frontal", "fijo", "normal", "85 mm", "reducida")))
        self.assertIn("square to the lens", texto)
        self.assertIn("softly out of focus", texto)
        self.assertNotIn("amplitude", texto)
        # con movimiento la intensidad se conserva
        movil, _ = auto_camera("plano medio", "perfil", "acercarse", "suave", "sin especificar", "natural")
        self.assertIn("with small amplitude at slow speed", movil)
        # una receta sin textos de apoyo lo dice
        _, aviso_ltx = auto_camera("primer plano", "frontal", "fijo", "normal", "85 mm", "reducida", "LTX-2.5")
        self.assertIn("textos de apoyo", aviso_ltx)

    def test_auto_mode_uses_the_box_as_is_and_falls_back_when_empty(self):
        from cineconia_h3.camera_director import auto_camera, build_prompt
        scene = {"schema": "cineconia.h3.scene/v1", "raw_prompt": PROMPT_UNIVERSAL}
        args = ("primer plano", "frontal", "fijo", "normal", "85 mm", "reducida")
        caja = "The camera holds still on him. He looks into the lens."
        prompt, camara = build_prompt(scene, *args, caja, False, "MiniMax H3", True)
        self.assertEqual(camara, caja)
        self.assertNotIn("The shot is framed as", prompt)
        _, vacia = build_prompt(scene, *args, "", False, "MiniMax H3", True)
        self.assertEqual(vacia, auto_camera(*args)[0])
        # apagado: el comportamiento de siempre, caja + texto estructurado
        _, clasico = build_prompt(scene, *args, caja, False, "MiniMax H3")
        self.assertEqual(clasico, caja + "\n\n" + structured_camera(*args))

    def test_the_law_warns_about_camera_in_the_scene_only_in_auto_mode(self):
        def dirigir(texto, auto):
            scene = {"schema": "cineconia.h3.scene/v1", "raw_prompt": texto}
            return CineCameraDirectorH3().dirigir(scene, "primer plano", "frontal", "fijo", "normal",
                                                  "85 mm", "reducida", "", True, "MiniMax H3", auto)
        limpio = dirigir(PROMPT_UNIVERSAL, True)
        self.assertEqual(limpio["ui"]["camara_avisos"], [])
        self.assertIn("texto automático", limpio["result"][1])
        sucio = PROMPT_UNIVERSAL.replace("looking straight ahead", "looking into the camera").replace(
            "brick pillars.", "brick pillars, softly blurred.")
        avisos = dirigir(sucio, True)["ui"]["camara_avisos"]
        self.assertEqual(len(avisos), 1)
        self.assertIn("«camera»", avisos[0])
        self.assertIn("«blurred»", avisos[0])
        # sin modo automático la escena puede traer cámara, como siempre
        self.assertEqual(dirigir(sucio, False)["ui"]["camara_avisos"], [])

    def test_auto_mode_is_the_last_optional_field_and_starts_off(self):
        spec = CineCameraDirectorH3.INPUT_TYPES()
        self.assertEqual(list(spec["optional"]), ["perfil_modelo", "camara_automatica"])
        self.assertIs(spec["optional"]["camara_automatica"][1]["default"], False)
