"""Construye el 041 a partir del 040: render normal contra render progresivo.

Misma escena, misma camara y la misma semilla en dos ramas. Cada rama tiene
su Optimizador; los dos estan en Advanced con valores identicos (20 pasos,
euler, simple, troceo 26/26, sin segundo pase) y solo cambia el muestreo:
A normal, B progresivo (SelfLift). Euler en las dos para que la comparacion
mida SelfLift y no el sampler.

    python tools/build_workflow041.py
"""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "examples" / "040.REALminimax-H3-CineconIA-Presets-VRAM-v1.json"
OUTPUT = ROOT / "examples" / "041.REALminimax-H3-CineconIA-Progresivo-AB-v1.json"

TAMANO = "0.70 MP"          # 640x1120 en 9:16: el tramo inicial de B cae en 384x672
SEGUNDOS = 5                # 124 fotogramas, el minimo del rango entrenado de H3
SEMILLA = 833

NOTA = """# 041 · Render normal contra progresivo (SelfLift)

Misma escena, misma cámara y **la misma semilla** en dos ramas. Solo cambia el *Muestreo* del Optimizador.

- **A · normal**: los 20 pasos a 640×1120.
- **B · progresivo**: 10 pasos a 384×672, sube con el escalador latente de H3 y hace los otros 10 a 640×1120.

Las dos usan euler y los mismos 20 pasos: así se compara SelfLift, no el sampler.

**Antes de ejecutar.** SelfLift instalado en `custom_nodes/comfyui-SelfLift` y ComfyUI reiniciado. En el Optimizador B, junto a *Muestreo*, tiene que leerse **• 10 de 20 pasos a 384×672**. Si dice *falta SelfLift*, no cargó.

**1 · Ejecuta.** Se renderizan las dos ramas, una detrás de otra. Al terminar, cada *Render optimizado* muestra cuánto tardó (*último: …*). La rama que corre primero incluye la carga del modelo: para comparar tiempos, ejecuta dos veces y mira la segunda.

**2 · Compara.** Se guardan como `CineConIA/041_A_normal_…` y `CineConIA/041_B_progresivo_…`. Mira la cara, la textura de la ropa y los bordes finos: ahí se nota la subida de resolución.

**3 · Si quieres ir más lejos.** *Proporción y Tamaño* → **1.00 MP**: B empieza a 416×736, tu tamaño medido, y termina a 736×1344. El semáforo pasa a amarillo porque el tramo final es el que pesa.

*Experimental. SelfLift ahorra tiempo, no VRAM: el semáforo es el mismo en las dos ramas. Nada de esto está medido todavía en tu GPU.*"""

OPTIMIZADOR = {
    "width": 640, "height": 1120, "frames": 124, "modo": "Advanced", "perfil": "AUTO",
    "calidad": 70, "detalle": 65, "movimiento": 65, "resolucion": 60, "refinar": False,
    "ahorro_vram": 50, "pasos_advanced": 20, "sampler_advanced": "euler",
    "scheduler_advanced": "simple", "denoise_advanced": 1, "trocear_atencion_advanced": 26,
    "trocear_ffn_advanced": 26, "escala_refinado_advanced": 1.25,
    "pasos_refinado_advanced": "4 pasos  ·  recomendado",
    "muestreo": "Normal", "transicion_advanced": 10, "escala_inicial_advanced": 0,
}


def poner_valores(node, named):
    node["widgets_values"] = list(named.values())
    node["widgets_values_named"] = dict(named)


def poner(node, name, index, value):
    node["widgets_values"][index] = value
    if isinstance(node.get("widgets_values_named"), dict):
        node["widgets_values_named"][name] = value


