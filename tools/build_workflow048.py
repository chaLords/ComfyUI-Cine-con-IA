"""Construye el 048 a partir del 047: una sola rama y el Selector.

En vez de dos ramas copiadas (una por modelo), el 048 tiene un solo camino y el
Selector de Cine con IA (web/cineconia_selector.js) con tres filas:

    MODELO   [ H3 oficial ] [ Singularity v1.3 ]   -> el modelo del Cargar H3
    PASOS    [ 8 · borrador ] [ 20 · final ]       -> el modo y los pasos del Optimizador
    LÁMINA 3 [ sin expresiones ] [ con expresiones ] -> enciende la tercera referencia

Cada fila es independiente: Singularity con 8 pasos es un clic en cada una. El
nombre del video se arma solo (CineConIA/048_singularity_20p_2ref_...).

La tercera referencia es una lamina de expresiones (sonrisa con dientes, boca
abierta, tres cuartos). El prompt trae su linea escrita; si la imagen esta
apagada, la Escena quita esa linea sola (_quitar_imagenes_ausentes en nodes.py).

    python tools/build_workflow048.py
"""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_workflow045 as b045  # noqa: E402
import build_workflow047 as b047  # noqa: E402
from build_workflow041 import Grafo, poner_valores  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "examples" / "048.REALminimax-H3-CineconIA-Selector-modelo-pasos-v1.json"

SELECTOR_ID = 540
EXPRESIONES_ID = 541
BYPASS = b045.BYPASS

QUITAR = sorted(b047.RAMA_SINGULARITY | {b045.INTERRUPTOR_ID})

# lo que no existe se nota al ejecutar ("Invalid image file"), en vez de
# repetir la lamina sin avisar
EXPRESIONES = "expresiones.png"

TITULOS = {
    500: "03 · Modelo H3 · lo elige el Selector",
    504: "04 · Escena · hasta 3 referencias",
    106: "Vista previa",
    515: "05 · Memoria · lo ajusta el Selector",
    516: "06 · Render",
    519: "07 · Escalar y refinar",
    517: "08 · Salida",
    34003: "Vídeo",
    518: "Semilla",
}

# Borrador: la receta del 044/045 (er_sde/beta, 8 pasos) con el troceo 32/32 y
# la misma subida x1.27 que da el Auto a 0.50 MP, para que las dos terminen en
# 704x1184 y se puedan comparar.
BORRADOR = {
    "modo": "Advanced", "pasos_advanced": 8, "sampler_advanced": "er_sde",
    "scheduler_advanced": "beta", "trocear_atencion_advanced": 32,
    "trocear_ffn_advanced": 32, "escala_refinado_advanced": 1.27,
    "pasos_refinado_advanced": "4 pasos  ·  recomendado",
}


def valores(nodo, d):
    return [{"nodo": nodo, "widget": k, "valor": v} for k, v in d.items()]


FILAS = [
    {"nombre": "MODELO", "clave": "modelo", "opciones": [
        {"etiqueta": "H3 oficial", "clave": "oficial",
         "valores": valores(500, {"modelo": b047.MODELO_OFICIAL})},
        {"etiqueta": "Singularity v1.3", "clave": "singularity",
         "valores": valores(500, {"modelo": b047.MODELO_SINGULARITY})},
    ]},
    {"nombre": "PASOS", "clave": "pasos", "opciones": [
        {"etiqueta": "8 · borrador", "clave": "8p", "valores": valores(515, BORRADOR)},
        {"etiqueta": "20 · final", "clave": "20p", "valores": valores(515, {"modo": "Auto"})},
    ]},
    {"nombre": "LÁMINA 3", "clave": "refs", "opciones": [
        {"etiqueta": "sin expresiones", "clave": "2ref",
         "valores": [{"nodo": EXPRESIONES_ID, "modo": BYPASS}]},
        {"etiqueta": "con expresiones", "clave": "3ref",
         "valores": [{"nodo": EXPRESIONES_ID, "modo": 0}]},
    ]},
]
PLANTILLA = "CineConIA/048_{modelo}_{pasos}_{refs}_%date:yyyyMMdd_hhmmss%"
PREFIJO = "CineConIA/048_singularity_20p_2ref_%date:yyyyMMdd_hhmmss%"

LINEA_EXPRESIONES = (
    "<Picture 3> is an expression sheet of <Subject 1>: close-ups of the same face smiling "
    "with his upper teeth showing, speaking with his mouth open, and turned three-quarters "
    "to each side. It shows exactly how his teeth, lips, mouth and beard look when he "
    "talks and smiles.")
