import importlib.util
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / "examples" / "039.REALminimax-H3-CineconIA-Optimizer-v1.json"
SPEC = importlib.util.spec_from_file_location("cineconia_nodes_workflow", ROOT / "nodes.py")
NODES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(NODES)


class Workflow039Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = json.loads(WORKFLOW.read_text(encoding="utf-8"))
        cls.nodes = {node["id"]: node for node in cls.workflow["nodes"]}

    def test_ids_and_execution_order_are_unique(self):
        self.assertEqual(len(self.nodes), len(self.workflow["nodes"]))
        orders = [node["order"] for node in self.workflow["nodes"]]
        self.assertEqual(sorted(orders), list(range(len(orders))))
        link_ids = [link[0] for link in self.workflow["links"]]
        self.assertEqual(len(link_ids), len(set(link_ids)))
        self.assertEqual(max(link_ids), self.workflow["last_link_id"])
        self.assertGreaterEqual(self.workflow["last_node_id"], max(self.nodes))

    def test_every_link_has_matching_endpoints_slots_and_types(self):
        for link_id, from_id, from_slot, to_id, to_slot, link_type in self.workflow["links"]:
            self.assertIn(from_id, self.nodes, link_id)
            self.assertIn(to_id, self.nodes, link_id)
            output = self.nodes[from_id]["outputs"][from_slot]
            input_ = self.nodes[to_id]["inputs"][to_slot]
            self.assertEqual(output["type"], link_type, link_id)
            self.assertEqual(input_["type"], link_type, link_id)
            self.assertIn(link_id, output["links"], link_id)
            self.assertEqual(input_["link"], link_id, link_id)

    def test_new_nodes_use_the_registered_real_interfaces(self):
        expected_widgets = {
            "CineScenePromptH3": 8,
            "CineCameraDirectorH3": 8,
            "CineH3Optimizer": 19,
            "CineH3OptimizedSampler": 1,
        }
        for node_type, widget_count in expected_widgets.items():
            self.assertIn(node_type, NODES.NODE_CLASS_MAPPINGS)
            node = next(n for n in self.nodes.values() if n["type"] == node_type)
            self.assertEqual(len(node["widgets_values"]), widget_count, node_type)
            cls = NODES.NODE_CLASS_MAPPINGS[node_type]
            schema = cls.INPUT_TYPES()
            declared = {**schema.get("required", {}), **schema.get("optional", {})}
            for input_ in node["inputs"]:
                self.assertIn(input_["name"], declared, (node_type, input_["name"]))
                declared_type = declared[input_["name"]][0]
                if isinstance(declared_type, str):
                    self.assertEqual(input_["type"], declared_type)
            output_schema = list(zip(cls.RETURN_NAMES, cls.RETURN_TYPES))
            workflow_outputs = [(o["name"], o["type"]) for o in node["outputs"]]
            self.assertEqual(workflow_outputs, output_schema, node_type)

    def test_038_generation_chain_is_preserved_around_new_modules(self):
        types = {node["type"] for node in self.nodes.values()}
        for required in (
            "CineCargarH3", "CineEscenaH3", "CineEscalarRefinar",
            "CineSalida", "ModelPreviewOverrideKJ", "VHS_VideoCombine",
        ):
            self.assertIn(required, types)
        self.assertNotIn("CinePrompt6", types)
        self.assertNotIn("CineRenderH3", types)
        camera = next(n for n in self.nodes.values() if n["type"] == "CineCameraDirectorH3")
        self.assertIn("three equal vertical panels", camera["widgets_values_named"]["instruccion_camara"])
        optimizer = next(n for n in self.nodes.values() if n["type"] == "CineH3Optimizer")
        self.assertEqual(optimizer["widgets_values_named"]["modo"], "Auto")
        self.assertEqual(optimizer["widgets_values_named"]["perfil"], "AUTO")


if __name__ == "__main__":
    unittest.main()
