"""El 042 y el 043 son coherentes y sus notas dicen lo que los nodos van a mostrar."""
import importlib.util
import json
import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
EJEMPLOS = ROOT / "examples"
SPEC = importlib.util.spec_from_file_location("cineconia_nodes_workflow042", ROOT / "nodes.py")
NODES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(NODES)

from cineconia_h3.comfy_nodes import CineH3Optimizer  # noqa: E402

EXTERNOS = {"MarkdownNote", "LoadImage", "ModelPreviewOverrideKJ", "VHS_VideoCombine", "PrimitiveInt"}
VIRTUALES = {"CineCronometro", "CineInterruptor", "CineSelector", "Fast Groups Bypasser (rgthree)"}   # solo existen en el navegador
GPU16 = {"available": True, "name": "RTX 4060 Ti", "total_gb": 15.99, "free_gb": 14.2, "source": "test"}
LISTO = {"selflift": True, "upscaler": "minimax_h3_latent_upscaler_3d_bf16.safetensors"}
# fuera de ComfyUI no hay comfy.samplers: las listas que da el core
SAMPLERS = ["euler", "euler_ancestral", "res_multistep", "er_sde", "dpmpp_2m"]
SCHEDULERS = ["simple", "normal", "karras", "beta"]


def cargar(nombre):
    return json.loads(next(EJEMPLOS.glob(nombre + ".*.json")).read_text(encoding="utf-8"))


def lado_escalado(px, escala):
    """El redondeo de MinimaxH3LatentUpscaler3D con align=32 y VAE 16."""
    return round(round(px * escala / 32) * 32 / 16) * 16


class Coherencia:
    nombre = None

    @classmethod
    def setUpClass(cls):
        cls.workflow = cargar(cls.nombre)
        cls.nodes = {n["id"]: n for n in cls.workflow["nodes"]}
        cls.nota = next(n for n in cls.workflow["nodes"] if n["type"] == "MarkdownNote")["widgets_values"][0]

    def enlace(self, link_id):
        return next(l for l in self.workflow["links"] if l[0] == link_id)

    def origen(self, node, entrada):
        link_id = next(i["link"] for i in node["inputs"] if i["name"] == entrada)
        return self.enlace(link_id)[1]

    def test_ids_orden_y_enlaces_unicos(self):
        orders = sorted(n["order"] for n in self.workflow["nodes"])
        self.assertEqual(orders, list(range(len(orders))))
        self.assertEqual(len(self.nodes), len(self.workflow["nodes"]))
        link_ids = [link[0] for link in self.workflow["links"]]
        self.assertEqual(len(link_ids), len(set(link_ids)))
        self.assertLessEqual(max(link_ids), self.workflow["last_link_id"])
        self.assertLessEqual(max(self.nodes), self.workflow["last_node_id"])

    def test_cada_enlace_tiene_extremos_slots_y_tipos_coherentes(self):
        for link_id, a, a_slot, b, b_slot, kind in self.workflow["links"]:
            out, inp = self.nodes[a]["outputs"][a_slot], self.nodes[b]["inputs"][b_slot]
            self.assertEqual(out["type"], kind, link_id)
            self.assertEqual(inp["type"], kind, link_id)
            self.assertIn(link_id, out["links"], link_id)
            self.assertEqual(inp["link"], link_id, link_id)
        for node in self.workflow["nodes"]:
            for out in node.get("outputs", []):
                for link_id in out.get("links") or []:
                    self.enlace(link_id)
            for inp in node.get("inputs", []):
                if inp.get("link") is not None:
                    self.assertEqual(self.enlace(inp["link"])[3], node["id"])

    def test_el_orden_respeta_las_dependencias(self):
        for _, a, _, b, _, _ in self.workflow["links"]:
            self.assertLess(self.nodes[a]["order"], self.nodes[b]["order"])

    def test_todos_los_nodos_existen(self):
        for node in self.workflow["nodes"]:
            if node["type"] not in EXTERNOS | VIRTUALES:
                self.assertIn(node["type"], NODES.NODE_CLASS_MAPPINGS, node["type"])

    def test_tiene_un_cronometro_vacio_y_suelto(self):
        cronos = [n for n in self.workflow["nodes"] if n["type"] == "CineCronometro"]
        self.assertEqual(len(cronos), 1)
        c = cronos[0]
        self.assertEqual((c["inputs"], c["outputs"], c["properties"]), ([], [], {"historial": []}))
        self.assertNotIn("widgets_values", c)
        self.assertIn("Cronómetro", self.nota)

    def test_la_nota_y_el_cronometro_se_ven_al_abrir(self):
        # lienzo tipico de 1920x1000: lo visible en coordenadas del grafo
        ds = self.workflow["extra"]["ds"]
        (ox, oy), s = ds["offset"], ds["scale"]
        x0, y0, x1, y1 = -ox, -oy, 1920 / s - ox, 1000 / s - oy
        for tipo in ("CineCronometro", "MarkdownNote"):
            n = next(n for n in self.workflow["nodes"] if n["type"] == tipo)
            (x, y), (w, h) = n["pos"], n["size"]
            self.assertTrue(x0 <= x and x + w <= x1, tipo)
            self.assertTrue(y0 <= y - 30 and y + h <= y1, tipo)   # 30: barra de titulo

    def test_una_sola_semilla_para_los_dos_renders(self):
        renders = [n for n in self.workflow["nodes"] if n["type"] == "CineH3OptimizedSampler"]
        self.assertEqual(len(renders), 2)
        origenes = {self.origen(r, "semilla") for r in renders}
        self.assertEqual(len(origenes), 1)
        semilla = self.nodes[origenes.pop()]
        self.assertEqual((semilla["type"], semilla["widgets_values"]), ("PrimitiveInt", [833, "fixed"]))

    def test_optimizadores_en_el_orden_de_input_types(self):
        spec = CineH3Optimizer.INPUT_TYPES()
        for node in self.workflow["nodes"]:
            if node["type"] == "CineH3Optimizer":
                self.assertEqual(list(node["widgets_values_named"]),
                                 list(spec["required"]) + list(spec["optional"]))
                self.assertEqual(node["widgets_values"], list(node["widgets_values_named"].values()))

    def preview(self, opt, **cambios):
        by_type = {n["type"]: n for n in self.workflow["nodes"]}
        size = dict(by_type["CineRatioSize"]["widgets_values_named"])
        dur = dict(by_type["CineDuracion"]["widgets_values_named"])
        fields = dict(opt["widgets_values_named"])
        fields.update({k: v for k, v in cambios.items() if k in fields})
        body = {"fields": fields, "sources": {
            "width": {"type": "CineRatioSize", "fields": size, "output": "width"},
            "height": {"type": "CineRatioSize", "fields": size, "output": "height"},
            "frames": {"type": "CineDuracion", "fields": dur, "output": "frames"}}}
        with patch("cineconia_h3.optimizer_config.detect_hardware", return_value=GPU16), \
                patch("cineconia_h3.progressive.detect_environment", return_value=LISTO), \
                patch("cineconia_h3.comfy_nodes._samplers", return_value=SAMPLERS), \
                patch("cineconia_h3.comfy_nodes._schedulers", return_value=SCHEDULERS):
            return NODES.preview_h3(body)["config"]


