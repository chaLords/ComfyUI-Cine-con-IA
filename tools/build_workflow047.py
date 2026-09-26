"""Construye el 047 a partir del 046: el mismo render con dos modelos.

El Interruptor elige el modelo: el ref2va oficial (int8 convrot) o el
Singularity v1.3. Cada rama lleva su propio Cargar H3, su Escena y su vista
previa, asi solo se carga el modelo de la rama encendida (dos modelos de ~20 GB
a la vez no caben en 32 GB de RAM). Todo lo demas es identico en las dos:
Optimizador en Auto (20 pasos res_multistep), 0.50 MP, x1.27, 5 s, la misma
semilla y el mismo prompt.

Cambios de calidad respecto al 046, a partir de los renders del 26/09:
0.50 MP en vez de 0.30 (704x1184 al final en vez de 544x928), plano medio
corto con camara fija para que la cara ocupe mas pixeles, y una luz suave
de frente en el prompt para la escena nocturna.

    python tools/build_workflow047.py
"""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_workflow045 as b045  # noqa: E402
import build_workflow046 as b046  # noqa: E402
from build_workflow041 import Grafo, poner_valores  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "examples" / "047.REALminimax-H3-CineconIA-Oficial-vs-Singularity-v1.json"

MODELO_OFICIAL = "minimax\\minimax_h3_ref2va_pruned_int8_convrot.safetensors"
MODELO_SINGULARITY = "minimax\\Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors"
TAMANO = "0.50 MP"
TROCEO = 32

# Las dos imagenes del render del 046 del 26/09 (lamina con boina y estudio).
LAMINA = "hf_20260822_170025_17eea7c3-7976-48b6-8c02-6d61c9f03fcf.png"
ESTUDIO = "hf_20260902_015550_ffac00f1-39de-4f62-8820-546f8e3ef067.png"

DX = 1320            # las ramas se corren a la derecha para hacer sitio al cargador
ANCHO_RAMA = 3380
# rama: (grupo, y, cargador, escena, vista previa, {nodo: titulo})
OFICIAL = {
    "grupo": "RAMA · modelo oficial (ref2va int8)", "y": 0, "modelo": MODELO_OFICIAL,
    "cargar": 500, "escena": 504, "vista": 106,
    "titulos": {500: "03 · Modelo oficial", 504: "04 · Escena · oficial",
                106: "Vista previa · oficial", 515: "05 · Memoria · oficial",
                516: "06 · Render · oficial", 519: "07 · Escalar y refinar · oficial",
                517: "08 · Salida · oficial", 34003: "Vídeo · modelo oficial"},
    "prefijo": (34003, "CineConIA/047_oficial_%date:yyyyMMdd_hhmmss%"),
}
SINGULARITY = {
    "grupo": "RAMA · Singularity v1.3", "y": 1400, "modelo": MODELO_SINGULARITY,
    "cargar": 530, "escena": 531, "vista": 532,
    "titulos": {530: "03 · Modelo Singularity v1.3", 531: "04 · Escena · Singularity",
                532: "Vista previa · Singularity", 513: "05 · Memoria · Singularity",
                514: "06 · Render · Singularity", 506: "07 · Escalar y refinar · Singularity",
                507: "08 · Salida · Singularity", 34000: "Vídeo · Singularity"},
    "prefijo": (34000, "CineConIA/047_singularity_%date:yyyyMMdd_hhmmss%"),
}
RAMA_OFICIAL = {500, 504, 106, 515, 516, 519, 517, 34003}
RAMA_SINGULARITY = {530, 531, 532, 513, 514, 506, 507, 34000}

