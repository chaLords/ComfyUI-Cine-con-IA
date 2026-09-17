import importlib.util
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).resolve().parents[1] / "nodes.py"
SPEC = importlib.util.spec_from_file_location("cineconia_nodes", MODULE_PATH)
NODES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(NODES)


class RatioSizeTests(unittest.TestCase):
    def test_vertical_base_size_is_aligned(self):
        width, height, info = NODES.CineRatioSize().calcular(
            "9:16  vertical (reels, tiktok)",
            "0.30 MP  ·  base medida",
            0.30,
            32,
        )

        self.assertEqual((width, height), (416, 736))
        self.assertEqual(width % 32, 0)
        self.assertEqual(height % 32, 0)
        self.assertIn("416x736", info)

    def test_fixed_long_side_respects_ratio(self):
        width, height, _ = NODES.CineRatioSize().calcular(
            "16:9  horizontal (cine, youtube)",
            "tamano 1024",
            0.30,
            32,
        )

        self.assertEqual(width, 1024)
        self.assertEqual(height, 576)


class DurationTests(unittest.TestCase):
    def test_h3_duration_uses_valid_grid(self):
        frames, seconds, _ = NODES.CineDuracion().calcular(
            segundos=8.0,
            fps="24  ·  nativo H3",
            rejilla=17,
            desfase=5,
            minimo_fotogramas=5,
        )

        self.assertEqual(frames, 192)
        self.assertEqual(frames % 17, 5)
        self.assertEqual(seconds, 8.0)


class PromptTests(unittest.TestCase):
    def test_free_mode_keeps_user_text(self):
        (prompt,) = NODES.CinePrompt6().armar(
            modelo="Libre",
            libre_prompt="Plano principal",
            libre_extra="Sonido ambiente",
            libre_separador="\\n---\\n",
        )

        self.assertEqual(prompt, "Plano principal\n---\nSonido ambiente")

    def test_h3_mode_builds_sections_and_camera(self):
        (prompt,) = NODES.CinePrompt6().armar(
            modelo="MiniMax H3",
            reglas_de_oficio=False,
            subject_definitions="<Subject 1> is the actor.",
            detailed_description="[Shot 1] The actor enters the room.",
            plano="plano medio",
            angulo="altura de los ojos",
            movimiento="acercarse",
            intensidad="suave",
        )

        self.assertIn("subject_definitions:", prompt)
        self.assertIn("detailed_description:", prompt)
        self.assertIn("a medium shot", prompt)
        self.assertIn("pushes in", prompt)


if __name__ == "__main__":
    unittest.main()