class Workflow042Tests(Coherencia, unittest.TestCase):
    nombre = "042"

    def test_es_el_041_mas_el_cronometro(self):
        w041 = cargar("041")
        sin_crono = [n for n in self.workflow["nodes"] if n["type"] != "CineCronometro"]
        self.assertEqual(len(sin_crono), len(w041["nodes"]))
        self.assertEqual(self.workflow["links"], w041["links"])
        opt = lambda w: sorted(json.dumps(n["widgets_values_named"], sort_keys=True)
                               for n in w["nodes"] if n["type"] == "CineH3Optimizer")
        self.assertEqual(opt(self.workflow), opt(w041))

    def test_cada_rama_guarda_su_video(self):
        prefijos = sorted(n["widgets_values"]["filename_prefix"] for n in self.workflow["nodes"]
                          if n["type"] == "VHS_VideoCombine")
        self.assertTrue(prefijos[0].startswith("CineConIA/042_A_normal_"))
        self.assertTrue(prefijos[1].startswith("CineConIA/042_B_progresivo_"))
        for p in ("042_A_normal_", "042_B_progresivo_"):
            self.assertIn(p, self.nota)

    def test_la_nota_coincide_con_el_aviso_del_optimizador(self):
        b = next(n for n in self.workflow["nodes"] if n["type"] == "CineH3Optimizer"
                 and n["widgets_values_named"]["muestreo"] == "Progresivo")
        p = self.preview(b)["progressive"]
        aviso = "• {} de {} pasos a {}×{}".format(p["transition_step"], p["steps"], p["low_width"], p["low_height"])
        self.assertIn(aviso, self.nota)


