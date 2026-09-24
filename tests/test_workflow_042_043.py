"""El 042 y el 043 son coherentes y sus notas dicen lo que los nodos van a mostrar."""
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
EJEMPLOS = ROOT / "examples"
SPEC = importlib.util.spec_from_file_location("cineconia_nodes_workflow042", ROOT / "nodes.py")
NODES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(NODES)

from cineconia_h3.comfy_nodes import CineH3Optimizer  # noqa: E402

EXTERNOS = {"MarkdownNote", "LoadImage", "ModelPreviewOverrideKJ", "VHS_VideoCombine", "PrimitiveInt"}
VIRTUALES = {"CineCronometro"}   # solo existe en el navegador
GPU16 = {"available": True, "name": "RTX 4060 Ti", "total_gb": 15.99, "free_gb": 14.2, "source": "test"}
LISTO = {"selflift": True, "upscaler": "minimax_h3_latent_upscaler_3d_bf16.safetensors"}
# fuera de ComfyUI no hay comfy.samplers: las listas que da el core
SAMPLERS = ["euler", "euler_ancestral", "res_multistep", "er_sde", "dpmpp_2m"]
SCHEDULERS = ["simple", "normal", "karras", "beta"]


def cargar(nombre):
    return json.loads(next(EJEMPLOS.glob(nombre + ".*.json")).read_text(encoding="utf-8"))


def lado_escalado(px, escala):
    """El redondeo de MinimaxH3LatentUpscaler3D con align=32 y VAE 16."""
    return round(round(px * escala / 32) * 32 / 16) * 16


class Coherencia:
    nombre = None

    @classmethod
    def setUpClass(cls):
        cls.workflow = cargar(cls.nombre)
        cls.nodes = {n["id"]: n for n in cls.workflow["nodes"]}
        cls.nota = next(n for n in cls.workflow["nodes"] if n["type"] == "MarkdownNote")["widgets_values"][0]

    def enlace(self, link_id):
        return next(l for l in self.workflow["links"] if l[0] == link_id)

    def origen(self, node, entrada):
        link_id = next(i["link"] for i in node["inputs"] if i["name"] == entrada)
        return self.enlace(link_id)[1]

    def test_ids_orden_y_enlaces_unicos(self):
        orders = sorted(n["order"] for n in self.workflow["nodes"])
        self.assertEqual(orders, list(range(len(orders))))
        self.assertEqual(len(self.nodes), len(self.workflow["nodes"]))
        link_ids = [link[0] for link in self.workflow["links"]]
        self.assertEqual(len(link_ids), len(set(link_ids)))
        self.assertLessEqual(max(link_ids), self.workflow["last_link_id"])
        self.assertLessEqual(max(self.nodes), self.workflow["last_node_id"])

    def test_cada_enlace_tiene_extremos_slots_y_tipos_coherentes(self):
        for link_id, a, a_slot, b, b_slot, kind in self.workflow["links"]:
            out, inp = self.nodes[a]["outputs"][a_slot], self.nodes[b]["inputs"][b_slot]
            self.assertEqual(out["type"], kind, link_id)
            self.assertEqual(inp["type"], kind, link_id)
            self.assertIn(link_id, out["links"], link_id)
            self.assertEqual(inp["link"], link_id, link_id)
        for node in self.workflow["nodes"]:
            for out in node.get("outputs", []):
                for link_id in out.get("links") or []:
                    self.enlace(link_id)
            for inp in node.get("inputs", []):
                if inp.get("link") is not None:
                    self.assertEqual(self.enlace(inp["link"])[3], node["id"])

    def test_el_orden_respeta_las_dependencias(self):
        for _, a, _, b, _, _ in self.workflow["links"]:
            self.assertLess(self.nodes[a]["order"], self.nodes[b]["order"])

    def test_todos_los_nodos_existen(self):
        for node in self.workflow["nodes"]:
            if node["type"] not in EXTERNOS | VIRTUALES:
                self.assertIn(node["type"], NODES.NODE_CLASS_MAPPINGS, node["type"])

    def test_tiene_un_cronometro_vacio_y_suelto(self):
        cronos = [n for n in self.workflow["nodes"] if n["type"] == "CineCronometro"]
        self.assertEqual(len(cronos), 1)
        c = cronos[0]
        self.assertEqual((c["inputs"], c["outputs"], c["properties"]), ([], [], {"historial": []}))
        self.assertNotIn("widgets_values", c)
        self.assertIn("Cronómetro", self.nota)

    def test_una_sola_semilla_para_los_dos_renders(self):
        renders = [n for n in self.workflow["nodes"] if n["type"] == "CineH3OptimizedSampler"]
        self.assertEqual(len(renders), 2)
        origenes = {self.origen(r, "semilla") for r in renders}
        self.assertEqual(len(origenes), 1)
        semilla = self.nodes[origenes.pop()]
        self.assertEqual((semilla["type"], semilla["widgets_values"]), ("PrimitiveInt", [833, "fixed"]))

    def test_optimizadores_en_el_orden_de_input_types(self):
        spec = CineH3Optimizer.INPUT_TYPES()
        for node in self.workflow["nodes"]:
            if node["type"] == "CineH3Optimizer":
                self.assertEqual(list(node["widgets_values_named"]),
                                 list(spec["required"]) + list(spec["optional"]))
                self.assertEqual(node["widgets_values"], list(node["widgets_values_named"].values()))

    def preview(self, opt, **cambios):
        by_type = {n["type"]: n for n in self.workflow["nodes"]}
        size = dict(by_type["CineRatioSize"]["widgets_values_named"])
        dur = dict(by_type["CineDuracion"]["widgets_values_named"])
        fields = dict(opt["widgets_values_named"])
        fields.update({k: v for k, v in cambios.items() if k in fields})
        body = {"fields": fields, "sources": {
            "width": {"type": "CineRatioSize", "fields": size, "output": "width"},
            "height": {"type": "CineRatioSize", "fields": size, "output": "height"},
            "frames": {"type": "CineDuracion", "fields": dur, "output": "frames"}}}
        with patch("cineconia_h3.optimizer_config.detect_hardware", return_value=GPU16), \
                patch("cineconia_h3.progressive.detect_environment", return_value=LISTO), \
                patch("cineconia_h3.comfy_nodes._samplers", return_value=SAMPLERS), \
                patch("cineconia_h3.comfy_nodes._schedulers", return_value=SCHEDULERS):
            return NODES.preview_h3(body)["config"]


