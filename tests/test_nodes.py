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
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="Libre",
            libre_prompt="Plano principal",
            libre_extra="Sonido ambiente",
            libre_separador="\\n---\\n",
        )

        self.assertEqual(prompt, "Plano principal\n---\nSonido ambiente")
        self.assertEqual(negative, "")

    def test_h3_mode_builds_sections_and_camera(self):
        prompt, negative = NODES.CinePrompt6().armar(
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
        self.assertEqual(negative, "")

    def test_wan_mode_joins_editable_sections_and_keeps_negative_separate(self):
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="Wan 2.2",
            wan_sujeto="A woman in a red coat.",
            wan_movimiento="She turns and starts running.",
            wan_camara="The camera tracks her from the side.",
            wan_negativo="warped hands, flicker",
        )

        self.assertIn("A woman in a red coat", prompt)
        self.assertIn("tracks her from the side", prompt)
        self.assertEqual(negative, "warped hands, flicker")

    def test_hunyuan_mode_uses_official_component_order(self):
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="Hunyuan 1.5",
            hunyuan_sujeto="A black cat.",
            hunyuan_movimiento="It jumps onto a table.",
            hunyuan_escena="A sunlit kitchen.",
            hunyuan_plano="Medium shot.",
            hunyuan_camara="The camera pushes in slowly.",
            hunyuan_luz="Soft window light.",
            hunyuan_estilo="Cinematic photorealism.",
            hunyuan_atmosfera="Warm and quiet.",
            hunyuan_negativo="text, watermark",
        )

        self.assertLess(prompt.index("A black cat"), prompt.index("Medium shot"))
        self.assertLess(prompt.index("Medium shot"), prompt.index("Soft window light"))
        self.assertEqual(negative, "text, watermark")

    def test_cogvideox_mode_builds_one_caption_with_its_token_profile(self):
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="CogVideoX 1.5",
            cog_sujeto_escena="A cyclist waits beneath a neon sign.",
            cog_accion_temporal="She looks left, then pedals into the rain.",
            cog_camara_composicion="A low tracking shot follows beside her.",
            cog_luz_color="Blue and magenta reflections shimmer on the road.",
            cog_estilo_atmosfera="Cinematic photorealism, tense nighttime mood.",
            cog_negativo="cuts, perspective jumps, watermark",
        )

        self.assertLess(prompt.index("waits beneath"), prompt.index("looks left"))
        self.assertLess(prompt.index("looks left"), prompt.index("low tracking"))
        self.assertEqual(negative, "cuts, perspective jumps, watermark")

    def test_mochi_mode_removes_na_and_keeps_negative_separate(self):
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="Mochi 1",
            mochi_sujeto="A fox with wet orange fur.",
            mochi_accion="It walks carefully through shallow water.",
            mochi_entorno="A quiet photorealistic forest at dawn.",
            mochi_camara="N/A",
            mochi_luz_estilo="Soft natural backlight.",
            mochi_negativo="animation, extreme motion",
        )

        self.assertNotIn("N/A", prompt)
        self.assertIn("Soft natural backlight", prompt)
        self.assertEqual(negative, "animation, extreme motion")

    def test_every_declared_model_returns_positive_and_negative_outputs(self):
        node = NODES.CinePrompt6()
        for model in NODES.MODELOS:
            result = node.armar(modelo=model, reglas_de_oficio=False)
            self.assertEqual(len(result), 2, model)


if __name__ == "__main__":
    unittest.main()