class Workflow043Tests(Coherencia, unittest.TestCase):
    nombre = "043"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        opts = [n for n in cls.workflow["nodes"] if n["type"] == "CineH3Optimizer"]
        cls.opt = {n["widgets_values_named"]["modo"]: n for n in opts}

    def test_las_dos_ramas_escalan_y_refinan(self):
        escalas = [n for n in self.workflow["nodes"] if n["type"] == "CineEscalarRefinar"]
        self.assertEqual(len(escalas), 2)
        for esc in escalas:
            v = esc["widgets_values_named"]
            self.assertEqual((v["semilla"], v["control_after_generate"], v["sampler"]), (835, "fixed", "er_sde"))
            render = self.nodes[self.origen(esc, "latente")]
            self.assertEqual(render["type"], "CineH3OptimizedSampler")
            opt = self.nodes[self.origen(render, "config")]
            for entrada in ("activar", "escala", "pasos"):
                self.assertEqual(self.origen(esc, entrada), opt["id"], entrada)

    def test_el_troceo_del_modelo_lo_pone_la_rama_pesada(self):
        cargar_h3 = next(n for n in self.workflow["nodes"] if n["type"] == "CineCargarH3")
        for entrada in ("trocear_atencion", "trocear_ffn"):
            self.assertEqual(self.origen(cargar_h3, entrada), self.opt["Advanced"]["id"])

    def test_b_es_la_receta_del_033(self):
        b = self.opt["Advanced"]["widgets_values_named"]
        self.assertEqual((b["pasos_advanced"], b["sampler_advanced"], b["scheduler_advanced"],
                          b["refinar"], b["escala_refinado_advanced"], b["muestreo"]),
                         (8, "er_sde", "beta", True, 2.0, "Normal"))
        self.assertEqual(self.opt["Auto"]["widgets_values_named"]["muestreo"], "Normal")

    def test_la_nota_coincide_con_lo_que_muestran_los_nodos(self):
        a, b = self.preview(self.opt["Auto"]), self.preview(self.opt["Advanced"])
        self.assertEqual((a["width"], a["height"], a["frames"]), (416, 736, 124))
        self.assertEqual((b["width"], b["height"], b["frames"]), (416, 736, 124))
        self.assertEqual((a["steps"], a["sampler"], a["scheduler"]), (20, "res_multistep", "simple"))
        self.assertEqual((b["steps"], b["sampler"], b["scheduler"]), (8, "er_sde", "beta"))
        self.assertIn("20 pasos res_multistep/simple", self.nota)
        self.assertIn("8 pasos er_sde/beta", self.nota)
        for cfg in (a, b):
            final = "{}×{}".format(lado_escalado(cfg["width"], cfg["refine_scale"]),
                                   lado_escalado(cfg["height"], cfg["refine_scale"]))
            self.assertIn("×{:g} a **{}**".format(cfg["refine_scale"], final), self.nota)
        self.assertEqual(a["planner"]["status"], "SAFE")
        self.assertEqual(b["planner"]["status"], "RISKY")   # medido: x2 queda casi detenido
        self.assertIn("rojo", self.nota)
        self.assertIn("044", self.nota)

        menos = self.preview(self.opt["Advanced"], escala_refinado_advanced=1.5)
        self.assertEqual(menos["planner"]["status"], "SAFE")
        final = "{}×{}".format(lado_escalado(416, 1.5), lado_escalado(736, 1.5))
        self.assertIn("**1.5** (verde, {})".format(final), self.nota)

    def test_cada_rama_guarda_su_video(self):
        prefijos = sorted(n["widgets_values"]["filename_prefix"] for n in self.workflow["nodes"]
                          if n["type"] == "VHS_VideoCombine")
        self.assertTrue(prefijos[0].startswith("CineConIA/043_A_auto_"))
        self.assertTrue(prefijos[1].startswith("CineConIA/043_B_receta033_"))
        for p in ("043_A_auto_", "043_B_receta033_"):
            self.assertIn(p, self.nota)



