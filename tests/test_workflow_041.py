"""El 041 es coherente y la nota dice lo que los nodos van a mostrar de verdad."""
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
WORKFLOW = ROOT / "examples" / "041.REALminimax-H3-CineconIA-Progresivo-AB-v1.json"
SPEC = importlib.util.spec_from_file_location("cineconia_nodes_workflow041", ROOT / "nodes.py")
NODES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(NODES)

from cineconia_h3.comfy_nodes import CineH3Optimizer  # noqa: E402

EXTERNOS = {"MarkdownNote", "LoadImage", "ModelPreviewOverrideKJ", "VHS_VideoCombine", "PrimitiveInt"}
GPU16 = {"available": True, "name": "RTX 4060 Ti", "total_gb": 15.99, "free_gb": 14.2, "source": "test"}
LISTO = {"selflift": True, "upscaler": "minimax_h3_latent_upscaler_3d_bf16.safetensors"}


class Workflow041Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = json.loads(WORKFLOW.read_text(encoding="utf-8"))
        cls.nodes = {n["id"]: n for n in cls.workflow["nodes"]}
        cls.opt = {n["widgets_values_named"]["muestreo"]: n for n in cls.workflow["nodes"]
                   if n["type"] == "CineH3Optimizer"}
        cls.nota = next(n for n in cls.workflow["nodes"] if n["type"] == "MarkdownNote")["widgets_values"][0]

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
                    self.assertTrue(any(l[0] == link_id for l in self.workflow["links"]), link_id)

    def test_el_orden_respeta_las_dependencias(self):
        for _, a, _, b, _, _ in self.workflow["links"]:
            self.assertLess(self.nodes[a]["order"], self.nodes[b]["order"])

    def test_todos_los_nodos_existen(self):
        for node in self.workflow["nodes"]:
            if node["type"] not in EXTERNOS:
                self.assertIn(node["type"], NODES.NODE_CLASS_MAPPINGS, node["type"])
        self.assertNotIn("CineEscalarRefinar", {n["type"] for n in self.workflow["nodes"]})

    def test_las_dos_ramas_solo_difieren_en_el_muestreo(self):
        a = dict(self.opt["Normal"]["widgets_values_named"])
        b = dict(self.opt["Progresivo"]["widgets_values_named"])
        self.assertEqual(a.pop("muestreo"), "Normal")
        self.assertEqual(b.pop("muestreo"), "Progresivo")
        self.assertEqual(a, b)
        self.assertEqual((a["modo"], a["sampler_advanced"], a["pasos_advanced"], a["refinar"]),
                         ("Advanced", "euler", 20, False))
        self.assertEqual((a["transicion_advanced"], a["escala_inicial_advanced"]), (10, 0))
        # el orden de los valores es el de INPUT_TYPES: sirve aunque falten los nombres
        spec = CineH3Optimizer.INPUT_TYPES()
        self.assertEqual(list(self.opt["Normal"]["widgets_values_named"]),
                         list(spec["required"]) + list(spec["optional"]))

    def test_una_sola_semilla_para_las_dos_ramas(self):
        renders = [n for n in self.workflow["nodes"] if n["type"] == "CineH3OptimizedSampler"]
        self.assertEqual(len(renders), 2)
        origenes = set()
        for render in renders:
            link_id = next(i["link"] for i in render["inputs"] if i["name"] == "semilla")
            link = next(l for l in self.workflow["links"] if l[0] == link_id)
            origenes.add(link[1])
        self.assertEqual(len(origenes), 1)
        semilla = self.nodes[origenes.pop()]
        self.assertEqual((semilla["type"], semilla["widgets_values"]), ("PrimitiveInt", [833, "fixed"]))

    def test_cada_rama_guarda_su_video(self):
        prefijos = sorted(n["widgets_values"]["filename_prefix"] for n in self.workflow["nodes"]
                          if n["type"] == "VHS_VideoCombine")
        self.assertTrue(prefijos[0].startswith("CineConIA/041_A_normal_"))
        self.assertTrue(prefijos[1].startswith("CineConIA/041_B_progresivo_"))

    def _preview(self, muestreo, **cambios):
        by_type = {n["type"]: n for n in self.workflow["nodes"]}
        size = dict(by_type["CineRatioSize"]["widgets_values_named"])
        dur = dict(by_type["CineDuracion"]["widgets_values_named"])
        size.update({k: v for k, v in cambios.items() if k in size})
        dur.update({k: v for k, v in cambios.items() if k in dur})
        body = {"fields": dict(self.opt[muestreo]["widgets_values_named"]), "sources": {
            "width": {"type": "CineRatioSize", "fields": size, "output": "width"},
            "height": {"type": "CineRatioSize", "fields": size, "output": "height"},
            "frames": {"type": "CineDuracion", "fields": dur, "output": "frames"}}}
        with patch("cineconia_h3.optimizer_config.detect_hardware", return_value=GPU16), \
                patch("cineconia_h3.progressive.detect_environment", return_value=LISTO):
            return NODES.preview_h3(body)["config"]

    def test_la_nota_coincide_con_lo_que_muestran_los_nodos(self):
        a, b = self._preview("Normal"), self._preview("Progresivo")
        self.assertEqual((b["width"], b["height"], b["frames"]), (640, 1120, 124))
        p = b["progressive"]
        self.assertEqual((p["status"], p["transition_step"], p["steps"]), ("READY", 10, 20))
        aviso = "• {} de {} pasos a {}×{}".format(p["transition_step"], p["steps"], p["low_width"], p["low_height"])
        self.assertEqual(aviso, "• 10 de 20 pasos a 384×672")
        self.assertIn(aviso, self.nota)
        self.assertIn("640×1120", self.nota)
        self.assertFalse(a["progressive"]["enabled"])
        self.assertEqual(a["planner"], b["planner"])
        self.assertEqual(a["planner"]["status"], "SAFE")

        grande = self._preview("Progresivo", tamano="1.00 MP")
        p = grande["progressive"]
        self.assertEqual((p["low_width"], p["low_height"]), (416, 736))
        self.assertEqual((grande["width"], grande["height"]), (736, 1344))
        self.assertEqual(grande["planner"]["status"], "TIGHT")
        self.assertIn("416×736", self.nota)
        self.assertIn("736×1344", self.nota)


if __name__ == "__main__":
    unittest.main()
