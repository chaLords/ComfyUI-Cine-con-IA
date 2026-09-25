"""Construye el 046 a partir del 045: el mismo interruptor, con nodo propio.

Todo es igual al 045 (escena de la invitacion al canal, rama de 8 pasos y rama
de 20, troceo fijo 32/32), pero el Fast Groups Bypasser de rgthree se cambia por
el Interruptor de Cine con IA (web/cineconia_interruptor.js). Ya no hace falta
instalar rgthree-comfy. El 045 queda como estaba.

    python tools/build_workflow046.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_workflow045 as b045  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "examples" / "046.REALminimax-H3-CineconIA-Interruptor-propio-8-20-v1.json"

TITULO = "Interruptor · 8 o 20 pasos"

NOTA = """# 046 · Interruptor Cine con IA: borrador de 8 pasos o final de 20

El 045 con **nuestro propio interruptor** (*Interruptor · 8 o 20 pasos*), sin rgthree-comfy. Elige qué rama se renderiza; la rama apagada queda en **violeta** (bypass) y no gasta tiempo.

- **8 pasos · borrador** (er_sde/beta): ~**23 min** en una RTX 4060 Ti. Para probar prompt, cámara y diálogo.
- **20 pasos · final** (res_multistep/simple): ~**42 min**. Más fiel a la cara y a los colores del personaje.

Las dos suben ×1.27 a **544×928** y refinan 4 pasos. Tiempos medidos en el 043.

**Cómo se usa.** En el Interruptor haz clic en la rama que quieres: se enciende y la otra pasa sola a violeta, siempre queda una encendida. Luego ejecuta. El video se guarda como `CineConIA/046_borrador_8p_…` o `CineConIA/046_final_20p_…`. El **Cronómetro**, al lado, guarda el tiempo de cada corrida.

**Cómo sabe qué es cada rama.** Lista los grupos cuyo título empieza por **RAMA** (el prefijo se cambia en el mismo nodo). Un nodo es de una rama si su centro queda dentro del grupo: para sumar un nodo a una rama, arrástralo dentro.

**Consejo.** Ajusta el plano con 8 pasos y, cuando te guste, cambia a 20 para el render final. Con la misma semilla sale parecido, no idéntico: el sampler y los pasos cambian.

*El Interruptor y el Cronómetro son nodos de Cine con IA que solo viven en el navegador: no se envían al servidor. El troceo del modelo queda fijo en 32/32 para las dos ramas.*"""

PREFIJOS = {34003: "CineConIA/046_borrador_8p_%date:yyyyMMdd_hhmmss%",
            34000: "CineConIA/046_final_20p_%date:yyyyMMdd_hhmmss%"}


def interruptor():
    """El nodo tal como lo guarda el navegador (virtual, el prefijo en properties)."""
    return {
        "id": b045.INTERRUPTOR_ID, "type": "CineInterruptor",
        "pos": [2170, -560], "size": [440, 190], "flags": {}, "order": 0, "mode": 0,
        "inputs": [], "outputs": [],
        "title": TITULO,
        "properties": {"prefijo": "RAMA"},
    }


def construir():
    w = b045.armar()
    w["id"] = "cineconia-046-h3-interruptor-propio-8-20-20260925"
    i = next(k for k, n in enumerate(w["nodes"]) if n["type"] == "Fast Groups Bypasser (rgthree)")
    viejo = w["nodes"][i]
    nuevo = interruptor()
    nuevo["order"] = viejo["order"]
    w["nodes"][i] = nuevo

    n = {x["id"]: x for x in w["nodes"]}
    for node_id, prefijo in PREFIJOS.items():
        n[node_id]["widgets_values"]["filename_prefix"] = prefijo
        n[node_id]["widgets_values_named"]["filename_prefix"] = prefijo
    nota = n[510]
    nota["title"] = "Cómo se usa · 046 Interruptor Cine con IA"
    nota["widgets_values"] = [NOTA]
    nota["widgets_values_named"] = {"text": NOTA}

    OUTPUT.write_text(json.dumps(w, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return w


if __name__ == "__main__":
    w = construir()
    print("046:", len(w["nodes"]), "nodos,", len(w["links"]), "enlaces ->", OUTPUT.name)