RETENCION_EXPRESIONES = (
    "<Picture 3> (appears in [Shot 1]): used only for <Subject 1>'s teeth, lips and mouth "
    "shapes while he speaks and smiles; its framing and background are not used.")

# El prompt del 047 con gestos mas lentos (Singularity emborrona la mano rapida:
# se quita el saludo a la boina) y una sonrisa con dientes para la lamina 3.
TEXTO = b047.TEXTO
for viejo, nuevo in (
    ("<Picture 2> is the location: a small creative studio at night, used as the set exactly as shown.\n",
     "<Picture 2> is the location: a small creative studio at night, used as the set exactly as shown.\n"
     + LINEA_EXPRESIONES + "\n"),
    ("the black wall lettering \"Cine con IA\" are held identical to <Picture 2>; "
     "whatever part of the lettering is in frame stays sharp.\n",
     "the black wall lettering \"Cine con IA\" are held identical to <Picture 2>; "
     "whatever part of the lettering is in frame stays sharp.\n" + RETENCION_EXPRESIONES + "\n"),
    ("0.3-0.9 s: \"Hola.\" He gives a small nod with a slight smile.\n"
     "1.1-3.2 s: \"Bienvenidos a Cine con IA.\" His right gloved hand rises into the frame and "
     "opens palm-up toward the camera on \"bienvenidos\".\n"
     "3.5-4.5 s: \"Empecemos.\" He touches the brim of his cap with two fingers of his right "
     "hand, a brief salute.\n"
     "From 4.5 s to the end his hand is still coming down and his eyes stay on the lens; "
     "he never holds a frozen pose.\n",
     "0.3-0.9 s: \"Hola.\" He gives a small nod and a warm smile that shows his upper teeth.\n"
     "1.1-3.2 s: \"Bienvenidos a Cine con IA.\" His right gloved hand slowly lifts a few "
     "centimetres from the table and opens gently palm-up toward the camera on "
     "\"bienvenidos\", then settles back beside the other hand.\n"
     "3.5-4.5 s: \"Empecemos.\" He smiles openly, his teeth showing, and gives one slow, "
     "confident nod.\n"
     "From 4.5 s to the end his hands rest on the table, he keeps smiling at the lens, "
     "breathing and blinking naturally; he never holds a frozen pose.\n"),
):
    assert TEXTO.count(viejo) == 1, viejo[:60]
    TEXTO = TEXTO.replace(viejo, nuevo)

NOTA = """# 048 · Selector: modelo, pasos y lámina de expresiones

Un solo camino y el **Selector** arriba. Cada fila se elige por separado y el nodo pone solo los valores en el Cargar H3, en el Optimizador y en la lámina 3:

- **MODELO** · *H3 oficial* o *Singularity v1.3*. Singularity dio ~1,7× más detalle en la cara en el 047, pero emborrona los gestos rápidos: por eso aquí los gestos son lentos.
- **PASOS** · *8 · borrador* (er_sde/beta, para probar prompt y cámara) o *20 · final* (Optimizador en Auto). Los dos terminan en **704×1184**.
- **LÁMINA 3** · *con expresiones* enciende la tercera referencia (*Expresiones · <Picture 3>*); *sin expresiones* la deja en violeta.

El video se nombra solo según lo elegido: `CineConIA/048_singularity_20p_2ref_…`. Si cambias algo a mano, la fila queda en **personalizado** (ámbar en la cabecera).

**La lámina de expresiones (Picture 3).** Una imagen del mismo personaje con primeros planos: sonrisa con dientes, boca abierta hablando y la cara a tres cuartos de cada lado. Cárgala en *Expresiones · <Picture 3>* (abajo a la izquierda) y pulsa *con expresiones*. El prompt ya trae sus dos líneas (empiezan por `<Picture 3>`): con la lámina apagada, la Escena las quita sola.

**Cronómetro.** Guarda las últimas 20 corridas con modelo, pasos, sampler, resolución, duración y lo que marcaba el Selector. Haz clic en una corrida para ver su desglose por nodo; *Copiar tabla* la pega en una hoja de cálculo.

**Tiempos de referencia** (RTX 4060 Ti 16 GB, 0.50 MP, 5 s): con 20 pasos ~17 min con cualquiera de los dos modelos (medido en el 047). Con 8 pasos, unos **~10 min** (estimado: el render baja a menos de la mitad; escena, refinado y salida tardan lo mismo).

*Si un modelo sale en rojo en el Selector, no está en tu carpeta de modelos con ese nombre: elígelo a mano en el Cargar H3. El Selector y el Cronómetro solo viven en el navegador: no se envían al servidor.*"""


