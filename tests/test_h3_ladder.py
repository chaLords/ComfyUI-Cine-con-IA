"""La escalera de colores que ve el usuario al elegir preset.

Regla de producto: con la GPU detectada, el preset de esa tarjeta y todos los
menores quedan en MARGEN (verde), el de un escalon arriba en JUSTO (amarillo) y
los de dos o mas escalones en RIESGO (rojo). AUTO siempre queda en verde.
Se comprueba a la carga de referencia 416x736x192 con los ajustes guiados.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cineconia_h3.optimizer_config import build_optimizer_config  # noqa: E402

TIERS = ["8 GB", "12 GB", "16 GB", "24 GB", "32 GB"]


def estado(gpu, preset):
    gb = float(gpu.split()[0]) - 0.02  # las tarjetas reportan un poco menos
    hw = {"available": True, "name": "sim", "total_gb": gb, "free_gb": gb, "source": "test"}
    config, _ = build_optimizer_config("Auto", preset, 416, 736, 192, hardware=hw)
    return config["planner"]["status"]


class EscaleraTests(unittest.TestCase):
    def test_matriz_completa(self):
        for i, gpu in enumerate(TIERS):
            self.assertEqual(estado(gpu, "AUTO"), "SAFE", gpu)
            for j, preset in enumerate(TIERS):
                esperado = "SAFE" if j <= i else "TIGHT" if j == i + 1 else "RISKY"
                self.assertEqual(estado(gpu, preset), esperado, (gpu, preset))

    def test_render_verificado_en_16gb_queda_en_margen(self):
        hw = {"total_gb": 15.99, "free_gb": 14.0}
        config, _ = build_optimizer_config(
            "Advanced", "16 GB", 416, 736, 192, refine=True,
            advanced_attention_chunks=16, advanced_ffn_chunks=16,
            advanced_refine_scale=1.25, hardware=hw)
        self.assertEqual(config["planner"]["status"], "SAFE")

    def test_preset_por_encima_sugiere_el_de_tu_gpu(self):
        hw = {"total_gb": 15.99, "free_gb": 15.0}
        config, _ = build_optimizer_config("Auto", "32 GB", 416, 736, 192, hardware=hw)
        self.assertIn("16 GB", config["planner"]["recommendations"][0])

    def test_sin_gpu_se_simula_el_preset_elegido(self):
        hw = {"total_gb": None, "free_gb": None}
        for preset in TIERS:
            config, _ = build_optimizer_config("Auto", preset, 416, 736, 192, hardware=hw)
            self.assertEqual(config["planner"]["capacity_profile"], preset)
            self.assertEqual(config["planner"]["status"], "SAFE")


if __name__ == "__main__":
    unittest.main()
