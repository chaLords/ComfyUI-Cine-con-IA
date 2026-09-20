import os
import re

from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

CANAL = "https://www.youtube.com/@cineconia.oficial"
REPO = "https://github.com/chaLords/ComfyUI-Cine-con-IA"


def _version():
    """La version sale de pyproject.toml para no tenerla escrita dos veces.

    tomllib solo existe desde Python 3.11 y el paquete admite 3.10, asi que
    se lee con una expresion regular en vez de con un parser de TOML.
    """
    ruta = os.path.join(os.path.dirname(__file__), "pyproject.toml")
    try:
        with open(ruta, encoding="utf-8") as fh:
            m = re.search(r'^version\s*=\s*"([^"]+)"', fh.read(), re.M)
        return m.group(1) if m else ""
    except OSError:
        return ""


def _saludo():
    """Una linea de presentacion al cargar, como hacen otros paquetes.

    Nada de esto puede impedir que los nodos carguen: si la consola no
    admite color, si pyproject no esta, o si el terminal no deja escribir,
    el paquete tiene que seguir funcionando igual. De ahi el try tan ancho.
    """
    n = len(NODE_CLASS_MAPPINGS)
    v = _version()
    ambar, gris, apagar = "\033[38;5;179m", "\033[38;5;245m", "\033[0m"
    if os.name == "nt" and not os.environ.get("WT_SESSION"):
        # Consolas antiguas de Windows no entienden los codigos de color y
        # los pintarian como basura encima del mensaje.
        try:
            import colorama  # noqa: F401
        except ImportError:
            ambar = gris = apagar = ""

    # Solo ASCII: la consola de Windows no siempre esta en UTF-8 y un
    # caracter como "·" se convierte en basura encima del mensaje.
    raya = "-" * 62
    print(f"{ambar}{raya}")
    print(f"  Cine con IA{(' v' + v) if v else ''}  |  {n} nodos cargados")
    print(f"{gris}  Tutoriales:   {CANAL}")
    print(f"  Repositorio:  {REPO}{ambar}")
    print(f"{raya}{apagar}")


try:
    _saludo()
except Exception:
    pass