class Workflow044Tests(Coherencia, unittest.TestCase):
    """El 043 ajustado a 16 GB: solo cambia el primer pase."""
    nombre = "044"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        opts = [n for n in cls.workflow["nodes"] if n["type"] == "CineH3Optimizer"]
        cls.opt = {n["widgets_values_named"]["modo"]: n for n in opts}

    def test_es_el_043_con_b_a_x127(self):
        w043 = cargar("043")
        self.assertEqual(self.workflow["links"], w043["links"])
        a43 = {n["id"]: n for n in w043["nodes"]}
        for n in self.workflow["nodes"]:
            if n["type"] in ("MarkdownNote", "VHS_VideoCombine"):
                continue
            esperado = dict(a43[n["id"]].get("widgets_values_named") or {})
            if n["id"] == self.opt["Advanced"]["id"]:
                esperado["escala_refinado_advanced"] = 1.27
            self.assertEqual(n.get("widgets_values_named") or {}, esperado, n["id"])

    def test_las_dos_ramas_terminan_igual_y_en_margen(self):
        a, b = self.preview(self.opt["Auto"]), self.preview(self.opt["Advanced"])
        self.assertEqual((b["steps"], b["sampler"], b["scheduler"]), (8, "er_sde", "beta"))
        self.assertEqual((a["steps"], a["sampler"], a["scheduler"]), (20, "res_multistep", "simple"))
        self.assertEqual(a["refine_scale"], b["refine_scale"])
        final = "{}×{}".format(lado_escalado(416, b["refine_scale"]), lado_escalado(736, b["refine_scale"]))
        self.assertEqual(self.nota.count("×1.27 a **{}**".format(final)), 2)
        self.assertEqual((a["planner"]["status"], b["planner"]["status"]), ("SAFE", "SAFE"))

    def test_cada_rama_guarda_su_video(self):
        prefijos = sorted(n["widgets_values"]["filename_prefix"] for n in self.workflow["nodes"]
                          if n["type"] == "VHS_VideoCombine")
        self.assertTrue(prefijos[0].startswith("CineConIA/044_A_auto_"))
        self.assertTrue(prefijos[1].startswith("CineConIA/044_B_rapido_"))
        for p in ("044_A_auto_", "044_B_rapido_"):
            self.assertIn(p, self.nota)



def centro(node):
    (x, y), (w, h) = node["pos"], node["size"]
    return x + w / 2, y + h / 2


def dentro(punto, caja):
    x, y, w, h = caja
    return x <= punto[0] <= x + w and y <= punto[1] <= y + h


class Workflow045Tests(Coherencia, unittest.TestCase):
    """El interruptor enciende una sola rama: la otra queda en bypass (violeta)."""
    nombre = "045"
    BORRADOR = {515, 516, 519, 517, 34003}
    FINAL = {513, 514, 506, 507, 34000}
    COMPARTIDOS = {500, 501, 502, 504, 106, 509, 511, 512, 518, 522}
    SALIDA = "045"
    EN_NOTA = ("rgthree",)

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.grupos = {g["title"]: g["bounding"] for g in cls.workflow["groups"]}
        cls.interruptor = cls.nodes[521]

    def test_el_interruptor_lista_solo_las_dos_ramas_y_deja_una(self):
        self.assertEqual(self.interruptor["type"], "Fast Groups Bypasser (rgthree)")
        props = self.interruptor["properties"]
        self.assertEqual(props["toggleRestriction"], "always one")
        ramas = [t for t in self.grupos if re.search(props["matchTitle"], t, re.I)]
        self.assertEqual(sorted(ramas), ["RAMA · 20 pasos · final", "RAMA · 8 pasos · borrador"])

    def test_cada_nodo_de_rama_cae_solo_en_su_grupo(self):
        borrador, final = self.grupos["RAMA · 8 pasos · borrador"], self.grupos["RAMA · 20 pasos · final"]
        for ids, suyo, otro in ((self.BORRADOR, borrador, final), (self.FINAL, final, borrador)):
            for node_id in ids:
                c = centro(self.nodes[node_id])
                self.assertTrue(dentro(c, suyo), node_id)
                self.assertFalse(dentro(c, otro), node_id)
        for node_id in self.COMPARTIDOS | {self.interruptor["id"]}:
            c = centro(self.nodes[node_id])
            self.assertFalse(dentro(c, borrador) or dentro(c, final), node_id)

    def test_arranca_el_borrador_y_el_final_en_bypass(self):
        self.assertEqual({self.nodes[i]["mode"] for i in self.BORRADOR}, {0})
        self.assertEqual({self.nodes[i]["mode"] for i in self.FINAL}, {4})
        self.assertEqual({self.nodes[i]["mode"] for i in self.COMPARTIDOS}, {0})

    def test_nada_compartido_depende_de_una_rama(self):
        ramas = self.BORRADOR | self.FINAL
        for _, a, _, b, _, _ in self.workflow["links"]:
            if a in ramas:
                self.assertIn(b, ramas, (a, b))
            if a in self.BORRADOR:
                self.assertIn(b, self.BORRADOR, (a, b))
            if a in self.FINAL:
                self.assertIn(b, self.FINAL, (a, b))

    def test_troceo_fijo_sin_cable(self):
        cargar = self.nodes[500]
        for nombre in ("trocear_atencion", "trocear_ffn"):
            self.assertIsNone(next(i["link"] for i in cargar["inputs"] if i["name"] == nombre))
            self.assertEqual(cargar["widgets_values_named"][nombre], 32)

    def test_trae_la_escena_de_la_invitacion(self):
        self.assertIn('"Te invito a ver mi canal, Cine con IA."', self.nodes[511]["widgets_values_named"]["texto"])
        self.assertEqual(self.nodes[522]["widgets_values_named"]["image"], "composite (2) - copia.png")
        link = self.enlace(next(i["link"] for i in self.nodes[504]["inputs"] if i["name"] == "referencia_2"))
        self.assertEqual(link[1], 522)
        self.assertEqual(self.nodes[512]["widgets_values_named"]["lente"], "50 mm")

    def test_las_dos_ramas_terminan_igual_y_en_margen(self):
        opt = {n["id"]: n for n in self.workflow["nodes"] if n["type"] == "CineH3Optimizer"}
        final, borrador = self.preview(opt[513]), self.preview(opt[515])
        self.assertEqual((borrador["steps"], borrador["sampler"]), (8, "er_sde"))
        self.assertEqual((final["steps"], final["sampler"]), (20, "res_multistep"))
        self.assertEqual(final["refine_scale"], borrador["refine_scale"])
        self.assertEqual((final["planner"]["status"], borrador["planner"]["status"]), ("SAFE", "SAFE"))
        self.assertFalse(final["progressive"]["requested"] or borrador["progressive"]["requested"])
        tam = "{}×{}".format(lado_escalado(416, final["refine_scale"]), lado_escalado(736, final["refine_scale"]))
        self.assertIn(tam, self.nota)
        for texto in ("~**23 min**", "~**42 min**", self.SALIDA + "_borrador_8p_", self.SALIDA + "_final_20p_") + self.EN_NOTA:
            self.assertIn(texto, self.nota)

    def test_cada_rama_guarda_su_video(self):
        prefijos = {n["id"]: n["widgets_values"]["filename_prefix"] for n in self.workflow["nodes"]
                    if n["type"] == "VHS_VideoCombine"}
        self.assertTrue(prefijos[34003].startswith("CineConIA/{}_borrador_8p_".format(self.SALIDA)))
        self.assertTrue(prefijos[34000].startswith("CineConIA/{}_final_20p_".format(self.SALIDA)))


