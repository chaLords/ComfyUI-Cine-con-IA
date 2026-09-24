"""Modo progresivo: politica del Optimizador y llamada a SelfLift con dobles."""
import importlib.util
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cineconia_h3.comfy_nodes import CineH3OptimizedSampler  # noqa: E402
from cineconia_h3.optimizer_config import build_optimizer_config  # noqa: E402
from cineconia_h3.progressive import (  # noqa: E402
    SELFLIFT_COMMIT, auto_scale, describe, low_side, plan_progressive, run_selflift,
    transition_for)

SPEC = importlib.util.spec_from_file_location("cineconia_nodes_progresivo", ROOT / "nodes.py")
NODES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(NODES)

GPU16 = {"available": True, "name": "RTX 4060 Ti", "total_gb": 15.99, "free_gb": 14.2, "source": "test"}
UPSCALER = "minimax_h3_latent_upscaler_3d_bf16.safetensors"
LISTO = {"selflift": True, "upscaler": UPSCALER}
ENTRADAS_SELFLIFT = ("model", "positive", "negative", "vae", "latent_image", "sampler", "sigmas",
                     "seed", "cfg", "transition_step", "lowres_scale", "rho", "w_min", "w_max",
                     "upscaler_model")


def config(mode="Auto", w=640, h=1120, frames=124, env=LISTO, sampling="Progresivo", **kw):
    return build_optimizer_config(mode, "AUTO", w, h, frames, sampling=sampling,
                                  hardware=GPU16, progressive_env=env, **kw)


class PoliticaTests(unittest.TestCase):
    def test_0_70_mp_empieza_a_384x672_y_termina_a_640x1120(self):
        c, info = config()
        p = c["progressive"]
        self.assertEqual((p["enabled"], p["status"]), (True, "READY"))
        self.assertEqual((p["lowres_scale"], p["low_width"], p["low_height"]), (0.6, 384, 672))
        self.assertEqual((p["transition_step"], p["steps"], p["sampler"], p["rho"]), (10, 20, "euler", 0.0))
        self.assertIn("10 de 20 pasos a 384x672", info)
        # el sampler del perfil no se toca: euler solo aplica al tramo progresivo
        self.assertEqual(c["sampler"], "res_multistep")

    def test_no_cambia_el_semaforo(self):
        normal, _ = config(sampling="Normal")
        progresivo, _ = config()
        self.assertEqual(normal["planner"], progresivo["planner"])

    def test_el_tramo_inicial_nunca_baja_de_384(self):
        for w, h in [(480, 832), (544, 960), (640, 1120), (736, 1344), (768, 1344), (832, 480),
                     (1120, 640), (1344, 768), (1024, 1024), (704, 704), (576, 1024)]:
            p = plan_progressive(True, "Auto", w, h, 20, env=LISTO)
            self.assertGreaterEqual(p["lowres_scale"], 0.5, (w, h))
            if p["enabled"]:
                self.assertGreaterEqual(min(p["low_width"], p["low_height"]), 384, (w, h))
                self.assertLess(p["lowres_scale"], 0.9, (w, h))

    def test_mismo_redondeo_que_selflift(self):
        # SelfLift: h = max(2, round(H * escala / 2) * 2) sobre el latente
        self.assertEqual(low_side(1120, 0.6), 42 * 16)
        self.assertEqual(low_side(640, 0.6), 24 * 16)
        self.assertEqual(low_side(800, 0.5), 24 * 16)   # round(12.5) = 12
        self.assertEqual(auto_scale(736, 1344), 0.55)
        self.assertEqual(auto_scale(768, 1344), 0.5)

    def test_0_30_mp_no_aplica_y_se_renderiza_normal(self):
        c, info = config(w=416, h=736, frames=192)
        p = c["progressive"]
        self.assertEqual((p["requested"], p["enabled"], p["status"]), (True, False, "NO_APLICA"))
        self.assertIn("se renderiza normal", info)

    def test_calidad_mueve_la_transicion(self):
        self.assertEqual(transition_for(20, 70, "Auto", 10), 10)
        self.assertLess(transition_for(20, 100, "Auto", 10), 10)
        self.assertGreater(transition_for(20, 30, "Auto", 10), 10)
        for steps in (2, 4, 13, 20, 30):
            for quality in (0, 50, 70, 100):
                k = transition_for(steps, quality, "Auto", 10)
                self.assertTrue(1 <= k <= steps - 1, (steps, quality, k))
        c, _ = config(quality=100)
        self.assertEqual((c["steps"], c["progressive"]["transition_step"]), (23, 9))

    def test_advanced_respeta_valores_y_avisa_bajo_384(self):
        c, _ = config(mode="Advanced", advanced_transition=30, advanced_lowres_scale=0.3)
        p = c["progressive"]
        self.assertEqual((p["enabled"], p["transition_step"]), (True, 19))
        self.assertEqual((p["low_width"], p["low_height"]), (192, 320))
        self.assertTrue(any("bajo 384" in n for n in p["notes"]))
        # en Advanced no se bloquea por tamano: el usuario lo pidio explicito
        c, _ = config(mode="Advanced", w=416, h=736, advanced_lowres_scale=0.5)
        self.assertTrue(c["progressive"]["enabled"])

    def test_advanced_con_escala_0_usa_la_automatica(self):
        c, _ = config(mode="Advanced")
        p = c["progressive"]
        self.assertEqual((p["lowres_scale"], p["low_width"], p["low_height"]), (0.6, 384, 672))
        c, _ = config(mode="Advanced", w=736, h=1344)
        self.assertEqual((c["progressive"]["low_width"], c["progressive"]["low_height"]), (416, 736))
        c, _ = config(mode="Advanced", w=416, h=736)
        self.assertEqual(c["progressive"]["status"], "NO_APLICA")

    def test_las_faltas_se_ven_antes_de_ejecutar(self):
        casos = [({"selflift": False, "upscaler": UPSCALER}, "FALTA_SELFLIFT"),
                 ({"selflift": True, "upscaler": ""}, "FALTA_ESCALADOR"),
                 ({"selflift": None, "upscaler": None}, "SIN_VERIFICAR")]
        for env, status in casos:
            p = config(env=env)[0]["progressive"]
            self.assertEqual((p["status"], p["enabled"]), (status, True), env)
        self.assertIn("falta SelfLift", describe(config(env=casos[0][0])[0]["progressive"]))

    def test_normal_deja_todo_como_estaba(self):
        c, info = config(sampling="Normal")
        self.assertEqual((c["sampling"], c["progressive"]["status"]), ("Normal", "OFF"))
        self.assertFalse(c["progressive"]["enabled"])
        self.assertIn("muestreo: normal", info)

    def test_segundo_pase_activo_avisa(self):
        con, _ = config(refine=True)
        sin, _ = config(refine=False)
        self.assertTrue(any("dos veces" in n for n in con["progressive"]["notes"]))
        self.assertFalse(any("dos veces" in n for n in sin["progressive"]["notes"]))