class Workflow042Tests(Coherencia, unittest.TestCase):
    nombre = "042"

    def test_es_el_041_mas_el_cronometro(self):
        w041 = cargar("041")
        sin_crono = [n for n in self.workflow["nodes"] if n["type"] != "CineCronometro"]
        self.assertEqual(len(sin_crono), len(w041["nodes"]))
        self.assertEqual(self.workflow["links"], w041["links"])
        opt = lambda w: sorted(json.dumps(n["widgets_values_named"], sort_keys=True)
                               for n in w["nodes"] if n["type"] == "CineH3Optimizer")
        self.assertEqual(opt(self.workflow), opt(w041))

    def test_cada_rama_guarda_su_video(self):
        prefijos = sorted(n["widgets_values"]["filename_prefix"] for n in self.workflow["nodes"]
                          if n["type"] == "VHS_VideoCombine")
        self.assertTrue(prefijos[0].startswith("CineConIA/042_A_normal_"))
        self.assertTrue(prefijos[1].startswith("CineConIA/042_B_progresivo_"))
        for p in ("042_A_normal_", "042_B_progresivo_"):
            self.assertIn(p, self.nota)

    def test_la_nota_coincide_con_el_aviso_del_optimizador(self):
        b = next(n for n in self.workflow["nodes"] if n["type"] == "CineH3Optimizer"
                 and n["widgets_values_named"]["muestreo"] == "Progresivo")
        p = self.preview(b)["progressive"]
        aviso = "• {} de {} pasos a {}×{}".format(p["transition_step"], p["steps"], p["low_width"], p["low_height"])
        self.assertIn(aviso, self.nota)