class Grafo:
    def __init__(self, w):
        self.w = w
        self.nodes = {n["id"]: n for n in w["nodes"]}

    def quitar_nodo(self, node_id):
        node = self.nodes.pop(node_id)
        self.w["nodes"].remove(node)
        for link in [l for l in self.w["links"] if node_id in (l[1], l[3])]:
            self.quitar_enlace(link[0])

    def quitar_enlace(self, link_id):
        link = next(l for l in self.w["links"] if l[0] == link_id)
        self.w["links"].remove(link)
        _, a, a_slot, b, b_slot, _ = link
        if a in self.nodes:
            self.nodes[a]["outputs"][a_slot]["links"].remove(link_id)
        if b in self.nodes:
            self.nodes[b]["inputs"][b_slot]["link"] = None

    def enlazar(self, a, a_slot, b, b_name):
        link_id = self.w["last_link_id"] + 1
        self.w["last_link_id"] = link_id
        out = self.nodes[a]["outputs"][a_slot]
        inputs = self.nodes[b]["inputs"]
        b_slot = next(i for i, inp in enumerate(inputs) if inp["name"] == b_name)
        if inputs[b_slot].get("link") is not None:
            self.quitar_enlace(inputs[b_slot]["link"])
        out.setdefault("links", []).append(link_id)
        inputs[b_slot]["link"] = link_id
        self.w["links"].append([link_id, a, a_slot, b, b_slot, out["type"]])
        return link_id

    def copiar(self, node_id, nuevo_id, pos):
        node = copy.deepcopy(self.nodes[node_id])
        node["id"] = nuevo_id
        node["pos"] = pos
        for inp in node.get("inputs", []):
            inp["link"] = None
        for out in node.get("outputs", []):
            out["links"] = []
        self.w["nodes"].append(node)
        self.nodes[nuevo_id] = node
        self.w["last_node_id"] = max(self.w["last_node_id"], nuevo_id)
        return node

    def ordenar(self):
        """order = orden topologico, como lo guarda ComfyUI."""
        pendientes = {n: {l[1] for l in self.w["links"] if l[3] == n} for n in self.nodes}
        orden = []
        while pendientes:
            libres = sorted(n for n, deps in pendientes.items() if not deps - set(orden))
            if not libres:
                raise ValueError("ciclo en el grafo")
            for n in libres:
                orden.append(n)
                del pendientes[n]
        for i, n in enumerate(orden):
            self.nodes[n]["order"] = i


def semilla_como_entrada(node):
    node["inputs"].append({"name": "semilla", "type": "INT", "widget": {"name": "semilla"}, "link": None})


