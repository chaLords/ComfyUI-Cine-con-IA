"""051: el 050 con prompt universal y cámara automática. Coherencia estática, no certifica un render."""
import importlib.util
import json
from pathlib import Path
import unittest

from cineconia_h3.camera_director import CineCameraDirectorH3, auto_camera
import test_workflow_050 as base050

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("cineconia_build051", ROOT / "tools" / "build_workflow051.py")
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)


class Workflow051Tests(base050.Workflow050Tests):
    """Hereda las pruebas del 050: todo lo que no es cámara tiene que seguir igual."""

    @classmethod
    def setUpClass(cls):
        cls.workflow = json.loads(next((ROOT / "examples").glob("051.*.json")).read_text(encoding="utf-8"))
        cls.nodes = {n["id"]: n for n in cls.workflow["nodes"]}
        cls.by_type = {n["type"]: n for n in cls.nodes.values()}
        cls.base = json.loads(next((ROOT / "examples").glob("050.*.json")).read_text(encoding="utf-8"))

    def test_empty_log_and_honest_note(self):
        self.assertEqual(self.by_type["CineCronometro"]["properties"], {"historial": []})
        note = self.by_type["MarkdownNote"]["widgets_values"][0]
        for text in ("EXPERIMENTAL", "Sin probar", "La ley", "cineconia-escena-h3", "Rehacer texto automático"):
            self.assertIn(text, note)
        self.assertTrue(self.by_type["VHS_VideoCombine"]["widgets_values"]["filename_prefix"].startswith("CineConIA/051_camara_auto_"))

    def test_built_by_the_tool(self):
        self.assertEqual(BUILD.construir(), self.workflow)
        self.assertNotEqual(self.workflow["id"], self.base["id"])

    def test_only_the_camera_changes_from_050(self):
        base = {n["id"]: n for n in self.base["nodes"]}
        distintos = sorted(i for i, n in self.nodes.items() if n != base[i])
        self.assertEqual(distintos, [510, 511, 512, 34003])
        self.assertEqual(self.workflow["links"], self.base["links"])

    def test_director_box_holds_the_automatic_text(self):
        director = self.by_type["CineCameraDirectorH3"]
        valores = director["widgets_values_named"]
        self.assertIs(valores["camara_automatica"], True)
        esperado, aviso = auto_camera(valores["plano"], valores["angulo"], valores["movimiento"],
                                      valores["intensidad"], valores["lente"], valores["profundidad_campo"])
        self.assertEqual(aviso, "")
        self.assertEqual(valores["instruccion_camara"], esperado)
        self.assertEqual(director["properties"]["texto_auto"], esperado)

    def test_scene_prompt_obeys_the_law(self):
        texto = self.by_type["CineSimplePromptH3"]["widgets_values"][0]
        v = self.by_type["CineCameraDirectorH3"]["widgets_values_named"]
        out = CineCameraDirectorH3().dirigir({"schema": "cineconia.h3.scene/v1", "raw_prompt": texto}, **v)
        self.assertEqual(out["ui"]["camara_avisos"], [])
        # la cámara entra una sola vez, la de la caja
        self.assertEqual(out["result"][0].count("The shot is framed as"), 1)
        self.assertIn("[Shot 1] " + v["instruccion_camara"], out["result"][0])


if __name__ == "__main__":
    unittest.main()
