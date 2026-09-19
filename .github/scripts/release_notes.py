"""Notas de una Release a partir de los dos CHANGELOG.

    python .github/scripts/release_notes.py 1.4.0

Copia la seccion "## [1.4.0]" de CHANGELOG.md y de CHANGELOG_ES.md, sin su
titulo, y falla si alguna de las dos no existe: una version sin entrada en
el historial no se publica.
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def seccion(archivo, version):
    texto = (RAIZ / archivo).read_text(encoding="utf-8")
    m = re.search(r"^## \[" + re.escape(version) + r"\][^\n]*\n(.*?)(?=^## \[|\Z)",
                  texto, re.S | re.M)
    if not m:
        sys.exit("{} no tiene la seccion [{}]".format(archivo, version))
    return m.group(1).strip()


def main():
    # En Windows la consola redirigida no es UTF-8 y rompe las tildes.
    sys.stdout.reconfigure(encoding="utf-8")
    version = sys.argv[1].lstrip("v")
    print("## English\n\n{}\n\n## Español\n\n{}\n\n---\n\n"
          "[CHANGELOG](https://github.com/chaLords/ComfyUI-Cine-con-IA/blob/main/CHANGELOG.md)"
          " · [Novedades](https://github.com/chaLords/ComfyUI-Cine-con-IA/blob/main/CHANGELOG_ES.md)"
          .format(seccion("CHANGELOG.md", version), seccion("CHANGELOG_ES.md", version)))


if __name__ == "__main__":
    main()
