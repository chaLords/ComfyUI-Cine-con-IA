"""Lo que recibe el usuario: el nodo solo, y las skills en la Release."""
import importlib.util
import io
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("cineconia_paquete", ROOT / "tools" / "paquete.py")
PAQUETE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PAQUETE)


def _git(*args):
    try:
        return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError):
        raise unittest.SkipTest("hace falta el repositorio Git")


def _primer_nivel(salida):
    return {linea.split("/")[0] for linea in salida.decode("utf-8").splitlines() if linea}


def _export_ignore():
    fuera = set()
    for linea in (ROOT / ".gitattributes").read_text(encoding="utf-8").splitlines():
        partes = linea.split()
        if partes and not partes[0].startswith("#") and "export-ignore" in partes[1:]:
            fuera.add(partes[0].strip("/"))
    return fuera


def _comfyignore():
    return {linea.strip().strip("/") for linea in
            (ROOT / ".comfyignore").read_text(encoding="utf-8").splitlines()
            if linea.strip() and not linea.startswith("#")}


class NodoTests(unittest.TestCase):
    def test_node_entries_exist(self):
        for entrada in PAQUETE.NODO:
            self.assertTrue((ROOT / entrada).exists(), entrada)

    def test_zip_and_registry_leave_out_the_same(self):
        # Lo guardado en Git y lo nuevo sin ignorar: todo lo que no es NODO se excluye.
        repositorio = _primer_nivel(_git("ls-files", "--cached", "--others", "--exclude-standard"))
        fuera = repositorio - set(PAQUETE.NODO)
        self.assertEqual(_export_ignore(), fuera)
        self.assertEqual(_comfyignore(), fuera)

    def test_github_zip_is_only_the_node(self):
        archivo = _git("archive", "--worktree-attributes", "--format=tar", "HEAD")
        with tarfile.open(fileobj=io.BytesIO(archivo)) as tar:
            en_zip = {nombre.split("/")[0] for nombre in tar.getnames()}
        en_head = _primer_nivel(_git("ls-tree", "--name-only", "HEAD"))
        self.assertEqual(en_zip, set(PAQUETE.NODO) & en_head)

    def test_workflows_use_the_list(self):
        rama = (ROOT / ".github" / "workflows" / "rama_comfyui.yml").read_text(encoding="utf-8")
        self.assertIn("python3 tools/paquete.py nodo", rama)
        self.assertIn("refs/heads/comfyui", rama)
        release = (ROOT / ".github" / "workflows" / "release.yml").read_text(encoding="utf-8")
        self.assertIn("python tools/paquete.py skills dist", release)
        self.assertIn("dist/*.zip", release)


class SkillsTests(unittest.TestCase):
    def test_packages_carry_the_skill_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            hechos = PAQUETE.armar_skills(tmp)
            self.assertEqual([ruta.name for ruta in hechos], list(PAQUETE.SKILLS))
            for ruta in hechos:
                with zipfile.ZipFile(ruta) as z:
                    archivos = PAQUETE.SKILLS[ruta.name]
                    self.assertEqual(z.namelist(), [interno for interno, _ in archivos])
                    for interno, origen in archivos:
                        self.assertEqual(z.read(interno), (ROOT / origen).read_bytes(), interno)
            # claude.ai pide la carpeta de la skill con SKILL.md dentro
            with zipfile.ZipFile(Path(tmp) / "cineconia-escena-h3.zip") as z:
                self.assertIn("cineconia-escena-h3/SKILL.md", z.namelist())

    def test_every_skill_file_is_packaged(self):
        guardados = {linea for linea in
                     _git("ls-files", "--cached", "--others", "--exclude-standard", "skills")
                     .decode("utf-8").splitlines()}
        empaquetados = {origen for archivos in PAQUETE.SKILLS.values() for _, origen in archivos}
        self.assertEqual(guardados, empaquetados)

    def test_same_content_same_zip(self):
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            for x, y in zip(PAQUETE.armar_skills(a), PAQUETE.armar_skills(b)):
                self.assertEqual(x.read_bytes(), y.read_bytes(), x.name)

    def test_readme_buttons(self):
        for readme in ("README.md", "README_ES.md"):
            texto = (ROOT / readme).read_text(encoding="utf-8")
            for nombre in PAQUETE.SKILLS:
                self.assertIn("releases/latest/download/" + nombre, texto, readme)
            self.assertIn("git clone -b comfyui", texto, readme)


if __name__ == "__main__":
    unittest.main()
