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


if __name__ == "__main__":
    unittest.main()
