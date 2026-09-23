import json
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

from cineconia_h3.hardware import select_auto_profile
from cineconia_h3.profiles import closest_profile
from cineconia_h3.optimizer_config import build_optimizer_config
from cineconia_h3.memory_planner import plan_memory
from cineconia_h3.scene_prompt import CineSimplePromptH3
from cineconia_h3.camera_director import build_prompt, structured_camera
from cineconia_h3.comfy_nodes import CineH3Optimizer

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("preview_nodes", ROOT / "nodes.py")
nodes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(nodes)
UNKNOWN = {"available": False, "total_gb": None, "free_gb": None}


class MemoryPolicyTests(unittest.TestCase):
    def config(self, profile="AUTO", **kwargs):
        return build_optimizer_config("Auto", profile, 416, 736, 192,
                                      hardware=kwargs.pop("hardware", UNKNOWN), **kwargs)[0]

    def test_nominal_vram_tolerance(self):
        for value, expected in [(7.99, "8 GB"), (11.99, "12 GB"), (15.98, "16 GB"), (23.99, "24 GB"), (31.9, "32 GB"), (10, "8 GB")]:
            self.assertEqual(closest_profile(value), expected)

    def test_unknown_gpu_never_claims_safe(self):
        self.assertEqual(self.config()["planner"]["status"], "UNKNOWN")
        self.assertEqual(self.config()["profile"], "8 GB")

    def test_explicit_profile_wins_in_auto_mode(self):
        config = self.config("8 GB", hardware={"total_gb": 24, "free_gb": 24})
        self.assertEqual(config["profile"], "8 GB")
        self.assertFalse(config["refine"])

    def test_manual_auto_detects_instead_of_falling_back(self):
        config, _ = build_optimizer_config("Manual", "AUTO", 416, 736, 192,
            hardware={"total_gb": 11.99, "free_gb": 1})
        self.assertEqual(config["profile"], "12 GB")

    def test_steps_do_not_depend_on_gpu_or_free_memory(self):
        for total in [8, 12, 16, 24, 32]:
            for free in [1, total]:
                self.assertEqual(self.config(hardware={"total_gb": total, "free_gb": free})["steps"], 20)

    def test_larger_manual_policy_cannot_invent_capacity(self):
        config = self.config("32 GB", hardware={"total_gb": 8, "free_gb": 7})
        self.assertEqual(config["planner"]["capacity_profile"], "8 GB")
        self.assertEqual(config["planner"]["status"], "RISKY")

    def test_advanced_chunks_are_respected_and_compatible(self):
        config, _ = build_optimizer_config("Advanced", "8 GB", 1024, 1024, 362,
            advanced_attention_chunks=4, advanced_ffn_chunks=3, hardware=UNKNOWN)
        self.assertEqual((config["attention_chunks"], config["ffn_chunks"]), (4, 3))
        config, _ = build_optimizer_config("Advanced", "8 GB", 416, 736, 192,
            advanced_attention_chunks=64, hardware=UNKNOWN)
        self.assertEqual(config["attention_chunks"], 56)

    def test_sequential_passes_use_peak_not_sum(self):
        first = plan_memory(416, 736, 192, "16 GB", False, 1)
        same = plan_memory(416, 736, 192, "16 GB", True, 1)
        self.assertEqual(first["relative_load"], same["relative_load"])
        self.assertGreater(plan_memory(416, 736, 192, "16 GB", True, 2)["relative_load"], same["relative_load"])

    def test_steps_and_inactive_saving_slider_do_not_fake_memory_reduction(self):
        a = plan_memory(416, 736, 192, "16 GB", True, 1.2, quality=0, vram_save=0)
        b = plan_memory(416, 736, 192, "16 GB", True, 1.2, quality=100, vram_save=100)
        self.assertEqual(a, b)

    def test_higher_capacity_reduces_risk_for_same_work(self):
        ratios = [plan_memory(416, 736, 192, p, False, 1)["capacity_ratio"] for p in ["8 GB", "12 GB", "16 GB", "24 GB", "32 GB"]]
        self.assertEqual(ratios, sorted(ratios, reverse=True))

    def test_refine_output_matches_consumer_combo(self):
        self.assertEqual(CineH3Optimizer.RETURN_TYPES[6], nodes.CineEscalarRefinar.INPUT_TYPES()["required"]["pasos"][0])


