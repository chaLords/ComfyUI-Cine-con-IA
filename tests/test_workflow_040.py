"""El 040 es coherente y la nota dice lo que el nodo va a mostrar de verdad."""
import importlib.util
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
WORKFLOW = ROOT / "examples" / "040.REALminimax-H3-CineconIA-Presets-VRAM-v1.json"
SPEC = importlib.util.spec_from_file_location("cineconia_nodes_workflow040", ROOT / "nodes.py")
NODES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(NODES)

EXTERNOS = {"MarkdownNote", "LoadImage", "ModelPreviewOverrideKJ", "VHS_VideoCombine"}


def gpu_16gb():
    return {"available": True, "name": "RTX 4060 Ti", "total_gb": 15.99, "free_gb": 14.2, "source": "test"}


class Workflow040Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = json.loads(WORKFLOW.read_text(encoding="utf-8"))
        cls.nodes = {n["id"]: n for n in cls.workflow["nodes"]}
        cls.by_type = {n["type"]: n for n in cls.workflow["nodes"]}

    def test_ids_orden_y_enlaces_unicos(self):
        orders = sorted(n["order"] for n in self.workflow["nodes"])
        self.assertEqual(orders, list(range(len(orders))))
        link_ids = [link[0] for link in self.workflow["links"]]
        self.assertEqual(len(link_ids), len(set(link_ids)))
        self.assertEqual(max(link_ids), self.workflow["last_link_id"])

    def test_cada_enlace_tiene_extremos_slots_y_tipos_coherentes(self):
        for link_id, a, a_slot, b, b_slot, kind in self.workflow["links"]:
            out, inp = self.nodes[a]["outputs"][a_slot], self.nodes[b]["inputs"][b_slot]
            self.assertEqual(out["type"], kind, link_id)
            self.assertEqual(inp["type"], kind, link_id)
            self.assertIn(link_id, out["links"], link_id)
            self.assertEqual(inp["link"], link_id, link_id)

    def test_todos_los_nodos_existen(self):
        for node_type in self.by_type:
            if node_type not in EXTERNOS:
                self.assertIn(node_type, NODES.NODE_CLASS_MAPPINGS, node_type)

    def test_valores_del_ejemplo(self):
        opt = self.by_type["CineH3Optimizer"]["widgets_values_named"]
        self.assertEqual((opt["modo"], opt["perfil"], opt["refinar"]), ("Auto", "AUTO", True))
        self.assertEqual((opt["resolucion"], opt["ahorro_vram"]), (60, 50))
        self.assertEqual(self.by_type["CineRatioSize"]["widgets_values_named"]["tamano"], "0.30 MP  ·  base medida")
        self.assertEqual(self.by_type["CineEscalarRefinar"]["mode"], 0)
        self.assertIn("040_", self.by_type["VHS_VideoCombine"]["widgets_values"]["filename_prefix"])

    def _preview(self, **cambios):
        oc = sys.modules["cineconia_h3.optimizer_config"]
        original = oc.detect_hardware
        oc.detect_hardware = gpu_16gb
        try:
            size = dict(self.by_type["CineRatioSize"]["widgets_values_named"])
            dur = dict(self.by_type["CineDuracion"]["widgets_values_named"])
            size.update({k: v for k, v in cambios.items() if k in size})
            dur.update({k: v for k, v in cambios.items() if k in dur})
            fields = dict(self.by_type["CineH3Optimizer"]["widgets_values_named"])
            fields.update({k: v for k, v in cambios.items() if k in fields})
            body = {"fields": fields, "sources": {
                "width": {"type": "CineRatioSize", "fields": size, "output": "width"},
                "height": {"type": "CineRatioSize", "fields": size, "output": "height"},
                "frames": {"type": "CineDuracion", "fields": dur, "output": "frames"}}}
            return NODES.preview_h3(body)
        finally:
            oc.detect_hardware = original

    def test_la_nota_coincide_con_lo_que_muestra_el_nodo(self):
        r = self._preview()
        self.assertEqual(r["ladder"], {"AUTO": "SAFE", "8 GB": "SAFE", "12 GB": "SAFE",
                                       "16 GB": "SAFE", "24 GB": "TIGHT", "32 GB": "RISKY"})
        c = r["config"]
        self.assertEqual((c["steps"], c["attention_chunks"], c["refine_scale"]), (20, 26, 1.27))

        r = self._preview(tamano="0.40 MP")
        self.assertEqual(r["ladder"]["AUTO"], "TIGHT")
        self.assertEqual((r["ladder"]["8 GB"], r["ladder"]["12 GB"]), ("SAFE", "SAFE"))

        r = self._preview(segundos=15)
        self.assertEqual((r["ladder"]["AUTO"], r["ladder"]["8 GB"]), ("RISKY", "SAFE"))

        r = self._preview(segundos=15, refinar=False)
        self.assertTrue(all(v == "SAFE" for k, v in r["ladder"].items() if k != "32 GB"))
        self.assertEqual(r["ladder"]["32 GB"], "TIGHT")


if __name__ == "__main__":
    unittest.main()
