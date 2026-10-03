"""Genera examples/051: el 050 con el prompt universal y la cámara automática.

Solo cambia la cámara respecto del 050 (mismo modelo, acelerador, tamaño,
duración y semilla), para comparar uno contra otro. El texto del Director sale
de auto_camera(), la misma receta que usa el servidor.

Uso, desde la raíz del repositorio:  python tools/build_workflow051.py
"""

import copy
import json
from pathlib import Path
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from cineconia_h3.camera_director import auto_camera  # noqa: E402

ORIGEN = next((ROOT / "examples").glob("050.*.json"))
DESTINO = ROOT / "examples" / "051.REALminimax-H3-CineconIA-Camara-automatica-v1.json"

PROMPT_UNIVERSAL = """subject_definitions:
<Subject 1> is the adult man in <Picture 1>, with his facial features, hairstyle and beard. He wears a brown leather jacket over a white shirt and a brown tie.

summary:
[reference generation] <Subject 1> stands calmly in a bright, spacious photography studio, breathing naturally and gradually forming a subtle, relaxed smile.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve his facial structure, hairstyle, beard and clothing from <Picture 1>.

detailed_description:
Naturalistic live-action photography with realistic skin texture and soft daylight. The studio has a wooden floor, tall windows along one wall and brick pillars.
[Shot 1] <Subject 1> is the only person in the scene. He stands relaxed in one place and keeps his body orientation. His head and gaze stay aligned with his body, looking straight ahead. He breathes naturally, blinks occasionally and gradually forms a subtle smile.

overall_soundscape:
Quiet studio ambience and faint clothing rustle. No speech.

non_diegetic_music:
N/A"""

CAMARA = {"plano": "primer plano", "angulo": "frontal", "movimiento": "fijo", "intensidad": "normal",
          "lente": "85 mm", "profundidad_campo": "reducida"}

NOTA = """# 051 · Cámara automática · EXPERIMENTAL

**La ley:** el prompt de escena dice *qué pasa*; el Director decide *cómo se ve*.

**Escena:** personaje, acción, entorno, luz y sonido. Sin encuadre, lente, foco ni mirada «a cámara» o «fuera de cuadro»: la mirada va atada al cuerpo (*looking straight ahead*). La skill **cineconia-escena-h3** para Claude o ChatGPT escribe los prompts así.

**Director:** «Texto de cámara automático» está encendido. Cada botón reescribe la caja de instrucción con el texto completo, el de siempre más frases que describen el resultado visible. Lo que ves en la caja es lo que va al video. Si la editas a mano, los botones no la pisan; «Rehacer texto automático» la vuelve a generar.

**Comparación:** todo lo demás es igual al 050 (Acc/PDD 8 pasos, 960×544, 124 fotogramas, semilla 833), para que la única diferencia sea la cámara. Elige tu imagen de referencia antes de ejecutar.

**Sin probar:** los textos de apoyo de cada botón son experimentales hasta completar la matriz de ángulos y planos en GPU (docs/CONTINUIDAD_V3.md). El Cronómetro registra el encuadre con «texto automático»."""

GRUPOS = {
    "ESCENA · texto": "ESCENA · qué pasa · sin cámara",
    "CÁMARA · encuadre y movimiento": "CÁMARA · cómo se ve · texto automático",
}


def construir():
    wf = copy.deepcopy(json.loads(ORIGEN.read_text(encoding="utf-8")))
    wf["id"] = str(uuid.uuid5(uuid.NAMESPACE_URL, "https://github.com/chaLords/ComfyUI-Cine-con-IA/examples/051"))
    nodos = {n["type"]: n for n in wf["nodes"]}

    nota = nodos["MarkdownNote"]
    nota["title"] = "Cómo se usa · 051 cámara automática"
    nota["widgets_values"] = [NOTA]
    nota["widgets_values_named"] = {"text": NOTA}

    escena = nodos["CineSimplePromptH3"]
    escena["title"] = "01 · Escena · qué pasa (sin cámara)"
    escena["widgets_values"] = [PROMPT_UNIVERSAL]
    escena["widgets_values_named"] = {"texto": PROMPT_UNIVERSAL}

    texto, aviso = auto_camera(*CAMARA.values())
    assert not aviso, aviso
    director = nodos["CineCameraDirectorH3"]
    director["title"] = "02 · Director · texto de cámara automático"
    valores = dict(CAMARA, instruccion_camara=texto, reglas_continuidad=True,
                   perfil_modelo="MiniMax H3", camara_automatica=True)
    orden = ["plano", "angulo", "movimiento", "intensidad", "lente", "profundidad_campo",
             "instruccion_camara", "reglas_continuidad", "perfil_modelo", "camara_automatica"]
    director["widgets_values"] = [valores[k] for k in orden]
    director["widgets_values_named"] = {k: valores[k] for k in orden}
    director["properties"] = dict(director.get("properties", {}), texto_auto=texto)

    video = nodos["VHS_VideoCombine"]
    video["widgets_values"]["filename_prefix"] = "CineConIA/051_camara_auto_%date:yyyyMMdd_hhmmss%"
    video["widgets_values_named"]["filename_prefix"] = video["widgets_values"]["filename_prefix"]

    nodos["CineCronometro"]["properties"] = {"historial": []}
    for g in wf["groups"]:
        g["title"] = GRUPOS.get(g["title"], g["title"])
    return wf


if __name__ == "__main__":
    DESTINO.write_text(json.dumps(construir(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("escrito", DESTINO.relative_to(ROOT))
