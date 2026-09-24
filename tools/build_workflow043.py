"""Construye el 043 a partir del 040: la receta del 033 contra nuestro Auto.

El 033 ("REALminimax h3-Upscale", el workflow del que nacieron estos nodos)
hacia un primer pase barato (8 pasos er_sde/beta a 0.30 MP), subia x2 con el
escalador latente de H3 y refinaba 4 pasos con sigmas manuales. Nuestro Auto
hace 20 pasos res_multistep y sube x1.27. Misma escena y misma semilla; las
dos ramas pasan por Escalar y refinar y el Cronómetro mide cada tramo.

    python tools/build_workflow043.py
"""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_workflow041 import Grafo, poner, poner_valores, semilla_como_entrada  # noqa: E402
from build_workflow042 import VISTA, cronometro  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "examples" / "040.REALminimax-H3-CineconIA-Presets-VRAM-v1.json"
OUTPUT = ROOT / "examples" / "043.REALminimax-H3-CineconIA-Receta033-vs-Auto-v1.json"

SEGUNDOS = 5                # 124 fotogramas: el x2 de B a 8 s no entra en 16 GB
SEMILLA = 833
SEMILLA_REFINADO = 835      # la del 033, fija en las dos ramas

OPT_A = {
    "width": 416, "height": 736, "frames": 124, "modo": "Auto", "perfil": "AUTO",
    "calidad": 70, "detalle": 65, "movimiento": 65, "resolucion": 60, "refinar": True,
    "ahorro_vram": 50, "pasos_advanced": 20, "sampler_advanced": "res_multistep",
    "scheduler_advanced": "simple", "denoise_advanced": 1, "trocear_atencion_advanced": 16,
    "trocear_ffn_advanced": 16, "escala_refinado_advanced": 1.25,
    "pasos_refinado_advanced": "4 pasos  ·  recomendado",
    "muestreo": "Normal", "transicion_advanced": 10, "escala_inicial_advanced": 0,
}
# la receta del 033: 8 pasos er_sde/beta, x2, 4 pasos de refinado
OPT_B = dict(OPT_A, modo="Advanced", pasos_advanced=8, sampler_advanced="er_sde",
             scheduler_advanced="beta", trocear_atencion_advanced=32,
             trocear_ffn_advanced=32, escala_refinado_advanced=2.0)

NOTA = """# 043 · Receta del 033 contra nuestro Auto

El 033 (*REALminimax h3-Upscale*, el workflow del que nacieron estos nodos) repartía el trabajo distinto: un primer pase **barato** y un salto **grande** antes de refinar. Aquí se mide contra lo que hace hoy nuestro Optimizador en Auto. Misma escena, misma cámara, **misma semilla**, 5 s, y las dos parten de 416×736.

- **A · nuestro Auto**: 20 pasos res_multistep/simple a 416×736 → sube ×1.27 a **544×928** → 4 pasos de refinado.
- **B · receta 033**: 8 pasos er_sde/beta a 416×736 → sube ×2 a **832×1472** → 4 pasos de refinado.

El refinado es el mismo en las dos (*Escalar y refinar*: escalador latente de H3, sigmas 0.9035 → 0, er_sde, semilla 835).

**Antes de ejecutar.** El Optimizador B marca **amarillo**: subir ×2 a 832×1472 es el tramo que más memoria pide. El troceo del modelo lo pone B (32/32); no cambia el resultado, solo baja el pico. **Si se queda sin memoria**: en el Optimizador B, *Escala refinado* 2.0 → **1.5** (verde, 640×1088).

**1 · Ejecuta dos veces.** La primera incluye cargar el modelo; compara la segunda.

**2 · Lee el Cronómetro.** Las barras separan *Render* y *Escalar y refinar* de cada rama. En el historial, la primera cifra *normal* es A y la segunda es B.

**3 · Compara.** Se guardan como `CineConIA/043_A_auto_…` y `CineConIA/043_B_receta033_…`. B sale con 2,4 veces más píxeles: míralos al mismo tamaño en pantalla — cara, pelo, textura de la ropa.

*Experimental. B no promete ser más rápido: promete más detalle en un tiempo parecido. Eso es lo que se mide.*"""


def fijar_semilla_refinado(node):
    named = dict(node["widgets_values_named"])
    named["semilla"] = SEMILLA_REFINADO
    named["control_after_generate"] = "fixed"
    poner_valores(node, named)


