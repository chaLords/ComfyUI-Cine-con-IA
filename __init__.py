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


def _admite(texto):
    """True si la salida actual puede escribir estos caracteres."""
    import sys
    try:
        texto.encode(getattr(sys.stdout, "encoding", None) or "ascii")
        return True
    except (UnicodeError, LookupError):
        return False


def _saludo():
    """Presentacion al cargar, como hacen otros paquetes del ecosistema.

    Nada de esto puede impedir que los nodos carguen: si la consola no
    admite color, si pyproject no esta, o si el terminal no deja escribir,
    el paquete tiene que seguir funcionando igual. De ahi el try tan ancho.
    """
    n = len(NODE_CLASS_MAPPINGS)
    v = _version()
    c = {
        "ambar": "\033[38;5;214m", "negrita": "\033[1m", "gris": "\033[38;5;245m",
        "verde": "\033[38;5;114m", "rojo": "\033[38;5;203m", "azul": "\033[38;5;111m",
        "fin": "\033[0m",
    }
    if os.name == "nt" and not os.environ.get("WT_SESSION"):
        # Consolas antiguas de Windows no entienden los codigos de color y
        # los pintarian como basura encima del mensaje.
        try:
            import colorama  # noqa: F401
        except ImportError:
            c = dict.fromkeys(c, "")

    # Con UTF-8 (Windows Terminal, la consola del portable) va la version con
    # simbolos; si la salida no los admite, la de solo ASCII, que nunca falla.
    if _admite("━🎬✔▶◆"):
        raya, logo, ok, yt, gh = "━" * 64, "🎬", "✔", "▶", "◆"
    else:
        raya, logo, ok, yt, gh = "=" * 64, "", "OK", ">", "*"

    version = f" v{v}" if v else ""
    titulo = f"{logo}  " if logo else ""
    print(f"{c['ambar']}{raya}{c['fin']}")
    print(f"   {c['ambar']}{c['negrita']}{titulo}CINE CON IA{c['fin']}{c['gris']}{version}{c['fin']}"
          f"   {c['verde']}{ok} {n} nodos cargados{c['fin']}")
    print(f"   {c['rojo']}{yt}{c['fin']} {c['gris']}Tutoriales{c['fin']}   {c['azul']}{CANAL}{c['fin']}")
    print(f"   {c['gris']}{gh} Codigo    {c['fin']}   {c['azul']}{REPO}{c['fin']}")
    print(f"{c['ambar']}{raya}{c['fin']}")


try:
    _saludo()
except Exception:
    pass