class SimplePromptTests(unittest.TestCase):
    def test_three_quarter_is_a_viewing_angle_not_a_body_crop(self):
        camera = structured_camera("plano medio", "tres cuartos", "fijo", "normal", "50 mm", "natural")
        self.assertIn("forty-five degrees", camera)
        self.assertIn("three-quarter view", camera)
        self.assertIn("a medium shot", camera)
        self.assertIn("static shot", camera)


    def render(self, text, camera="", continuity=False):
        scene, direct = CineSimplePromptH3().crear(text)
        self.assertEqual(direct, text.strip())
        return build_prompt(scene, "sin especificar", "sin especificar", "sin especificar",
                            "normal", "sin especificar", "sin especificar", camera, continuity)[0]

    def test_complete_prompt_survives_without_camera(self):
        text = "subject_definitions:\n<Subject 1> from <Picture 1>.\n\ndetailed_description:\n[Shot 1] Writes.\n\noverall_soundscape:\nPaper."
        self.assertEqual(self.render(text), text)
        with_camera = self.render(text, "The camera holds still.")
        self.assertIn("[Shot 1] The camera holds still. Writes.", with_camera)
        self.assertIn("overall_soundscape:\nPaper.", with_camera)

    def test_plain_text_keeps_action_and_camera(self):
        self.assertIn("A woman walks.\n\nThe camera follows.", self.render("A woman walks.", "The camera follows."))

    def test_constraints_are_not_duplicated(self):
        text = "A scene.\n\n### Shot constraints\nKeep identity."
        self.assertEqual(self.render(text, continuity=True).count("### Shot constraints"), 1)


class PreviewTests(unittest.TestCase):
    @patch("cineconia_h3.optimizer_config.detect_hardware", return_value=UNKNOWN)
    def test_preview_executes_same_config_with_connected_dimensions(self, _):
        body = {"fields": {"perfil": "12 GB"}, "sources": {
            "width": {"type": "CineRatioSize", "fields": {}, "output": "width"},
            "height": {"type": "CineRatioSize", "fields": {}, "output": "height"},
            "frames": {"type": "CineDuracion", "fields": {"segundos": 8}, "output": "frames"}}}
        config = nodes.preview_h3(body)["config"]
        expected, _ = build_optimizer_config("Auto", "12 GB", 416, 736, 192, hardware=UNKNOWN)
        self.assertEqual(config, expected)

    def test_preview_rejects_unknown_nodes_and_non_finite_values(self):
        for body in [{"fields": {"width": float("nan")}}, {"sources": {"width": {"type": "KSampler"}}}, {"fields": {"perfil": []}}]:
            with self.assertRaises((ValueError, TypeError)):
                nodes.preview_h3(body)


class ModularWorkflowTests(unittest.TestCase):
    def test_new_example_preserves_prompt_and_has_valid_links(self):
        old = json.loads((ROOT / "examples/039.REALminimax-H3-CineconIA-Optimizer-v1.json").read_text(encoding="utf-8"))
        new = json.loads((ROOT / "examples/039.REALminimax-H3-Modular-v2.json").read_text(encoding="utf-8"))
        by_type = {n["type"]: n for n in old["nodes"]}
        from cineconia_h3.scene_prompt import build_scene
        scene = build_scene(*by_type["CineScenePromptH3"]["widgets_values"])
        args = by_type["CineCameraDirectorH3"]["widgets_values"]
        expected, _ = build_prompt(scene, *args)
        new_types = {n["type"]: n for n in new["nodes"]}
        simple, _ = CineSimplePromptH3().crear(*new_types["CineSimplePromptH3"]["widgets_values"])
        self.assertEqual(new_types["CineEscalarRefinar"]["mode"], 0)
        self.assertFalse(new_types["CineH3Optimizer"]["widgets_values_named"]["refinar"])
        actual, _ = build_prompt(simple, *args)
        self.assertEqual(actual, expected)
        lookup = {n["id"]: n for n in new["nodes"]}
        self.assertEqual(len(lookup), len(new["nodes"]))
        for link_id, origin, slot, dest, input_slot, kind in new["links"]:
            output = lookup[origin]["outputs"][slot]
            input_ = lookup[dest]["inputs"][input_slot]
            self.assertEqual((output["type"], input_["type"]), (kind, kind))
            self.assertIn(link_id, output["links"])
            self.assertEqual(input_["link"], link_id)
        for node in new["nodes"]:
            cls = nodes.NODE_CLASS_MAPPINGS.get(node["type"])
            if not cls:
                continue
            declared = [(name, "COMBO" if isinstance(kind, list) else kind)
                        for name, kind in zip(cls.RETURN_NAMES, cls.RETURN_TYPES)]
            self.assertEqual([(o["name"], o["type"]) for o in node["outputs"]], declared)
