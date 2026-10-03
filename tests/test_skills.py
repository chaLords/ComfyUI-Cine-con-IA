"""Skills de prompt de escena: cumplen la ley y caben en Claude y ChatGPT."""
import importlib.util
from pathlib import Path
import re
import unittest

from cineconia_h3.camera_director import SHOTS, framing_warnings, scene_law_warnings

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "cineconia-escena-h3"
SPEC = importlib.util.spec_from_file_location("cineconia_build051_skills", ROOT / "tools" / "build_workflow051.py")
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)


def bloques(ruta):
    return re.findall(r"```text\n(.*?)\n```", ruta.read_text(encoding="utf-8"), re.S)


class SkillTests(unittest.TestCase):
    def test_claude_skill_header(self):
        texto = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        cabecera = re.match(r"---\nname: (.+)\ndescription: (.+)\n---\n", texto)
        self.assertIsNotNone(cabecera)
        nombre, descripcion = cabecera.groups()
        self.assertEqual(nombre, SKILL.name)
        self.assertRegex(nombre, r"^[a-z0-9-]{1,64}$")
        self.assertLessEqual(len(descripcion), 1024)
        for ref in re.findall(r"\]\((references/[^)]+)\)", texto):
            self.assertTrue((SKILL / ref).is_file(), ref)

    def test_chatgpt_instructions_fit(self):
        texto = (ROOT / "skills" / "chatgpt" / "INSTRUCCIONES_GPT.md").read_text(encoding="utf-8")
        self.assertLess(len(texto), 8000)

    def test_examples_obey_the_law_with_every_shot(self):
        ejemplos = bloques(SKILL / "references" / "ejemplos.md")
        self.assertEqual(len(ejemplos), 3)
        for i, prompt in enumerate(ejemplos, 1):
            escena = {"schema": "cineconia.h3.scene/v1", "raw_prompt": prompt}
            self.assertEqual(scene_law_warnings(escena), [], i)
            for plano in SHOTS:
                self.assertEqual(framing_warnings(escena, plano, "fijo"), [], (i, plano))
            for seccion in ("subject_definitions:", "summary:", "retention_analysis:",
                            "detailed_description:", "overall_soundscape:", "non_diegetic_music:"):
                self.assertIn(seccion, prompt, i)
            self.assertNotIn("camera:", prompt)

    def test_first_example_is_the_051_prompt(self):
        self.assertEqual(bloques(SKILL / "references" / "ejemplos.md")[0], BUILD.PROMPT_UNIVERSAL)


if __name__ == "__main__":
    unittest.main()