TEXTO = """subject_definitions:
<Subject 1> is the adult man in <Picture 1>, a character reference sheet whose three panels show the same man: his face, his outfit from the front and his outfit from the back. He has thick black hair swept back with a few loose strands falling over his forehead and a full, well-groomed black beard. He wears a grey herringbone wool flat cap, a long black wool overcoat with a black velvet collar and a burgundy lining, worn open, over a navy pinstripe three-piece suit with a buttoned waistcoat and a thin gold watch chain across it, a white shirt with a rust-red tie, and black leather gloves. The cap sits on his head, slightly tilted forward, as the panels show it above the collar. His exact facial structure, features, skin texture and proportions stay identical to <Picture 1> in every frame.
<Picture 2> is the location: a small creative studio at night, used as the set exactly as shown.

summary:
[reference generation] The target video shows <Subject 1> seated behind the wooden table in the foreground of the studio in <Picture 2>, looking into the lens and welcoming the viewer to his channel, as the camera holds a locked-off close medium shot from the chest up.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - his face, skin texture, hair, beard, flat cap, overcoat, pinstripe suit, watch chain, tie and gloves are held identical to <Picture 1> in every frame with zero drift.
<Picture 2> (appears in [Shot 1]): fully_preserved - the room, its furniture, its lighting and the black wall lettering "Cine con IA" are held identical to <Picture 2>; whatever part of the lettering is in frame stays sharp.

detailed_description:
The target video is live-action and cinematic, shot on an ARRI Alexa Mini with a 50mm prime at eye level, locked off, in the night light of <Picture 2>: charcoal-blue walls with lifted shadows, the warm cone of the black floor lamp on the wall, the green glass banker's lamp glowing on the corner desk and the city lights in the window, softly out of focus behind him. A soft key light from just left of the camera lights his face clearly and evenly under the brim of the cap, showing the texture of his skin and beard and the catchlights in his eyes; his face is the brightest, sharpest part of the frame.
[Shot 1] <Subject 1> sits behind the wooden table, his gloved hands resting together on the tabletop at the bottom edge of the frame, looking straight into the lens. He speaks in Spanish with a natural Chilean accent, calm and warm, his lips in sync with every word:
0.3-0.9 s: "Hola." He gives a small nod with a slight smile.
1.1-3.2 s: "Bienvenidos a Cine con IA." His right gloved hand rises into the frame and opens palm-up toward the camera on "bienvenidos".
3.5-4.5 s: "Empecemos." He touches the brim of his cap with two fingers of his right hand, a brief salute.
From 4.5 s to the end his hand is still coming down and his eyes stay on the lens; he never holds a frozen pose.
"IA" is spoken as two separate letters: "i, a".

overall_soundscape:
His voice, close and clear: a medium-pitched male voice, unhurried and warm, with a natural Chilean Spanish accent. Under it, the quiet room tone of a small studio at night, the soft creak of his leather gloves and the rustle of the wool overcoat when his arm moves. Nothing but his voice and these on-set sounds.

non_diegetic_music:
N/A"""

CAMARA = {
    "plano": "plano medio corto", "angulo": "frontal", "movimiento": "fijo",
    "intensidad": "normal", "lente": "50 mm", "profundidad_campo": "natural",
    "instruccion_camara": (
        "A single locked-off frontal shot at his seated eye level, framed from the chest up "
        "with his face in the upper third of the frame and the flat cap fully inside it. "
        "Behind him the charcoal-blue wall, the \"Cine con IA\" lettering and the warm lamp "
        "glow stay softly out of focus. The camera does not move, zoom or cut at any point."),
    "reglas_continuidad": False,
}

NOTA = """# 047 · Modelo oficial contra Singularity, con más definición

El 046 con **dos modelos** en el Interruptor, para ver cuál da mejor cara con **la misma semilla, el mismo prompt y los mismos ajustes**. La rama apagada queda en violeta y no carga su modelo.

- **Modelo oficial**: `minimax_h3_ref2va_pruned_int8_convrot`, el del primer video de la invitación.
- **Singularity v1.3**: `Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8`, el del 046.

**Qué cambia respecto al 046 para ganar definición en la cara**

- Tamaño **0.50 MP**: el primer pase va a **544×928** y el refinado ×1.27 sube a **704×1184** (antes 544×928 al final). En 16 GB queda en verde.
- **Plano medio corto** con cámara fija y lente de 50 mm: la cara ocupa muchos más píxeles.
- Una **luz suave de frente** en el prompt, para que la escena nocturna no se coma el detalle de la piel.

Las dos ramas usan el Optimizador en Auto (20 pasos). Con el ComfyUI nuevo el 046 final tardó ~11 min a 0.30 MP; aquí calcula **~20-25 min por rama**.

**Cómo se usa.** Carga la lámina en *Lámina de personaje* y el estudio en *Estudio*. Enciende una rama en el Interruptor y ejecuta; después enciende la otra y ejecuta otra vez. Los videos se guardan como `CineConIA/047_oficial_…` y `CineConIA/047_singularity_…`, y el **Cronómetro** guarda el tiempo de cada uno.

*Si un modelo no aparece en la lista de su Cargar H3, elígelo a mano: el nombre depende de la carpeta donde lo tengas. El troceo queda fijo en 32/32 en los dos cargadores.*"""


