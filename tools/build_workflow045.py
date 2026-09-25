"""Construye el 045 a partir del 044: un interruptor elige la rama.

Las dos ramas del 044 (8 pasos er_sde/beta y 20 pasos res_multistep/simple,
las dos con x1.27) quedan cada una en su grupo, y un Fast Groups Bypasser de
rgthree con "always one" deja encendida solo una: la otra pasa a bypass
(violeta) y no se ejecuta. Trae la escena de la invitacion al canal tal como
se renderizo en el 043 (prompt, camara y las dos referencias).

    python tools/build_workflow045.py
"""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_workflow044 as b044  # noqa: E402
from build_workflow041 import Grafo, poner_valores  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "examples" / "045.REALminimax-H3-CineconIA-Interruptor-8-20-v1.json"
ESCENA = json.loads((ROOT / "tools" / "escena_invitacion_canal.json").read_text(encoding="utf-8"))

BYPASS = 4
TROCEO = 32                 # el de los dos renders medidos en el 043
INTERRUPTOR_ID = 521
ESTUDIO_ID = 522

# cada rama en su fila; el Interruptor lista los grupos que empiezan por "RAMA"
BORRADOR = {  # id: (titulo, posicion)
    515: ("03 · Memoria · 8 pasos (borrador)", [2200, 0]),
    516: ("04 · Render · 8 pasos", [2740, 0]),
    519: ("05 · Escalar y refinar · borrador", [2740, 420]),
    517: ("06 · Salida · borrador", [3240, 0]),
    34003: ("Vídeo · borrador 8 pasos", [3740, 0]),
}
FINAL = {
    513: ("03 · Memoria · 20 pasos (final)", [2200, 1400]),
    514: ("04 · Render · 20 pasos", [2740, 1400]),
    506: ("05 · Escalar y refinar · final", [2740, 1820]),
    507: ("06 · Salida · final", [3240, 1400]),
    34000: ("Vídeo · final 20 pasos", [3740, 1400]),
}
GRUPO_BORRADOR = ("RAMA · 8 pasos · borrador", [2170, -65, 2060, 1330])
GRUPO_FINAL = ("RAMA · 20 pasos · final", [2170, 1335, 2060, 1330])
GRUPO_COMPARTIDO = ("GENERACIÓN · escena, modelo y semilla compartidos", [1630, -65, 520, 1290])
COMPARTIDOS = {504: [1660, 0], 518: [1660, 490], 106: [1660, 640]}

PREFIJOS = {34003: "CineConIA/045_borrador_8p_%date:yyyyMMdd_hhmmss%",
            34000: "CineConIA/045_final_20p_%date:yyyyMMdd_hhmmss%"}

NOTA = """# 045 · Interruptor: borrador de 8 pasos o final de 20

La escena de la invitación al canal con **un interruptor** arriba (*Interruptor · 8 o 20 pasos*) para elegir qué rama se renderiza. La rama apagada queda en **violeta** (bypass) y no gasta tiempo.

- **8 pasos · borrador** (er_sde/beta): ~**23 min** en una RTX 4060 Ti. Para probar prompt, cámara y diálogo.
- **20 pasos · final** (res_multistep/simple): ~**42 min**. Más fiel a la cara y a los colores del personaje.

Las dos suben ×1.27 a **544×928** y refinan 4 pasos. Tiempos medidos en el 043.

**Cómo se usa.** En el Interruptor enciende la rama que quieres: la otra pasa sola a violeta, siempre queda una encendida. Luego ejecuta. El video se guarda como `CineConIA/045_borrador_8p_…` o `CineConIA/045_final_20p_…`. El **Cronómetro**, al lado, guarda el tiempo de cada corrida.

**Consejo.** Ajusta el plano con 8 pasos y, cuando te guste, cambia a 20 para el render final. Con la misma semilla sale parecido, no idéntico: el sampler y los pasos cambian.

*Necesita rgthree-comfy (nodo Fast Groups Bypasser). El troceo del modelo queda fijo en 32/32 para las dos ramas.*"""