class Workflow046Tests(Workflow045Tests):
    """El 045 con el Interruptor de Cine con IA en vez del de rgthree."""
    nombre = "046"
    SALIDA = "046"
    EN_NOTA = ("RAMA", "Cronómetro", "sin rgthree-comfy")

    def test_el_interruptor_lista_solo_las_dos_ramas_y_deja_una(self):
        # la misma regla que web/cineconia_interruptor.js: titulo que empieza por el prefijo
        self.assertEqual(self.interruptor["type"], "CineInterruptor")
        self.assertEqual((self.interruptor["inputs"], self.interruptor["outputs"]), ([], []))
        prefijo = self.interruptor["properties"]["prefijo"].strip().lower()
        ramas = [t for t in self.grupos if t.strip().lower().startswith(prefijo)]
        self.assertEqual(sorted(ramas), ["RAMA · 20 pasos · final", "RAMA · 8 pasos · borrador"])
        self.assertNotIn("widgets_values", self.interruptor)

    def test_ya_no_necesita_rgthree(self):
        tipos = {n["type"] for n in self.workflow["nodes"]}
        self.assertFalse(any("rgthree" in t for t in tipos))
        self.assertNotIn("Necesita rgthree", self.nota)

    def test_es_el_045_con_otro_interruptor(self):
        antes = cargar("045")
        self.assertEqual(antes["links"], self.workflow["links"])
        self.assertEqual(antes["groups"], self.workflow["groups"])
        iguales = {n["id"] for n in antes["nodes"]} - {510, 521, 34000, 34003}
        for n in antes["nodes"]:
            if n["id"] in iguales:
                self.assertEqual(n, self.nodes[n["id"]], n["id"])
        self.assertEqual(self.interruptor["pos"], next(n for n in antes["nodes"] if n["id"] == 521)["pos"])



