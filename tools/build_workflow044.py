"""Construye el 044 a partir del 043: la receta del 033 ajustada a 16 GB.

En el 043, subir x2 a 832x1472 dejo el refinado casi detenido en una RTX
4060 Ti de 16 GB. El 044 es el mismo grafo con B a x1.27: las dos ramas
terminan en 544x928 y lo unico que cambia es el primer pase (8 pasos
er_sde/beta contra 20 pasos res_multistep/simple).

    python tools/build_workflow044.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_workflow043 as b043  # noqa: E402
from build_workflow041 import poner_valores  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "examples" / "044.REALminimax-H3-CineconIA-PrimerPaseRapido-16GB-v1.json"

ESCALA_B = 1.27            # la del Auto de 16 GB: mismo tamano final en las dos ramas

NOTA = """# 044 · Primer pase rápido contra nuestro Auto (16 GB)

Es el 043 ajustado a una tarjeta de 16 GB. En el 043, subir ×2 a 832×1472 dejó el refinado casi detenido; aquí las dos ramas suben ×1.27 y terminan igual, así que **lo único que cambia es el primer pase**. Misma escena, misma cámara, **misma semilla**, 5 s.

- **A · nuestro Auto**: 20 pasos res_multistep/simple a 416×736 → sube ×1.27 a **544×928** → 4 pasos de refinado.
- **B · primer pase rápido**: 8 pasos er_sde/beta a 416×736 → sube ×1.27 a **544×928** → 4 pasos de refinado.

Medido en el 043 con una RTX 4060 Ti: el primer pase de B tardó **12 min 34 s** y el de A **31 min 35 s**. La pregunta de este workflow es si esos 8 pasos se ven igual de bien.

**1 · Ejecuta una vez.** Las dos ramas corren una detrás de otra. No hace falta repetir: el Cronómetro separa *Render* y *Escalar y refinar* de cada rama.

**2 · Lee el Cronómetro.** En el historial, la primera cifra *normal* es A y la segunda es B.

**3 · Compara.** Se guardan como `CineConIA/044_A_auto_…` y `CineConIA/044_B_rapido_…`, del mismo tamaño: la diferencia que veas es del primer pase. Mira la cara, el pelo, la textura de la ropa y si el movimiento es igual de estable.

*Si B se ve bien, lo siguiente es probar en B Escala refinado 1.5 (640×1088), que todavía no está medido.*"""

TITULOS_B = {
    515: "03B · Memoria · 8 pasos rápidos",
    516: "04B · Render · 8 pasos (er_sde / beta)",
    519: "05B · Escalar y refinar · x1.27",
    517: "06B · Salida · 8 pasos",
    34003: "Vídeo B · 8 pasos rápidos",
}
GRUPOS = {
    "PROCESO · A Auto / B receta 033": "PROCESO · A Auto / B 8 pasos",
    "GENERACIÓN B · receta 033": "GENERACIÓN B · 8 pasos rápidos",
    "SALIDA B · receta 033": "SALIDA B · 8 pasos rápidos",
}
PREFIJOS = {
    "CineConIA/043_A_auto_": "CineConIA/044_A_auto_",
    "CineConIA/043_B_receta033_": "CineConIA/044_B_rapido_",
}


def construir():
    w = b043.armar()
    w["id"] = "cineconia-044-h3-primer-pase-rapido-16gb-20260924"
    nodos = {n["id"]: n for n in w["nodes"]}

    poner_valores(nodos[515], dict(b043.OPT_B, escala_refinado_advanced=ESCALA_B))
    for node_id, titulo in TITULOS_B.items():
        nodos[node_id]["title"] = titulo

    for n in w["nodes"]:
        if n["type"] == "VHS_VideoCombine":
            prefijo = n["widgets_values"]["filename_prefix"]
            for viejo, nuevo in PREFIJOS.items():
                prefijo = prefijo.replace(viejo, nuevo)
            n["widgets_values"]["filename_prefix"] = prefijo
            n["widgets_values_named"]["filename_prefix"] = prefijo

    nota = nodos[510]
    nota["title"] = "Cómo se usa · 044 Primer pase rápido contra nuestro Auto"
    nota["widgets_values"] = [NOTA]
    nota["widgets_values_named"] = {"text": NOTA}

    for group in w["groups"]:
        group["title"] = GRUPOS.get(group["title"], group["title"])

    OUTPUT.write_text(json.dumps(w, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return w


if __name__ == "__main__":
    w = construir()
    print("044:", len(w["nodes"]), "nodos,", len(w["links"]), "enlaces ->", OUTPUT.name)
