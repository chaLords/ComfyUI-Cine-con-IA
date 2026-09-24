"""Construye el 040 a partir del 039 modular.

Misma escena, misma camara y misma cadena de generacion que el 039: lo unico
que cambia es como se decide la memoria. Sirve para ver en accion los presets
de VRAM (puntos de color, faders que se deslizan, CUSTOM) y para comparar el
render con el 039.

    python tools/build_workflow040.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "examples" / "039.REALminimax-H3-Modular-v2.json"
OUTPUT = ROOT / "examples" / "040.REALminimax-H3-CineconIA-Presets-VRAM-v1.json"

# 416x736: la carga de referencia del planificador y el tamano medido en tu GPU
TAMANO = "0.30 MP  ·  base medida"

NOTA = """# 040 · Presets de VRAM en acción

Misma escena y misma cámara que el 039. Solo cambia cómo se decide la memoria.

**1 · Mira los puntos.** Cada chip de *Perfil de VRAM* tiene un punto de color. Con tu RTX 4060 Ti de 16 GB y este video (0.30 MP · 8 s): **AUTO, 8, 12 y 16 en verde · 24 en amarillo · 32 en rojo.**

**2 · Pulsa presets.** **8 GB** → *Escala* se apaga (sin segundo pase) y *Ahorro* sube a troceo 38. **32 GB** → barra roja y el consejo *elige el preset de tu GPU*. Vuelve a **AUTO**.

**3 · Toca un fader.** Mueve *Escala* a mano → aparece **CUSTOM**. Pulsa el perfil para volver al preset.

**4 · Cambia el video y mira cómo reaccionan los puntos.**
- *Proporción y Tamaño* → **0.40 MP**: AUTO pasa a amarillo; 8 y 12 siguen en verde.
- *Duración* → **15 s**: AUTO en rojo; 8 GB en amarillo (sin segundo pase, troceo 38).
- 15 s y desmarca *Solicitar segundo pase*: todo en amarillo. A 15 s ni el primer pase solo tiene margen en 16 GB.

**5 · Generar.** Vuelve a 0.30 MP · 8 s, deja **AUTO** y ejecuta: 20 pasos, troceo 26/26 y segundo pase x1.27. El video se guarda como `CineConIA/040_…`.

*El semáforo es una estimación experimental anclada en tu render de 16 GB. No mide la VRAM ni garantiza que un render quepa.*"""


def poner(node, name, index, value):
    node["widgets_values"][index] = value
    if isinstance(node.get("widgets_values_named"), dict):
        node["widgets_values_named"][name] = value


def construir():
    w = json.loads(SOURCE.read_text(encoding="utf-8"))
    ns = {n["type"]: n for n in w["nodes"]}
    w["id"] = "cineconia-040-h3-presets-vram-20260923"
    w["revision"] = 0

    poner(ns["CineRatioSize"], "tamano", 1, TAMANO)

    opt = ns["CineH3Optimizer"]
    opt["title"] = "03 · Memoria · presets de VRAM"
    # preset neutro: AUTO guiado, segundo pase pedido, escala y ahorro sin tocar
    for name, index, value in (("modo", 3, "Auto"), ("perfil", 4, "AUTO"),
                               ("resolucion", 8, 60), ("refinar", 9, True),
                               ("ahorro_vram", 10, 50)):
        poner(opt, name, index, value)

    ns["CineEscalarRefinar"]["mode"] = 0

    vhs = ns["VHS_VideoCombine"]
    prefijo = "CineConIA/040_%date:yyyyMMdd_hhmmss%"
    vhs["widgets_values"]["filename_prefix"] = prefijo
    if isinstance(vhs.get("widgets_values_named"), dict):
        vhs["widgets_values_named"]["filename_prefix"] = prefijo

    nota = ns["MarkdownNote"]
    nota["title"] = "Cómo se usa · 040 Presets de VRAM"
    nota["widgets_values"] = [NOTA]
    nota["widgets_values_named"] = {"text": NOTA}

    OUTPUT.write_text(json.dumps(w, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return w


if __name__ == "__main__":
    w = construir()
    print("040:", len(w["nodes"]), "nodos,", len(w["links"]), "enlaces ->", OUTPUT.name)