def construir():
    w = json.loads(SOURCE.read_text(encoding="utf-8"))
    w["id"] = "cineconia-043-h3-receta033-vs-auto-20260924"
    w["revision"] = 0
    g = Grafo(w)

    def slot(node_id, name):
        return next(i for i, o in enumerate(g.nodes[node_id]["outputs"]) if o["name"] == name)

    def unir(a, a_name, b, b_name):
        g.enlazar(a, slot(a, a_name), b, b_name)

    # --- entradas: 0.30 MP (416x736, la base medida) y 5 s
    poner(g.nodes[502], "segundos", 0, SEGUNDOS)
    poner(g.nodes[504], "length", 3, 124)     # conectado: solo para que no confunda

    # --- rama A: lo que ya estaba en el 040, nuestro Auto
    opt_a = g.nodes[513]
    opt_a["title"] = "03A · Memoria · nuestro Auto"
    opt_a["size"] = [500, 900]
    poner_valores(opt_a, OPT_A)
    render_a = g.nodes[514]
    render_a["title"] = "04A · Render · Auto (20 pasos)"
    render_a["size"] = [460, 330]
    poner_valores(render_a, {"semilla": SEMILLA})
    esc_a = g.nodes[506]
    esc_a["title"] = "05A · Escalar y refinar · Auto"
    fijar_semilla_refinado(esc_a)
    g.nodes[507]["title"] = "06A · Salida · Auto"
    g.nodes[34000]["title"] = "Vídeo A · nuestro Auto"

    # --- rama B: la receta del 033
    opt_b = g.copiar(513, 515, [500, 1630])
    opt_b["title"] = "03B · Memoria · receta 033"
    poner_valores(opt_b, OPT_B)
    unir(501, "width", 515, "width")
    unir(501, "height", 515, "height")
    unir(502, "frames", 515, "frames")
    # el troceo del modelo lo decide la rama mas pesada (no cambia el resultado)
    unir(515, "trocear_atencion", 500, "trocear_atencion")
    unir(515, "trocear_ffn", 500, "trocear_ffn")

    render_b = g.copiar(514, 516, [3280, 0])
    render_b["title"] = "04B · Render · receta 033 (8 pasos)"
    unir(106, "MODEL", 516, "model")
    unir(504, "positive", 516, "positivo")
    unir(504, "latent", 516, "latente")
    unir(515, "config", 516, "config")

    esc_b = g.copiar(506, 519, [3280, 440])
    esc_b["title"] = "05B · Escalar y refinar · receta 033"
    unir(106, "MODEL", 519, "model")
    unir(504, "positive_escalar", 519, "positivo")
    unir(516, "latent", 519, "latente")
    unir(515, "refinar", 519, "activar")
    unir(515, "escala_refinado", 519, "escala")
    unir(515, "pasos_refinado", 519, "pasos")

    salida_b = g.copiar(507, 517, [3820, 0])
    salida_b["title"] = "06B · Salida · receta 033"
    unir(519, "latent", 517, "latente")
    unir(500, "vae_video", 517, "vae_video")
    unir(500, "vae_audio", 517, "vae_audio")

    vhs_b = g.copiar(34000, 34003, [3820, 450])
    vhs_b["title"] = "Vídeo B · receta 033"
    unir(517, "fotogramas", 34003, "images")
    unir(517, "audio", 34003, "audio")
    unir(517, "fps", 34003, "frame_rate")

    for vhs, prefijo in ((g.nodes[34000], "CineConIA/043_A_auto_%date:yyyyMMdd_hhmmss%"),
                         (vhs_b, "CineConIA/043_B_receta033_%date:yyyyMMdd_hhmmss%")):
        vhs["widgets_values"]["filename_prefix"] = prefijo
        vhs["widgets_values_named"]["filename_prefix"] = prefijo

    # --- una sola semilla para los dos primeros pases
    semilla = {
        "id": 518, "type": "PrimitiveInt", "pos": [2200, 1000], "size": [300, 110],
        "flags": {}, "order": 0, "mode": 0, "inputs": [],
        "outputs": [{"name": "INT", "type": "INT", "links": []}],
        "title": "Semilla compartida A/B",
        "properties": {"Node name for S&R": "PrimitiveInt"},
        "widgets_values": [SEMILLA, "fixed"],
    }
    w["nodes"].append(semilla)
    g.nodes[518] = semilla
    for render in (514, 516):
        semilla_como_entrada(g.nodes[render])
        g.enlazar(518, 0, render, "semilla")

    # --- Cronómetro (virtual, sin enlaces)
    crono = cronometro(520, [1640, -560])
    w["nodes"].append(crono)
    g.nodes[520] = crono
    w["last_node_id"] = max(w["last_node_id"], 520)

    # --- nota y grupos
    nota = g.nodes[510]
    nota["title"] = "Cómo se usa · 043 Receta del 033 contra nuestro Auto"
    nota["pos"] = [-20, -560]
    nota["size"] = [1600, 480]
    nota["widgets_values"] = [NOTA]
    nota["widgets_values_named"] = {"text": NOTA}

    titulos = {
        "PROCESO · memoria": ("PROCESO · A Auto / B receta 033", [470, 605, 560, 1985]),
        "GENERACIÓN · escena, render y refinado": ("GENERACIÓN A · escena, render y refinado", None),
        "SALIDA · imagen, audio y video": ("SALIDA A · nuestro Auto", None),
    }
    for group in w["groups"]:
        nuevo = titulos.get(group["title"])
        if nuevo:
            group["title"] = nuevo[0]
            if nuevo[1]:
                group["bounding"] = nuevo[1]
    salida_a = next(gr for gr in w["groups"] if gr["title"] == "SALIDA A · nuestro Auto")
    gen_b = copy.deepcopy(salida_a)
    gen_b["title"] = "GENERACIÓN B · receta 033"
    gen_b["bounding"] = [3250, -65, 520, 1040]
    salida_b_grupo = copy.deepcopy(salida_a)
    salida_b_grupo["title"] = "SALIDA B · receta 033"
    salida_b_grupo["bounding"] = [3790, -65, 520, 1650]
    w["groups"] += [gen_b, salida_b_grupo]

    w.setdefault("extra", {})["ds"] = dict(VISTA)
    g.ordenar()
    OUTPUT.write_text(json.dumps(w, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return w


if __name__ == "__main__":
    w = construir()
    print("043:", len(w["nodes"]), "nodos,", len(w["links"]), "enlaces ->", OUTPUT.name)