class PreviewTests(unittest.TestCase):
    def body(self, **fields):
        base = {"width": 640, "height": 1120, "frames": 124, "muestreo": "Progresivo"}
        base.update(fields)
        return {"fields": base}

    @patch("cineconia_h3.progressive.detect_environment", return_value=LISTO)
    @patch("cineconia_h3.optimizer_config.detect_hardware", return_value=GPU16)
    def test_la_vista_previa_lee_los_campos_opcionales(self, *_):
        p = NODES.preview_h3(self.body())["config"]["progressive"]
        self.assertEqual((p["status"], p["low_width"], p["low_height"]), ("READY", 384, 672))

    @patch("cineconia_h3.optimizer_config.detect_hardware", return_value=GPU16)
    def test_la_vista_previa_valida_los_campos_opcionales(self, _):
        for campos in ({"muestreo": "Turbo"}, {"transicion_advanced": 0},
                       {"escala_inicial_advanced": 1.5}, {"escala_inicial_advanced": -0.1},
                       {"transicion_advanced": float("nan")}):
            with self.assertRaises(ValueError, msg=campos):
                NODES.preview_h3(self.body(**campos))


def sigmas_de(pasos):
    return [round(1.0 - i / pasos, 4) for i in range(pasos + 1)]


class FakeSelfLift:
    FUNCTION = "sample"
    llamadas = []

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": dict.fromkeys(ENTRADAS_SELFLIFT),
                "optional": dict.fromkeys(("model_hires", "highres_tiling", "upscaler_unload"))}

    def sample(self, **kwargs):
        FakeSelfLift.llamadas.append(kwargs)
        return ({"samples": "progresivo"},)


def fake_nodes(con_selflift=True, selflift=FakeSelfLift):
    llamadas = []

    def core(name, fn):
        class Node:
            FUNCTION = "run"

            def run(self, **kwargs):
                llamadas.append((name, kwargs))
                return (fn(kwargs),)
        return Node

    mapping = {
        "BasicScheduler": core("BasicScheduler", lambda kw: sigmas_de(kw["steps"])),
        "KSamplerSelect": core("KSamplerSelect", lambda kw: "sampler:" + kw["sampler_name"]),
        "BasicGuider": core("BasicGuider", lambda kw: "guia"),
        "RandomNoise": core("RandomNoise", lambda kw: "ruido"),
        "SamplerCustomAdvanced": core("SamplerCustomAdvanced", lambda kw: {"samples": "normal"}),
        "ConditioningZeroOut": core("ConditioningZeroOut", lambda kw: "cero"),
    }
    if con_selflift:
        mapping["SelfLiftH3Sampler"] = selflift
    return SimpleNamespace(NODE_CLASS_MAPPINGS=mapping), llamadas


LATENTE = {"samples": SimpleNamespace(shape=(1, 24, 31, 70, 40))}   # 640x1120


