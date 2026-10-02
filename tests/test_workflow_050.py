"""Receta de prueba Acc/PDD: coherencia estática, no certifica un render."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("cineconia_workflow050", ROOT / "nodes.py")
NODES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(NODES)


class Workflow050Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = json.loads(next((ROOT / "examples").glob("050.*.json")).read_text(encoding="utf-8"))
        cls.nodes = {n["id"]: n for n in cls.workflow["nodes"]}
        cls.by_type = {n["type"]: n for n in cls.nodes.values()}

    def test_graph(self):
        nodes, links = self.nodes, self.workflow["links"]
        self.assertEqual(len(nodes), len(self.workflow["nodes"]))
        self.assertEqual(sorted(n["order"] for n in nodes.values()), list(range(len(nodes))))
        self.assertEqual(len({l[0] for l in links}), len(links))
        for key, a, ai, b, bi, kind in links:
            self.assertIn(key, nodes[a]["outputs"][ai]["links"])
            self.assertEqual(nodes[b]["inputs"][bi]["link"], key)
            self.assertEqual(nodes[a]["outputs"][ai]["type"], kind)
            self.assertEqual(nodes[b]["inputs"][bi]["type"], kind)
            self.assertLess(nodes[a]["order"], nodes[b]["order"])
        for n in nodes.values():
            for i, inp in enumerate(n.get("inputs", [])):
                incoming = [l[0] for l in links if l[3:5] == [n["id"], i]]
                self.assertEqual(incoming, [] if inp["link"] is None else [inp["link"]])
            for i, out in enumerate(n.get("outputs", [])):
                self.assertEqual(out["links"], [l[0] for l in links if l[1:3] == [n["id"], i]])

    def test_serialized_widgets_match_current_order(self):
        for n in self.nodes.values():
            named = n.get("widgets_values_named")
            if named is None:
                continue
            actual = n["widgets_values"]
            self.assertEqual(actual, list(named.values()) if isinstance(actual, list) else named, n["type"])
            cls = NODES.NODE_CLASS_MAPPINGS.get(n["type"])
            if cls is None:
                continue
            spec = cls.INPUT_TYPES()
            fields = dict(spec.get("required", {}), **spec.get("optional", {}))
            widgets = [k for k, v in fields.items() if isinstance(v[0], list) or v[0] in ("STRING", "INT", "FLOAT", "BOOLEAN")]
            self.assertEqual(list(named), widgets, n["type"])

    def test_single_reference_single_sampler_no_refine(self):
        types = [n["type"] for n in self.nodes.values()]
        self.assertEqual(types.count("LoadImage"), 1)
        self.assertEqual(types.count("CineH3OptimizedSampler"), 1)
        self.assertNotIn("CineEscalarRefinar", types)
        self.assertNotIn("CineSelector", types)
        self.assertFalse(any("Deno" in t for t in types))
        self.assertIn([52, 516, 0, 517, 0, "LATENT"], self.workflow["links"])
        self.assertEqual(self.by_type["CineSalida"]["widgets_values_named"]["interpolar"], "no  ·  24 fps")
        self.assertEqual(self.by_type["PrimitiveInt"]["widgets_values"], [833, "fixed"])

    def test_acc_loader_contract(self):
        fields = self.by_type["CineCargarH3"]["widgets_values_named"]
        self.assertEqual(fields["acelerador"], NODES.ACELERADORES_H3[1])
        self.assertEqual(fields["acc_lora"], "MiniMax-H3-Ref2VA-Acc-8Step.safetensors")
        self.assertEqual((fields["shift_video"], fields["shift_audio"]), (12, 3))
        self.assertEqual(fields["vdn_lora"], "ninguno")
        for key in ("lora", "lora_2", "lora_3", "lora_4"):
            self.assertEqual(fields[key], "ninguno")
        self.assertIn("ref2va_pruned_int8", fields["modelo"])

    def test_effective_size_and_optimizer(self):
        width, height, _ = NODES.CineRatioSize().calcular(**self.by_type["CineRatioSize"]["widgets_values_named"])
        duration = NODES.CineDuracion()
        frames = getattr(duration, duration.FUNCTION)(**self.by_type["CineDuracion"]["widgets_values_named"])[0]
        self.assertEqual((width, height, frames), (960, 544, 124))
        fields = dict(self.by_type["CineH3Optimizer"]["widgets_values_named"], width=width, height=height, frames=frames)
        with patch("cineconia_h3.optimizer_config.detect_hardware", return_value={"available": True, "total_gb": 16, "free_gb": 14, "name": "test", "source": "test"}):
            config = NODES.CineH3Optimizer().configurar(**fields)["result"][0]
        self.assertEqual((config["steps"], config["sampler"], config["scheduler"], config["denoise"]), (8, "euler", "simple", 1))
        self.assertFalse(config["refine"])
        self.assertEqual(fields["muestreo"], "Normal")

    def test_empty_log_and_honest_note(self):
        self.assertEqual(self.by_type["CineCronometro"]["properties"], {"historial": []})
        note = self.by_type["MarkdownNote"]["widgets_values"][0]
        for text in ("EXPERIMENTAL", "Sin probar", "960×544", "124 fotogramas", "elige una imagen", "Cronómetro"):
            self.assertIn(text, note)
        self.assertTrue(self.by_type["VHS_VideoCombine"]["widgets_values"]["filename_prefix"].startswith("CineConIA/050_ref2va_acc_pdd_8p_"))


if __name__ == "__main__":
    unittest.main()
