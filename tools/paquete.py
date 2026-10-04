"""Qué recibe el usuario: el nodo para ComfyUI y los paquetes de skills.

NODO es la única lista de lo que necesita el nodo para funcionar. Lo demás
(pruebas, docs, workflows, herramientas, skills) se queda en main. Esa lista
tiene que coincidir con `.gitattributes` (ZIP de GitHub), `.comfyignore`
(Comfy Registry) y la rama `comfyui` que arma la Release; lo vigila
tests/test_paquete.py.

Uso, desde la raíz del repositorio:
    python tools/paquete.py nodo          # lista NODO, una entrada por línea
    python tools/paquete.py skills dist   # arma los zips de skills en dist/
"""

from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]

NODO = (
    "__init__.py",
    "nodes.py",
    "cineconia_h3",
    "web",
    "pyproject.toml",
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "README.md",
    "README_ES.md",
)

_SKILL = "skills/cineconia-escena-h3"
# nombre del zip -> [(ruta dentro del zip, archivo del repositorio)]
SKILLS = {
    "cineconia-escena-h3.zip": [
        ("cineconia-escena-h3/SKILL.md", _SKILL + "/SKILL.md"),
        ("cineconia-escena-h3/references/formato-h3.md", _SKILL + "/references/formato-h3.md"),
        ("cineconia-escena-h3/references/ejemplos.md", _SKILL + "/references/ejemplos.md"),
    ],
    "cineconia-escena-h3-chatgpt.zip": [
        ("INSTRUCCIONES_GPT.md", "skills/chatgpt/INSTRUCCIONES_GPT.md"),
        ("conocimiento/formato-h3.md", _SKILL + "/references/formato-h3.md"),
        ("conocimiento/ejemplos.md", _SKILL + "/references/ejemplos.md"),
        ("LEEME.md", "skills/README_ES.md"),
    ],
}

# Fecha fija: el mismo contenido da el mismo zip en cualquier equipo.
_FECHA = (2026, 1, 1, 0, 0, 0)


def armar_skills(destino):
    destino = Path(destino)
    destino.mkdir(parents=True, exist_ok=True)
    hechos = []
    for nombre, archivos in SKILLS.items():
        with zipfile.ZipFile(destino / nombre, "w", zipfile.ZIP_DEFLATED) as z:
            for interno, origen in archivos:
                info = zipfile.ZipInfo(interno, _FECHA)
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, (ROOT / origen).read_bytes())
        hechos.append(destino / nombre)
    return hechos


def main(argv):
    if argv[:1] == ["nodo"]:
        print("\n".join(NODO))
    elif argv[:1] == ["skills"] and len(argv) == 2:
        for ruta in armar_skills(argv[1]):
            print(ruta)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