def construir():
    w = json.loads(SOURCE.read_text(encoding="utf-8"))
    w["id"] = "cineconia-041-h3-progresivo-ab-20260924"
    w["revision"] = 0
    g = Grafo(w)

    # --- entradas: 0.70 MP y 5 s
    poner(g.nodes[501], "tamano", 1, TAMANO)
    poner(g.nodes[502], "segundos", 0, SEGUNDOS)
    for name, index, value in (("width", 1, 640), ("height", 2, 1120), ("length", 3, 124)):
        poner(g.nodes[504], name, index, value)   # conectados: solo para que no confundan

    # --- sin segundo pase en ninguna rama
    g.quitar_nodo(506)

    # --- rama A: el Optimizador y el render que ya estaban
    opt_a = g.nodes[513]
    opt_a["title"] = "03A · Memoria · render normal"
    opt_a["size"] = [500, 900]
    poner_valores(opt_a, OPTIMIZADOR)
    render_a = g.nodes[514]
    render_a["title"] = "04A · Render normal · euler"
    render_a["size"] = [460, 300]
    poner_valores(render_a, {"semilla": SEMILLA})
    g.enlazar(514, 0, 507, "latente")
    g.nodes[507]["title"] = "05A · Salida normal"
    vhs_a = g.nodes[34000]
    vhs_a["title"] = "Vídeo A · normal"

    # --- rama B: copias con muestreo progresivo
    opt_b = g.copiar(513, 515, [500, 1630])
    opt_b["title"] = "03B · Memoria · render progresivo"
    poner_valores(opt_b, dict(OPTIMIZADOR, muestreo="Progresivo"))
    g.enlazar(501, 0, 515, "width")
    g.enlazar(501, 1, 515, "height")
    g.enlazar(502, 0, 515, "frames")

    render_b = g.copiar(514, 516, [2200, 400])
    render_b["title"] = "04B · Render progresivo · SelfLift"
    g.enlazar(106, 0, 516, "model")
    g.enlazar(504, 0, 516, "positivo")
    g.enlazar(504, 2, 516, "latente")
    g.enlazar(515, 0, 516, "config")

    salida_b = g.copiar(507, 517, [3280, 0])
    salida_b["title"] = "05B · Salida progresivo"
    g.enlazar(516, 0, 517, "latente")
    g.enlazar(500, 2, 517, "vae_video")
    g.enlazar(500, 3, 517, "vae_audio")

    vhs_b = g.copiar(34000, 34003, [3280, 450])
    vhs_b["title"] = "Vídeo B · progresivo"
    g.enlazar(517, 1, 34003, "images")
    g.enlazar(517, 2, 34003, "audio")
    g.enlazar(517, 3, 34003, "frame_rate")

    for vhs, prefijo in ((vhs_a, "CineConIA/041_A_normal_%date:yyyyMMdd_hhmmss%"),
                         (vhs_b, "CineConIA/041_B_progresivo_%date:yyyyMMdd_hhmmss%")):
        vhs["widgets_values"]["filename_prefix"] = prefijo
        vhs["widgets_values_named"]["filename_prefix"] = prefijo

    # --- una sola semilla para las dos ramas
    semilla = {
        "id": 518, "type": "PrimitiveInt", "pos": [2200, 760], "size": [300, 110],
        "flags": {}, "order": 0, "mode": 0, "inputs": [],
        "outputs": [{"name": "INT", "type": "INT", "links": []}],
        "title": "Semilla compartida A/B",
        "properties": {"Node name for S&R": "PrimitiveInt"},
        "widgets_values": [SEMILLA, "fixed"],
    }
    w["nodes"].append(semilla)
    g.nodes[518] = semilla
    w["last_node_id"] = max(w["last_node_id"], 518)
    for render in (514, 516):
        semilla_como_entrada(g.nodes[render])
        g.enlazar(518, 0, render, "semilla")

    # --- nota y grupos
    nota = g.nodes[510]
    nota["title"] = "Cómo se usa · 041 Normal contra progresivo"
    nota["pos"] = [-20, -560]
    nota["size"] = [1700, 480]
    nota["widgets_values"] = [NOTA]
    nota["widgets_values_named"] = {"text": NOTA}

    titulos = {
        "PROCESO · memoria": ("PROCESO · A normal / B progresivo", [470, 605, 560, 1985]),
        "GENERACIÓN · escena, render y refinado": ("GENERACIÓN · escena, render A y render B", None),
        "SALIDA · imagen, audio y video": ("SALIDA A · normal", None),
    }
    for group in w["groups"]:
        nuevo = titulos.get(group["title"])
        if nuevo:
            group["title"] = nuevo[0]
            if nuevo[1]:
                group["bounding"] = nuevo[1]
    salida_a = next(gr for gr in w["groups"] if gr["title"] == "SALIDA A · normal")
    salida_b_grupo = copy.deepcopy(salida_a)
    salida_b_grupo["title"] = "SALIDA B · progresivo"
    salida_b_grupo["bounding"] = [3250, -65, 520, 1650]
    w["groups"].append(salida_b_grupo)

    g.ordenar()
    OUTPUT.write_text(json.dumps(w, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return w


if __name__ == "__main__":
    w = construir()
    print("041:", len(w["nodes"]), "nodos,", len(w["links"]), "enlaces ->", OUTPUT.name)