def interruptor():
    return {
        "id": INTERRUPTOR_ID, "type": "Fast Groups Bypasser (rgthree)",
        "pos": [2170, -560], "size": [420, 130], "flags": {}, "order": 0, "mode": 0,
        "inputs": [], "outputs": [{"name": "OPT_CONNECTION", "type": "*", "links": None}],
        "title": "Interruptor · 8 o 20 pasos",
        "properties": {
            "matchColors": "", "matchTitle": "^RAMA", "showNav": True, "showAllGraphs": True,
            "sort": "position", "customSortAlphabet": "", "toggleRestriction": "always one",
        },
    }


def armar():
    """El 045 completo, sin escribirlo (el 046 parte de aqui)."""
    w = b044.armar()
    w["id"] = "cineconia-045-h3-interruptor-8-20-20260924"
    g = Grafo(w)
    n = g.nodes

    # --- troceo fijo, sin cable: una rama en bypass pasaria su ancho como troceo
    for nombre in ("trocear_atencion", "trocear_ffn"):
        g.quitar_enlace(next(i["link"] for i in n[500]["inputs"] if i["name"] == nombre))
    cargar = dict(n[500]["widgets_values_named"])
    assert n[500]["widgets_values"] == list(cargar.values())
    poner_valores(n[500], dict(cargar, trocear_atencion=TROCEO, trocear_ffn=TROCEO))

    # --- la escena de la invitacion, como se renderizo en el 043
    poner_valores(n[511], dict(n[511]["widgets_values_named"], texto=ESCENA["texto"]))
    n[511]["title"] = "01 · Prompt · invitación al canal"
    poner_valores(n[512], dict(n[512]["widgets_values_named"], **ESCENA["camara"]))
    poner_valores(n[509], dict(n[509]["widgets_values_named"], image=ESCENA["personaje"]))
    estudio = g.copiar(509, ESTUDIO_ID, [0, 1340])
    estudio["title"] = "Estudio Cine con IA  ·  <Picture 2>"
    poner_valores(estudio, dict(estudio["widgets_values_named"], image=ESCENA["estudio"]))
    g.enlazar(ESTUDIO_ID, 0, 504, "referencia_2")

    # --- el muestreo progresivo no aplica a 416x736: las dos ramas en Normal
    for opt in (513, 515):
        poner_valores(n[opt], dict(n[opt]["widgets_values_named"], muestreo="Normal"))

    # --- ramas: posicion, titulo y estado (arranca el borrador)
    for rama, modo in ((BORRADOR, 0), (FINAL, BYPASS)):
        for node_id, (titulo, pos) in rama.items():
            n[node_id]["title"], n[node_id]["pos"], n[node_id]["mode"] = titulo, pos, modo
    for node_id, pos in COMPARTIDOS.items():
        n[node_id]["pos"] = pos
    for node_id, prefijo in PREFIJOS.items():
        n[node_id]["widgets_values"]["filename_prefix"] = prefijo
        n[node_id]["widgets_values_named"]["filename_prefix"] = prefijo

    # --- grupos: los de las ramas y el compartido reemplazan a los del 044
    base = copy.deepcopy(w["groups"][0])
    w["groups"] = [gr for gr in w["groups"]
                   if not gr["title"].startswith(("PROCESO", "GENERACIÓN", "SALIDA"))]
    for gr in w["groups"]:
        if gr["title"].startswith("ENTRADAS"):
            gr["bounding"] = [-30, -65, 480, 1790]      # entra la segunda referencia
    for titulo, caja in (GRUPO_COMPARTIDO, GRUPO_BORRADOR, GRUPO_FINAL):
        w["groups"].append(dict(copy.deepcopy(base), title=titulo, bounding=caja))

    w["nodes"].append(interruptor())
    g.nodes[INTERRUPTOR_ID] = w["nodes"][-1]
    w["last_node_id"] = max(w["last_node_id"], INTERRUPTOR_ID, ESTUDIO_ID)

    nota = n[510]
    nota["title"] = "Cómo se usa · 045 Interruptor 8 o 20 pasos"
    nota["widgets_values"] = [NOTA]
    nota["widgets_values_named"] = {"text": NOTA}

    g.ordenar()
    return w


def construir():
    w = armar()
    OUTPUT.write_text(json.dumps(w, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return w


if __name__ == "__main__":
    w = construir()
    print("045:", len(w["nodes"]), "nodos,", len(w["links"]), "enlaces ->", OUTPUT.name)
