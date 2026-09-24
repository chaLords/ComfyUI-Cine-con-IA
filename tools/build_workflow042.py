"""Construye el 042: el 041 con el Cronómetro.

Mismo A/B que el 041 (render normal contra progresivo, misma semilla) y el
nodo Cronómetro arriba a la derecha para medir la corrida completa y cada
nodo. El Cronómetro es un nodo del navegador: no se envía al servidor.

    python tools/build_workflow042.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "examples" / "041.REALminimax-H3-CineconIA-Progresivo-AB-v1.json"
OUTPUT = ROOT / "examples" / "042.REALminimax-H3-CineconIA-Progresivo-AB-Cronometro-v1.json"

CRONOMETRO_ID = 519
# vista al abrir: desde y=-640, para que la nota y el Cronómetro (arriba) se vean
VISTA = {"scale": 0.6, "offset": [80, 640]}

NOTA = """# 042 · Normal contra progresivo, con Cronómetro

Es el 041 con el **Cronómetro** arriba a la derecha. Misma escena, misma cámara y **la misma semilla** en dos ramas; solo cambia el *Muestreo* del Optimizador.

- **A · normal**: los 20 pasos a 640×1120.
- **B · progresivo**: 10 pasos a 384×672, sube con el escalador latente de H3 y hace los otros 10 a 640×1120.

**Antes de ejecutar.** En el Optimizador B, junto a *Muestreo*, tiene que leerse **• 10 de 20 pasos a 384×672**. Si dice *falta SelfLift*, no cargó.

**1 · Ejecuta dos veces.** La primera corrida incluye cargar el modelo y ensucia la comparación: la que vale es la segunda.

**2 · Lee el Cronómetro.** El reloj grande es el total. Las barras dicen cuánto tomó cada nodo: los dos *Render* y las dos *Salida*. Al terminar deja una línea en el historial: `total · normal · progresivo`. El historial se guarda con el workflow; *Borrar historial* lo limpia.

**3 · Compara la calidad.** Se guardan como `CineConIA/042_A_normal_…` y `CineConIA/042_B_progresivo_…`. Mira la cara, la textura de la ropa y los bordes finos.

*Experimental. SelfLift ahorra tiempo, no VRAM: el semáforo es el mismo en las dos ramas.*"""


def cronometro(node_id, pos):
    """El nodo tal como lo guarda el navegador (virtual, sin widgets serializados)."""
    return {
        "id": node_id, "type": "CineCronometro", "pos": pos, "size": [460, 400],
        "flags": {}, "order": 0, "mode": 0, "inputs": [], "outputs": [],
        "title": "Cine con IA · Cronómetro", "properties": {"historial": []},
    }


def agregar_cronometro(w, node_id, pos):
    w["nodes"].append(cronometro(node_id, pos))
    w["last_node_id"] = max(w["last_node_id"], node_id)
    # sin enlaces: va primero en el orden y el resto corre uno
    for n in w["nodes"]:
        n["order"] = 0 if n["id"] == node_id else n["order"] + 1


def construir():
    w = json.loads(SOURCE.read_text(encoding="utf-8"))
    w["id"] = "cineconia-042-h3-progresivo-ab-cronometro-20260924"
    w["revision"] = 0

    nota = next(n for n in w["nodes"] if n["type"] == "MarkdownNote")
    nota["title"] = "Cómo se usa · 042 Normal contra progresivo, con Cronómetro"
    nota["size"] = [1600, 480]
    nota["widgets_values"] = [NOTA]
    nota["widgets_values_named"] = {"text": NOTA}

    for n in w["nodes"]:
        if n["type"] == "VHS_VideoCombine":
            prefijo = n["widgets_values"]["filename_prefix"].replace("/041_", "/042_")
            n["widgets_values"]["filename_prefix"] = prefijo
            n["widgets_values_named"]["filename_prefix"] = prefijo

    agregar_cronometro(w, CRONOMETRO_ID, [1640, -560])
    w.setdefault("extra", {})["ds"] = dict(VISTA)
    OUTPUT.write_text(json.dumps(w, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return w


if __name__ == "__main__":
    w = construir()
    print("042:", len(w["nodes"]), "nodos,", len(w["links"]), "enlaces ->", OUTPUT.name)
