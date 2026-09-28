"""049: el 048 con una tercera opcion GGUF, sin modificar el original."""
import json
from pathlib import Path

from build_workflow048 import BORRADOR
from build_workflow041 import poner_valores

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "examples/048.REALminimax-H3-CineconIA-Selector-modelo-pasos-v1.json"
OUTPUT = ROOT / "examples/049.REALminimax-H3-CineconIA-Selector-GGUF-Q4-v1.json"
MODELO_GGUF = "minimax\\minimax_h3_ref2va_pruned-Q4_K.gguf"

NOTA = """# 049 · H3 oficial, Singularity y GGUF Q4

El mismo workflow del 048: prompt, cámara, dos referencias y una tercera opcional de expresiones, LoRA, ajustes de memoria, render, escalado y refinado, interpolación, audio y Cronómetro.

**MODELO** · Elige **H3 oficial**, **Singularity v1.3** o **GGUF Q4**. El nodo Cargar modelo reconoce el formato automáticamente. El codificador de texto y los VAE siguen siendo los que ya usabas.

**PASOS** · Arranca en **8 · borrador**, con la receta er_sde/beta del 048. **20 · final** vuelve al Optimizador en Auto. Estas recetas se conservan para comparar; no hay tiempos ni calidad medidos todavía para este GGUF en tu RTX 4060 Ti.

**LÁMINA 3** · Activa *con expresiones* cuando hayas cargado la imagen del mismo personaje sonriendo, hablando y a tres cuartos. Con *sin expresiones*, la Escena quita las líneas del prompt que mencionan esa referencia.

**Preparación de GGUF.** Guarda `minimax_h3_ref2va_pruned-Q4_K.gguf` dentro de `models/diffusion_models/minimax/` en tu biblioteca de modelos. Actualiza los nodos Cine con IA y usa un cargador GGUF con soporte para H3, como [ComfyUI-GGUF-Loader](https://github.com/ChrisColeTech/ComfyUI-GGUF-Loader). Reinicia ComfyUI tras instalar los nodos. El ComfyUI-GGUF original de city96 no reconoce esta arquitectura en la versión revisada.

Si el Selector marca GGUF en rojo, el archivo aún no está disponible con ese nombre: termina la descarga, actualiza la lista de modelos y selecciónalo en Cargar modelo. El archivo pesa unos 11,4 GB; el consumo total también depende del tamaño, duración y referencias del video.

**Comparación.** Conserva la semilla y cambia solo MODELO para comparar las tres variantes. El Cronómetro registra la selección y los tiempos; cada video se guarda con un nombre como `CineConIA/049_gguf_q4_8p_2ref_…`. Si falta memoria, baja Proporción y Tamaño o apaga el refinado en el Optimizador.
"""


def construir():
    w = json.loads(SOURCE.read_text(encoding="utf-8"))
    w["id"] = "cineconia-049-h3-selector-gguf-q4-20260927"
    w["revision"] = 0
    n = {node["id"]: node for node in w["nodes"]}
    selector = n[540]
    fila = next(f for f in selector["properties"]["filas"] if f["clave"] == "modelo")
    fila["opciones"].append({
        "etiqueta": "GGUF Q4", "clave": "gguf_q4",
        "valores": [{"nodo": 500, "widget": "modelo", "valor": MODELO_GGUF}],
    })
    selector["size"] = [650, 200]
    selector["properties"]["salida"]["plantilla"] = (
        "CineConIA/049_{modelo}_{pasos}_{refs}_%date:yyyyMMdd_hhmmss%")
    poner_valores(n[500], dict(n[500]["widgets_values_named"], modelo=MODELO_GGUF))
    n[500]["title"] = "03 · Modelo H3 · oficial, Singularity o GGUF"
    poner_valores(n[515], dict(n[515]["widgets_values_named"], **BORRADOR))
    prefix = "CineConIA/049_gguf_q4_8p_2ref_%date:yyyyMMdd_hhmmss%"
    n[34003]["widgets_values"]["filename_prefix"] = prefix
    n[34003]["widgets_values_named"]["filename_prefix"] = prefix
    n[510]["title"] = "Cómo se usa · 049 con GGUF Q4"
    n[510]["widgets_values"] = [NOTA]
    n[510]["widgets_values_named"] = {"text": NOTA}
    return w


if __name__ == "__main__":
    workflow = construir()
    OUTPUT.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"049: {len(workflow['nodes'])} nodos, {len(workflow['links'])} enlaces -> {OUTPUT.name}")