def mover_rama(w, rama, ids):
    """Corre los nodos del muestreo a la derecha y coloca cargador, escena y vista previa."""
    n = {x["id"]: x for x in w["nodes"]}
    for node_id in ids - {rama["cargar"], rama["escena"], rama["vista"]}:
        n[node_id]["pos"] = [n[node_id]["pos"][0] + DX, n[node_id]["pos"][1]]
    y = rama["y"]
    n[rama["cargar"]]["pos"] = [2200, y]
    n[rama["escena"]]["pos"] = [3020, y]
    n[rama["vista"]]["pos"] = [3020, y + 490]
    for node_id, titulo in rama["titulos"].items():
        n[node_id]["title"] = titulo
    node_id, prefijo = rama["prefijo"]
    n[node_id]["widgets_values"]["filename_prefix"] = prefijo
    n[node_id]["widgets_values_named"]["filename_prefix"] = prefijo
    poner_valores(n[rama["cargar"]], dict(n[rama["cargar"]]["widgets_values_named"],
                                          modelo=rama["modelo"], trocear_atencion=TROCEO,
                                          trocear_ffn=TROCEO))


def construir():
    w = b045.armar()
    w["id"] = "cineconia-047-h3-oficial-vs-singularity-20260926"
    g = Grafo(w)
    n = g.nodes

    # --- nuestro Interruptor, como en el 046
    i = next(k for k, x in enumerate(w["nodes"]) if x["type"] == "Fast Groups Bypasser (rgthree)")
    nuevo = b046.interruptor()
    nuevo["order"] = w["nodes"][i]["order"]
    nuevo["title"] = "Interruptor · modelo"
    w["nodes"][i] = nuevo
    g.nodes[nuevo["id"]] = nuevo

    # --- rama Singularity: su propio cargador, escena y vista previa
    mapa = {500: 530, 504: 531, 106: 532}
    for viejo, copia in mapa.items():
        g.copiar(viejo, copia, [0, 0])
    for link in list(w["links"]):
        _, a, a_slot, b, b_slot, _ = link
        if b in mapa:  # entradas de las copias: lo que venga de 500/504/106 pasa a la copia
            g.enlazar(mapa.get(a, a), a_slot, mapa[b], n[b]["inputs"][b_slot]["name"])
    for link in list(w["links"]):
        _, a, a_slot, b, b_slot, _ = link
        if a in mapa and b in RAMA_SINGULARITY - set(mapa.values()):
            g.enlazar(mapa[a], a_slot, b, n[b]["inputs"][b_slot]["name"])

    # --- las dos ramas con el mismo Optimizador (Auto, 20 pasos)
    poner_valores(n[515], dict(n[513]["widgets_values_named"]))
    for node_id in RAMA_OFICIAL:
        n[node_id]["mode"] = 0
    for node_id in RAMA_SINGULARITY:
        n[node_id]["mode"] = b045.BYPASS
    mover_rama(w, OFICIAL, RAMA_OFICIAL)
    mover_rama(w, SINGULARITY, RAMA_SINGULARITY)

    # --- mas definicion: 0.50 MP, plano medio corto fijo, luz en la cara
    poner_valores(n[501], dict(n[501]["widgets_values_named"], tamano=TAMANO))
    poner_valores(n[511], dict(n[511]["widgets_values_named"], texto=TEXTO))
    n[511]["title"] = "01 · Prompt · bienvenida con boina"
    poner_valores(n[512], dict(n[512]["widgets_values_named"], **CAMARA))
    poner_valores(n[509], dict(n[509]["widgets_values_named"], image=LAMINA))
    poner_valores(n[522], dict(n[522]["widgets_values_named"], image=ESTUDIO))

    # --- grupos: las dos ramas mas anchas; semilla sola en el centro
    n[518]["pos"] = [1660, 0]
    base = copy.deepcopy(w["groups"][0])
    w["groups"] = [gr for gr in w["groups"]
                   if not gr["title"].startswith(("RAMA", "GENERACIÓN", "MODELO"))]
    for titulo, caja in (("SEMILLA · la misma en las dos ramas", [1630, -65, 520, 240]),
                         (OFICIAL["grupo"], [2170, -65, ANCHO_RAMA, 1330]),
                         (SINGULARITY["grupo"], [2170, 1335, ANCHO_RAMA, 1330])):
        w["groups"].append(dict(copy.deepcopy(base), title=titulo, bounding=caja))

    nota = n[510]
    nota["title"] = "Cómo se usa · 047 oficial contra Singularity"
    nota["widgets_values"] = [NOTA]
    nota["widgets_values_named"] = {"text": NOTA}

    g.ordenar()
    OUTPUT.write_text(json.dumps(w, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return w


if __name__ == "__main__":
    w = construir()
    print("047:", len(w["nodes"]), "nodos,", len(w["links"]), "enlaces ->", OUTPUT.name)