class RenderProgresivoTests(unittest.TestCase):
    def setUp(self):
        FakeSelfLift.llamadas = []

    def test_llama_a_selflift_con_la_politica_del_optimizador(self):
        c, _ = config(refine=False)
        fake, llamadas = fake_nodes()
        with patch.dict(sys.modules, {"nodes": fake}):
            out = CineH3OptimizedSampler().render("modelo", "positivo", LATENTE, c, 833)
        kw = FakeSelfLift.llamadas[0]
        self.assertEqual(out["result"][0], {"samples": "progresivo"})
        self.assertEqual((kw["cfg"], kw["rho"], kw["transition_step"], kw["lowres_scale"]), (1.0, 0.0, 10, 0.6))
        self.assertEqual((kw["upscaler_model"], kw["vae"], kw["seed"]), (UPSCALER, None, 833))
        self.assertEqual((kw["sampler"], kw["negative"], kw["positive"]), ("sampler:euler", "cero", "positivo"))
        self.assertEqual((kw["highres_tiling"], kw["upscaler_unload"]), (False, True))
        self.assertIs(kw["latent_image"], LATENTE)
        self.assertIn(("KSamplerSelect", {"sampler_name": "euler"}), llamadas)
        self.assertNotIn("SamplerCustomAdvanced", [n for n, _ in llamadas])
        info = out["result"][1]
        self.assertIn("10 de 20 pasos a 384x672 -> 640x1120", info)
        resumen = out["ui"]["h3_render"][0]
        self.assertEqual((resumen["mode"], resumen["low"], resumen["full"]), ("progresivo", [384, 672], [640, 1120]))

    def test_sin_selflift_el_error_dice_como_instalarlo(self):
        fake, _ = fake_nodes(con_selflift=False)
        with patch.dict(sys.modules, {"nodes": fake}):
            with self.assertRaises(RuntimeError) as err:
                CineH3OptimizedSampler().render("m", "p", LATENTE, config()[0], 1)
        self.assertIn("facok/comfyui-SelfLift", str(err.exception))
        self.assertIn(SELFLIFT_COMMIT, str(err.exception))

    @patch("cineconia_h3.progressive.detect_environment", return_value={"selflift": True, "upscaler": ""})
    def test_sin_escalador_el_error_dice_donde_ponerlo(self, _):
        fake, _ = fake_nodes()
        c = config(env={"selflift": True, "upscaler": None})[0]
        with patch.dict(sys.modules, {"nodes": fake}):
            with self.assertRaises(RuntimeError) as err:
                CineH3OptimizedSampler().render("m", "p", LATENTE, c, 1)
        self.assertIn("latent_upscale_models", str(err.exception))

    def test_si_selflift_cambia_su_interfaz_se_avisa(self):
        class Nuevo(FakeSelfLift):
            @classmethod
            def INPUT_TYPES(cls):
                spec = FakeSelfLift.INPUT_TYPES()
                spec["required"]["parametro_nuevo"] = None
                return spec
        fake, _ = fake_nodes(selflift=Nuevo)
        with patch.dict(sys.modules, {"nodes": fake}):
            with self.assertRaises(RuntimeError) as err:
                CineH3OptimizedSampler().render("m", "p", LATENTE, config()[0], 1)
        self.assertIn("parametro_nuevo", str(err.exception))

    def test_la_transicion_se_ajusta_al_calendario_real(self):
        fake, _ = fake_nodes()
        plan = {"transition_step": 10, "lowres_scale": 0.5, "upscaler": UPSCALER,
                "low_width": 320, "low_height": 560}
        _, detalle = run_selflift("m", "p", LATENTE, [1.0, 0.7, 0.4, 0.1, 0.0], 1, plan,
                                  lambda *a, **k: "x", mapping=fake.NODE_CLASS_MAPPINGS)
        self.assertEqual(detalle["transition_step"], 3)
        # SelfLift exige sigma < 1 al retomar en alta: se corre un paso
        plan["transition_step"] = 1
        _, detalle = run_selflift("m", "p", LATENTE, [1.0, 1.0, 0.5, 0.2, 0.0], 1, plan,
                                  lambda *a, **k: "x", mapping=fake.NODE_CLASS_MAPPINGS)
        self.assertEqual(detalle["transition_step"], 2)

    def test_si_no_aplica_renderiza_normal_aunque_haya_selflift(self):
        fake, llamadas = fake_nodes()
        c = config(w=416, h=736)[0]
        with patch.dict(sys.modules, {"nodes": fake}):
            out = CineH3OptimizedSampler().render("m", "p", LATENTE, c, 1)
        self.assertEqual(out["result"][0], {"samples": "normal"})
        self.assertEqual(FakeSelfLift.llamadas, [])
        self.assertIn(("KSamplerSelect", {"sampler_name": "res_multistep"}), llamadas)


if __name__ == "__main__":
    unittest.main()