class Workflow047Tests(Coherencia, unittest.TestCase):
    """Dos modelos con todo lo demas igual: cada rama carga el suyo y nada se cruza."""
    nombre = "047"
    OFICIAL = {500, 504, 106, 515, 516, 519, 517, 34003}
    SINGULARITY = {530, 531, 532, 513, 514, 506, 507, 34000}
    COMPARTIDOS = {501, 502, 509, 511, 512, 518, 522}

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.grupos = {g["title"]: g["bounding"] for g in cls.workflow["groups"]}

    def test_el_interruptor_lista_las_dos_ramas(self):
        inter = self.nodes[521]
        self.assertEqual(inter["type"], "CineInterruptor")
        ramas = [t for t in self.grupos if t.lower().startswith(inter["properties"]["prefijo"].lower())]
        self.assertEqual(sorted(ramas), ["RAMA · Singularity v1.3", "RAMA · modelo oficial (ref2va int8)"])

    def test_cada_nodo_cae_en_su_rama(self):
        oficial = self.grupos["RAMA · modelo oficial (ref2va int8)"]
        singular = self.grupos["RAMA · Singularity v1.3"]
        for ids, suyo, otro in ((self.OFICIAL, oficial, singular), (self.SINGULARITY, singular, oficial)):
            for node_id in ids:
                c = centro(self.nodes[node_id])
                self.assertTrue(dentro(c, suyo), node_id)
                self.assertFalse(dentro(c, otro), node_id)
        for node_id in self.COMPARTIDOS:
            c = centro(self.nodes[node_id])
            self.assertFalse(dentro(c, oficial) or dentro(c, singular), node_id)

    def test_ninguna_rama_depende_de_la_otra(self):
        for _, a, _, b, _, _ in self.workflow["links"]:
            self.assertFalse(a in self.OFICIAL and b in self.SINGULARITY, (a, b))
            self.assertFalse(a in self.SINGULARITY and b in self.OFICIAL, (a, b))
            if a in self.OFICIAL | self.SINGULARITY:
                self.assertIn(b, self.OFICIAL | self.SINGULARITY, (a, b))

    def test_arranca_la_oficial_y_la_otra_en_bypass(self):
        self.assertEqual({self.nodes[i]["mode"] for i in self.OFICIAL}, {0})
        self.assertEqual({self.nodes[i]["mode"] for i in self.SINGULARITY}, {4})

    def test_solo_cambia_el_modelo(self):
        a, b = self.nodes[500]["widgets_values_named"], self.nodes[530]["widgets_values_named"]
        self.assertEqual(a["modelo"], "minimax\\minimax_h3_ref2va_pruned_int8_convrot.safetensors")
        self.assertEqual(b["modelo"], "minimax\\Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors")
        self.assertEqual({k: v for k, v in a.items() if k != "modelo"}, {k: v for k, v in b.items() if k != "modelo"})
        self.assertEqual((a["trocear_atencion"], a["trocear_ffn"]), (32, 32))
        for x, y in ((515, 513), (504, 531), (106, 532), (519, 506), (517, 507)):
            self.assertEqual(self.nodes[x]["widgets_values_named"], self.nodes[y]["widgets_values_named"], (x, y))
        # la misma semilla en los dos renders
        self.assertEqual(self.origen(self.nodes[516], "semilla"), self.origen(self.nodes[514], "semilla"))

    def test_mas_definicion_y_en_margen(self):
        self.assertEqual(self.nodes[501]["widgets_values_named"]["tamano"], "0.50 MP")
        cam = self.nodes[512]["widgets_values_named"]
        self.assertEqual((cam["plano"], cam["movimiento"], cam["lente"]), ("plano medio corto", "fijo", "50 mm"))
        c = self.preview(self.nodes[515])
        self.assertEqual((c["steps"], c["sampler"]), (20, "res_multistep"))
        self.assertEqual(c["planner"]["status"], "SAFE")
        final = "{}×{}".format(lado_escalado(544, c["refine_scale"]), lado_escalado(928, c["refine_scale"]))
        self.assertEqual(final, "704×1184")
        self.assertIn(final, self.nota)
        self.assertIn("soft key light", self.nodes[511]["widgets_values_named"]["texto"])

    def test_cada_rama_guarda_su_video(self):
        p = {i: self.nodes[i]["widgets_values"]["filename_prefix"] for i in (34003, 34000)}
        self.assertTrue(p[34003].startswith("CineConIA/047_oficial_"))
        self.assertTrue(p[34000].startswith("CineConIA/047_singularity_"))
        for texto in ("047_oficial_", "047_singularity_", "Cronómetro"):
            self.assertIn(texto, self.nota)