class Workflow043Tests(Coherencia, unittest.TestCase):
    nombre = "043"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        opts = [n for n in cls.workflow["nodes"] if n["type"] == "CineH3Optimizer"]
        cls.opt = {n["widgets_values_named"]["modo"]: n for n in opts}

    def test_las_dos_ramas_escalan_y_refinan(self):
        escalas = [n for n in self.workflow["nodes"] if n["type"] == "CineEscalarRefinar"]
        self.assertEqual(len(escalas), 2)
        for esc in escalas:
            v = esc["widgets_values_named"]
            self.assertEqual((v["semilla"], v["control_after_generate"], v["sampler"]), (835, "fixed", "er_sde"))
            render = self.nodes[self.origen(esc, "latente")]
            self.assertEqual(render["type"], "CineH3OptimizedSampler")
            opt = self.nodes[self.origen(render, "config")]
            for entrada in ("activar", "escala", "pasos"):
                self.assertEqual(self.origen(esc, entrada), opt["id"], entrada)

    def test_el_troceo_del_modelo_lo_pone_la_rama_pesada(self):
        cargar_h3 = next(n for n in self.workflow["nodes"] if n["type"] == "CineCargarH3")
        for entrada in ("trocear_atencion", "trocear_ffn"):
            self.assertEqual(self.origen(cargar_h3, entrada), self.opt["Advanced"]["id"])

    def test_b_es_la_receta_del_033(self):
        b = self.opt["Advanced"]["widgets_values_named"]
        self.assertEqual((b["pasos_advanced"], b["sampler_advanced"], b["scheduler_advanced"],
                          b["refinar"], b["escala_refinado_advanced"], b["muestreo"]),
                         (8, "er_sde", "beta", True, 2.0, "Normal"))
        self.assertEqual(self.opt["Auto"]["widgets_values_named"]["muestreo"], "Normal")

    def test_la_nota_coincide_con_lo_que_muestran_los_nodos(self):
        a, b = self.preview(self.opt["Auto"]), self.preview(self.opt["Advanced"])
        self.assertEqual((a["width"], a["height"], a["frames"]), (416, 736, 124))
        self.assertEqual((b["width"], b["height"], b["frames"]), (416, 736, 124))
        self.assertEqual((a["steps"], a["sampler"], a["scheduler"]), (20, "res_multistep", "simple"))
        self.assertEqual((b["steps"], b["sampler"], b["scheduler"]), (8, "er_sde", "beta"))
        self.assertIn("20 pasos res_multistep/simple", self.nota)
        self.assertIn("8 pasos er_sde/beta", self.nota)
        for cfg in (a, b):
            final = "{}×{}".format(lado_escalado(cfg["width"], cfg["refine_scale"]),
                                   lado_escalado(cfg["height"], cfg["refine_scale"]))
            self.assertIn("×{:g} a **{}**".format(cfg["refine_scale"], final), self.nota)
        self.assertEqual(a["planner"]["status"], "SAFE")
        self.assertEqual(b["planner"]["status"], "TIGHT")
        self.assertIn("amarillo", self.nota)

        menos = self.preview(self.opt["Advanced"], escala_refinado_advanced=1.5)
        self.assertEqual(menos["planner"]["status"], "SAFE")
        final = "{}×{}".format(lado_escalado(416, 1.5), lado_escalado(736, 1.5))
        self.assertIn("**1.5** (verde, {})".format(final), self.nota)

    def test_cada_rama_guarda_su_video(self):
        prefijos = sorted(n["widgets_values"]["filename_prefix"] for n in self.workflow["nodes"]
                          if n["type"] == "VHS_VideoCombine")
        self.assertTrue(prefijos[0].startswith("CineConIA/043_A_auto_"))
        self.assertTrue(prefijos[1].startswith("CineConIA/043_B_receta033_"))
        for p in ("043_A_auto_", "043_B_receta033_"):
            self.assertIn(p, self.nota)


if __name__ == "__main__":
    unittest.main()