def selector():
    """El nodo tal como lo guarda el navegador (virtual, las filas en properties)."""
    return {
        "id": SELECTOR_ID, "type": "CineSelector",
        "pos": [2170, -660], "size": [560, 200], "flags": {}, "order": 0, "mode": 0,
        "inputs": [], "outputs": [],
        "title": "Selector · modelo, pasos y lámina 3",
        "properties": {"filas": copy.deepcopy(FILAS),
                       "salida": {"nodo": 34003, "widget": "filename_prefix", "plantilla": PLANTILLA}},
    }


def construir():
    w = b047.armar()
    w["id"] = "cineconia-048-h3-selector-modelo-pasos-20260926"
    g = Grafo(w)
    n = g.nodes

    # --- una sola rama: fuera la copia Singularity y el Interruptor
    for node_id in QUITAR:
        g.quitar_nodo(node_id)
    for node_id, titulo in TITULOS.items():
        n[node_id]["title"] = titulo
        n[node_id]["mode"] = 0

    # --- arranca en Singularity, 20 pasos (Auto), sin la lamina 3
    poner_valores(n[500], dict(n[500]["widgets_values_named"], modelo=b047.MODELO_SINGULARITY))
    assert n[515]["widgets_values_named"]["modo"] == "Auto"
    n[34003]["widgets_values"]["filename_prefix"] = PREFIJO
    n[34003]["widgets_values_named"]["filename_prefix"] = PREFIJO

    # --- la tercera referencia, apagada hasta que haya lamina
    expresiones = g.copiar(509, EXPRESIONES_ID, [0, 1780])
    expresiones["title"] = "Expresiones · <Picture 3> · opcional"
    expresiones["mode"] = BYPASS
    poner_valores(expresiones, dict(expresiones["widgets_values_named"], image=EXPRESIONES))
    g.enlazar(EXPRESIONES_ID, 0, 504, "referencia_3")

    # --- el prompt con gestos lentos y la linea de la lamina 3
    poner_valores(n[511], dict(n[511]["widgets_values_named"], texto=TEXTO))
    n[511]["title"] = "01 · Prompt · bienvenida (gestos lentos)"

    # --- el Selector donde estaba el Interruptor
    w["nodes"].append(selector())
    n[SELECTOR_ID] = w["nodes"][-1]
    w["last_node_id"] = max(w["last_node_id"], SELECTOR_ID, EXPRESIONES_ID)

    # --- grupos: entradas mas alto (entra la lamina 3), una sola generacion
    base = copy.deepcopy(w["groups"][0])
    grupos = []
    for gr in w["groups"]:
        if gr["title"].startswith("ENTRADAS"):
            gr["title"] = "ENTRADAS · formato, duración y referencias"
            gr["bounding"] = [-30, -65, 480, 2210]
        if gr["title"].startswith(("RAMA", "SEMILLA")):
            continue
        grupos.append(gr)
    for titulo, caja in (("SEMILLA · fija para comparar", [1630, -65, 520, 240]),
                         ("GENERACIÓN · modelo, escena, render y video", [2170, -65, b047.ANCHO_RAMA, 1330])):
        grupos.append(dict(copy.deepcopy(base), title=titulo, bounding=caja))
    for i, gr in enumerate(grupos, 1):
        gr["id"] = i
    w["groups"] = grupos

    # --- arriba: nota, Cronometro (ahora mas alto, con el historial de 20) y
    # Selector alineados, sin pisar los grupos; la vista inicial los muestra
    n[510]["pos"], n[510]["size"] = [-20, -660], [1600, 560]
    n[520]["pos"], n[520]["size"] = [1640, -660], [460, 560]
    w["extra"]["ds"] = {"scale": 0.6, "offset": [80, 740]}

    nota = n[510]
    nota["title"] = "Cómo se usa · 048 Selector"
    nota["widgets_values"] = [NOTA]
    nota["widgets_values_named"] = {"text": NOTA}

    g.ordenar()
    OUTPUT.write_text(json.dumps(w, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return w


if __name__ == "__main__":
    w = construir()
    print("048:", len(w["nodes"]), "nodos,", len(w["links"]), "enlaces ->", OUTPUT.name)