def opcion_puesta(nodes, opcion):
    """Lo mismo que coincide() en web/cineconia_selector.js, sobre el JSON."""
    for v in opcion["valores"]:
        n = nodes[v["nodo"]]
        if "modo" in v:
            if n["mode"] != v["modo"]:
                return False
        elif n["widgets_values_named"].get(v["widget"]) != v["valor"]:
            return False
    return True


class Workflow048Tests(Coherencia, unittest.TestCase):
    """Un solo camino: el Selector elige modelo, pasos y la lamina 3 sin duplicar ramas."""
    nombre = "048"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.selector = cls.nodes[540]
        cls.filas = cls.selector["properties"]["filas"]
        cls.texto = cls.nodes[511]["widgets_values_named"]["texto"]

    def fila(self, clave):
        return next(f for f in self.filas if f["clave"] == clave)

    def opcion(self, fila, clave):
        return next(o for o in self.fila(fila)["opciones"] if o["clave"] == clave)

    def test_una_sola_semilla_para_los_dos_renders(self):
        renders = [n for n in self.workflow["nodes"] if n["type"] == "CineH3OptimizedSampler"]
        self.assertEqual(len(renders), 1)
        semilla = self.nodes[self.origen(renders[0], "semilla")]
        self.assertEqual((semilla["type"], semilla["widgets_values"]), ("PrimitiveInt", [833, "fixed"]))

    def test_un_solo_camino_sin_interruptor(self):
        tipos = [n["type"] for n in self.workflow["nodes"]]
        for tipo in ("CineCargarH3", "CineEscenaH3", "CineH3Optimizer", "CineEscalarRefinar",
                     "CineSalida", "VHS_VideoCombine", "CineSelector"):
            self.assertEqual(tipos.count(tipo), 1, tipo)
        self.assertNotIn("CineInterruptor", tipos)
        self.assertFalse([g for g in self.workflow["groups"] if g["title"].upper().startswith("RAMA")])
        # todo encendido salvo la lamina 3
        self.assertEqual({n["id"] for n in self.workflow["nodes"] if n["mode"] != 0}, {541})

    def test_el_selector_es_virtual_y_sus_destinos_existen(self):
        s = self.selector
        self.assertEqual((s["type"], s["inputs"], s["outputs"]), ("CineSelector", [], []))
        self.assertNotIn("widgets_values", s)
        self.assertEqual([f["nombre"] for f in self.filas], ["MODELO", "PASOS", "LÁMINA 3"])
        with patch("cineconia_h3.comfy_nodes._samplers", return_value=SAMPLERS), \
                patch("cineconia_h3.comfy_nodes._schedulers", return_value=SCHEDULERS):
            spec = CineH3Optimizer.INPUT_TYPES()
        listas = {**spec["required"], **spec["optional"]}
        for f in self.filas:
            self.assertEqual(len(f["opciones"]), 2, f["nombre"])
            for o in f["opciones"]:
                for v in o["valores"]:
                    n = self.nodes[v["nodo"]]
                    if "modo" in v:
                        self.assertIn(v["modo"], (0, 4))
                        continue
                    self.assertIn(v["widget"], n["widgets_values_named"], (o["clave"], v))
                    if n["type"] == "CineH3Optimizer":
                        tipo = listas[v["widget"]][0]
                        if isinstance(tipo, (list, tuple)):
                            self.assertIn(v["valor"], tipo, v)
        salida = s["properties"]["salida"]
        self.assertEqual((salida["nodo"], salida["widget"]), (34003, "filename_prefix"))
        for f in self.filas:
            self.assertIn("{" + f["clave"] + "}", salida["plantilla"])

    def test_arranca_en_singularity_20_pasos_sin_lamina_3(self):
        elegidas = [[o["clave"] for o in f["opciones"] if opcion_puesta(self.nodes, o)] for f in self.filas]
        self.assertEqual(elegidas, [["singularity"], ["20p"], ["2ref"]])
        nombre = self.selector["properties"]["salida"]["plantilla"]
        for f, [clave] in zip(self.filas, elegidas):
            nombre = nombre.replace("{" + f["clave"] + "}", clave)
        self.assertEqual(self.nodes[34003]["widgets_values"]["filename_prefix"], nombre)
        self.assertTrue(nombre.startswith("CineConIA/048_singularity_20p_2ref_"))
        self.assertIn("048_singularity_20p_2ref_", self.nota)

    def test_los_modelos_son_los_del_047(self):
        modelos = [o["valores"][0]["valor"] for o in self.fila("modelo")["opciones"]]
        w047 = cargar("047")
        del047 = sorted(n["widgets_values_named"]["modelo"] for n in w047["nodes"] if n["type"] == "CineCargarH3")
        self.assertEqual(sorted(modelos), del047)
        cargar_h3 = self.nodes[500]["widgets_values_named"]
        self.assertEqual((cargar_h3["trocear_atencion"], cargar_h3["trocear_ffn"]), (32, 32))

    def test_borrador_y_final_terminan_en_704x1184_y_en_verde(self):
        self.assertEqual(self.nodes[501]["widgets_values_named"]["tamano"], "0.50 MP")
        final = self.preview(self.nodes[515])
        self.assertEqual((final["steps"], final["sampler"], final["scheduler"]), (20, "res_multistep", "simple"))
        borrador_valores = {v["widget"]: v["valor"] for v in self.opcion("pasos", "8p")["valores"]}
        borrador = self.preview(self.nodes[515], **borrador_valores)
        self.assertEqual((borrador["steps"], borrador["sampler"], borrador["scheduler"]), (8, "er_sde", "beta"))
        for c in (final, borrador):
            self.assertEqual(c["planner"]["status"], "SAFE")
            lado = "{}×{}".format(lado_escalado(544, c["refine_scale"]), lado_escalado(928, c["refine_scale"]))
            self.assertEqual(lado, "704×1184")
        self.assertIn("704×1184", self.nota)

    def test_la_lamina_3_va_a_la_escena_y_su_linea_se_quita_sin_ella(self):
        lamina = self.nodes[541]
        self.assertEqual((lamina["type"], lamina["mode"]), ("LoadImage", 4))
        self.assertIn("<Picture 3>", lamina["title"])
        self.assertEqual(self.origen(self.nodes[504], "referencia_3"), 541)
        self.assertEqual(self.origen(self.nodes[504], "referencia_1"), 509)
        self.assertEqual(self.origen(self.nodes[504], "referencia_2"), 522)
        lineas = [l for l in self.texto.split("\n") if l.startswith("<Picture 3>")]
        self.assertEqual(len(lineas), 2)
        sin, quitadas = NODES._quitar_imagenes_ausentes(self.texto, 2)
        self.assertEqual(quitadas, [3])
        self.assertNotIn("<Picture 3>", sin)
        con, quitadas = NODES._quitar_imagenes_ausentes(self.texto, 3)
        self.assertEqual((con, quitadas), (self.texto, []))
        # la lamina 3 esta dentro del grupo de entradas
        entradas = next(g["bounding"] for g in self.workflow["groups"] if g["title"].startswith("ENTRADAS"))
        self.assertTrue(dentro(centro(lamina), entradas))

    def test_gestos_lentos_y_sonrisa_con_dientes(self):
        self.assertNotIn("salute", self.texto)
        self.assertNotIn("brim of his cap with two fingers", self.texto)
        self.assertIn("slowly", self.texto)
        self.assertIn("teeth", self.texto)
        self.assertIn("soft key light", self.texto)

    def test_el_selector_se_ve_al_abrir(self):
        ds = self.workflow["extra"]["ds"]
        (ox, oy), s = ds["offset"], ds["scale"]
        x0, y0, x1, y1 = -ox, -oy, 1920 / s - ox, 1000 / s - oy
        (x, y), (w, h) = self.selector["pos"], self.selector["size"]
        self.assertTrue(x0 <= x and x + w <= x1)
        self.assertTrue(y0 <= y - 30 and y + h <= y1)

    def test_nota_cronometro_y_selector_no_pisan_los_grupos(self):
        techo = min(g["bounding"][1] for g in self.workflow["groups"])
        for node_id in (510, 520, 540):
            (x, y), (w, h) = self.nodes[node_id]["pos"], self.nodes[node_id]["size"]
            self.assertLess(y + h, techo - 20, node_id)
        # el Cronometro nuevo (historial de 20 y dos botones) mide ~556 px
        self.assertGreaterEqual(self.nodes[520]["size"][1], 556)

    def test_cada_nodo_del_render_cae_en_generacion(self):
        gen = next(g["bounding"] for g in self.workflow["groups"] if g["title"].startswith("GENERACIÓN"))
        for node_id in (500, 504, 106, 515, 516, 519, 517, 34003):
            self.assertTrue(dentro(centro(self.nodes[node_id]), gen), node_id)
        ids = [g["id"] for g in self.workflow["groups"]]
        self.assertEqual(len(ids), len(set(ids)))


if __name__ == "__main__":
    unittest.main()
