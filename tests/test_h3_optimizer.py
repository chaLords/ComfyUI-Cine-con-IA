import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from cineconia_h3.camera_director import build_prompt
from cineconia_h3.comfy_nodes import CineH3OptimizedSampler
from cineconia_h3.memory_planner import plan_memory
from cineconia_h3.optimizer_config import build_optimizer_config
from cineconia_h3.scene_prompt import build_scene


class OptimizerConfigTests(unittest.TestCase):
    def test_auto_detects_24_gb_and_preserves_final_dimensions(self):
        hardware = {"available": True, "name": "GPU", "total_gb": 24.0,
                    "free_gb": 22.0, "source": "test"}
        config, info = build_optimizer_config(
            "Auto", "AUTO", 416, 736, 192, hardware=hardware)
        self.assertEqual(config["profile"], "24 GB")
        self.assertEqual((config["width"], config["height"]), (416, 736))
        self.assertEqual(config["schema"], "cineconia.h3.optimizer/v1")
        self.assertIn("experimentales", info)

    def test_auto_lowers_profile_when_most_vram_is_busy(self):
        hardware = {"available": True, "name": "GPU", "total_gb": 24.0,
                    "free_gb": 8.0, "source": "test"}
        config, _ = build_optimizer_config(
            "Auto", "AUTO", 416, 736, 192, hardware=hardware)
        self.assertEqual(config["profile"], "16 GB")

    def test_advanced_values_are_effective(self):
        hardware = {"available": False, "name": "test", "total_gb": None,
                    "free_gb": None, "source": "test"}
        config, _ = build_optimizer_config(
            "Advanced", "12 GB", 416, 736, 192,
            advanced_steps=23, advanced_sampler="er_sde",
            advanced_scheduler="beta", advanced_attention_chunks=31,
            advanced_ffn_chunks=29, advanced_refine_scale=1.4,
            hardware=hardware)
        self.assertEqual(config["steps"], 23)
        self.assertEqual(config["sampler"], "er_sde")
        self.assertGreaterEqual(config["attention_chunks"], 31)
        self.assertEqual(config["refine_scale"], 1.4)

    def test_planner_marks_large_8gb_job_risky(self):
        plan = plan_memory(1024, 1024, 362, "8 GB", True, 2.0)
        self.assertEqual(plan["status"], "RISKY")


class SceneCameraTests(unittest.TestCase):
    def test_scene_and_camera_remain_separate_and_compile_to_h3(self):
        scene = build_scene(
            "<Subject 1> is the man in <Picture 1>.",
            "[reference generation] A man writes.",
            "<Subject 1>: fully_preserved.",
            "He writes continuously.",
            "A dark study at night.",
            "Live-action cinematic imagery.",
            "A pen scratches on paper.",
            "N/A",
        )
        prompt, camera = build_prompt(
            scene, "sin especificar", "sin especificar", "sin especificar",
            "normal", "35 mm", "reducida",
            "The frame is divided into three equal vertical panels.", False)
        self.assertIn("subject_definitions:", prompt)
        self.assertIn("[Shot 1] The frame is divided", prompt)
        self.assertIn("He writes continuously", prompt)
        self.assertIn("A dark study", prompt)
        self.assertIn("35 mm lens", camera)


class OptimizedSamplerTests(unittest.TestCase):
    def test_sampler_consumes_config_and_calls_core_nodes(self):
        calls = []

        class Node:
            FUNCTION = "run"
            def run(self, **kwargs):
                calls.append(kwargs)
                return (object(),)

        fake_nodes = SimpleNamespace(NODE_CLASS_MAPPINGS={
            name: Node for name in (
                "BasicScheduler", "KSamplerSelect", "BasicGuider",
                "RandomNoise", "SamplerCustomAdvanced")
        })
        config, _ = build_optimizer_config(
            "Manual", "24 GB", 416, 736, 192,
            hardware={"available": False, "name": "test", "total_gb": None,
                      "free_gb": None, "source": "test"})
        with patch.dict(sys.modules, {"nodes": fake_nodes}):
            latent, info = CineH3OptimizedSampler().render(
                object(), object(), object(), config, 123)
        self.assertIsNotNone(latent)
        self.assertEqual(len(calls), 5)
        self.assertIn("24 GB", info)


if __name__ == "__main__":
    unittest.main()
