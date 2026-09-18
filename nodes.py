"""
Cine con IA - nodos propios para workflows de video (MiniMax H3 y similares).
Sin dependencias externas: solo Python estandar.
"""

import math
import re

CATEGORY = "Cine con IA"

# Proporciones. El valor es ancho/alto.
RATIOS = {
    "9:16  vertical (reels, tiktok)": 9 / 16,
    "2:3   vertical (foto)": 2 / 3,
    "4:5   vertical (instagram)": 4 / 5,
    "3:4   vertical (clasico)": 3 / 4,
    "1:1   cuadrado": 1.0,
    "4:3   horizontal (clasico)": 4 / 3,
    "3:2   horizontal (foto)": 3 / 2,
    "16:9  horizontal (cine, youtube)": 16 / 9,
    "1.85:1 horizontal (cine)": 1.85,
    "2.39:1 horizontal (scope)": 2.39,
}

# Tamanos. Los megapixeles valen para cualquier proporcion: 0.30 MP son
# 416x736 en 9:16 y 736x416 en 16:9, mismo coste de VRAM y de tiempo.
TAMANOS = [
    "0.15 MP  ·  prueba rapida",
    "0.20 MP",
    "0.25 MP",
    "0.30 MP  ·  base medida",
    "0.40 MP",
    "0.50 MP",
    "0.70 MP",
    "1.00 MP",
    "tamano 512",
    "tamano 640",
    "tamano 704",
    "tamano 768",
    "tamano 864",
    "tamano 1024",
    "tamano 1216",
    "tamano 1344",
    "personalizado",
]

FPS = ["24  ·  nativo H3", "25", "30", "48", "60"]


def _snap(value, multiple):
    if multiple < 1:
        multiple = 1
    return max(multiple, int(round(value / multiple)) * multiple)


def _leer_tamano(texto, personalizado_mp):
    """Devuelve ('mp', valor) o ('lado', valor). Tolerante a acentos y formato."""
    t = (texto or "").strip()
    if t.lower().startswith("personalizado"):
        return ("mp", float(personalizado_mp))
    partes = t.split()
    if partes:
        try:
            return ("mp", float(partes[0]))          # "0.30 MP ..."
        except ValueError:
            pass
        for tok in reversed(partes):                  # "tamano 640"
            try:
                return ("lado", int(tok))
            except ValueError:
                continue
    return ("mp", float(personalizado_mp))


class CineRatioSize:
    """Proporcion + tamano -> width / height, ajustados a multiplo de 32."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "proporcion": (list(RATIOS.keys()), {"default": "9:16  vertical (reels, tiktok)"}),
                "tamano": (TAMANOS, {"default": "0.30 MP  ·  base medida"}),
                "personalizado_mp": ("FLOAT", {"default": 0.30, "min": 0.02, "max": 8.00, "step": 0.01,
                                               "tooltip": "Solo se usa cuando Tamano = personalizado"}),
                "multiplo_de": ("INT", {"default": 32, "min": 8, "max": 128, "step": 8}),
            }
        }

    RETURN_TYPES = ("INT", "INT", "STRING")
    RETURN_NAMES = ("width", "height", "info")
    FUNCTION = "calcular"
    CATEGORY = CATEGORY
    DESCRIPTION = "Elige proporcion y tamano. Devuelve width y height ajustados al multiplo que pida el modelo."

    def calcular(self, proporcion, tamano, personalizado_mp, multiplo_de):
        r = RATIOS.get(proporcion, 9 / 16)
        modo, valor = _leer_tamano(tamano, personalizado_mp)

        if modo == "mp":
            total = max(1.0, valor * 1_000_000.0)
            w = math.sqrt(total * r)
            h = w / r
        else:
            if r >= 1.0:
                w = float(valor)
                h = w / r
            else:
                h = float(valor)
                w = h * r

        width = _snap(w, multiplo_de)
        height = _snap(h, multiplo_de)
        mp = (width * height) / 1_000_000.0
        rel = (width * height) / (416.0 * 736.0)

        def _tras(f):
            return _snap(width * f, multiplo_de), _snap(height * f, multiplo_de)

        w15, h15 = _tras(1.5)
        info = (
            "{} -> {}x{} px ({:.2f} MP)\n"
            "escalado x1.5: {}x{}   ·   x2: {}x{}\n"
            "coste relativo a 416x736: x{:.2f}"
        ).format(proporcion.split()[0], width, height, mp,
                 w15, h15, width * 2, height * 2, rel)

        return (width, height, info)


class CineDuracion:
    """Segundos -> numero de fotogramas, ajustado a la rejilla que exige el modelo."""

    @classmethod
    def INPUT_TYPES(cls):
        # Todo en "optional" a proposito: la interfaz esconde rejilla, desfase
        # y minimo detras de "Ajustes avanzados", y un widget escondido puede
        # no viajar en el prompt. Si fueran obligatorios, el servidor
        # rechazaria el render por un campo que el usuario ni ve. Van todos
        # juntos para que el orden de guardado no cambie.
        return {
            "required": {},
            "optional": {
                "segundos": ("FLOAT", {"default": 8.0, "min": 0.5, "max": 60.0, "step": 0.5}),
                "fps": (FPS, {"default": "24  ·  nativo H3"}),
                "rejilla": ("INT", {"default": 17, "min": 1, "max": 64,
                                    "tooltip": "MiniMax H3 usa 17: los fotogramas se ajustan a 'desfase' + n*rejilla"}),
                "desfase": ("INT", {"default": 5, "min": 0, "max": 64}),
                "minimo_fotogramas": ("INT", {"default": 5, "min": 1, "max": 4096}),
                "avanzado": ("BOOLEAN", {"default": False,
                                         "tooltip": "Muestra la rejilla del modelo. Solo hace falta si cambias de modelo de video: H3 usa 17/5, otros usan otra rejilla."}),
            }
        }

    RETURN_TYPES = ("INT", "FLOAT", "STRING")
    RETURN_NAMES = ("frames", "segundos_reales", "info")
    FUNCTION = "calcular"
    CATEGORY = CATEGORY
    DESCRIPTION = "Duracion en segundos -> fotogramas validos para el modelo. MiniMax H3: 24 fps, rejilla 17, desfase 5. LTX-2.5: rejilla 8, desfase 1."

    def calcular(self, segundos=8.0, fps="24  ·  nativo H3", rejilla=17, desfase=5,
                 minimo_fotogramas=5, avanzado=False):
        try:
            f_ps = int(str(fps).split()[0])
        except (IndexError, ValueError):
            f_ps = 24

        base = max(int(minimo_fotogramas), int(round(segundos * f_ps)))
        if rejilla > 0:
            base = base + ((desfase - (base % rejilla)) % rejilla)
        reales = base / float(f_ps) if f_ps else 0.0

        aviso = "" if f_ps == 24 else "\nH3 genera a 24 fps: para 48/60 usa interpolacion"
        # MiniMax documenta 4-15 s en el README del modelo. Por debajo de 5.2 s
        # los resultados empeoran en la practica, asi que se avisa sin alarmar.
        if base < 96:
            aviso += "\nOJO: por debajo de 4 s, fuera del rango que documenta MiniMax (4-15 s)"
        elif base < 124:
            aviso += "\nAviso: por debajo de 5.2 s. Entra en el rango oficial, pero suele salir peor"
        elif base > 362:
            aviso += "\nOJO: mas de 15 s, fuera del rango que documenta MiniMax (4-15 s)"
        info = "{} fotogramas a {} fps = {:.2f} s reales\npediste {:.2f} s{}".format(
            base, f_ps, reales, segundos, aviso
        )
        return (base, reales, info)


# Reglas de oficio que valen para cualquier plano. Van dentro del nodo para
# que no haya que mantener un nodo de texto aparte: esa era la via por la que
# los detalles de una escena se colaban en todas las demas.
REGLAS_DE_OFICIO = """### Shot constraints

These rules apply to every shot and never describe a particular scene. What the scene contains is defined above.

A hand that is holding something keeps holding it from the moment it takes it until the last frame, and stays inside the frame while it does. It reads as a hand throughout: correct number of fingers, correct anatomy, skin texture and its own shadow. It never flattens into a solid shape or a patch of uniform colour.

No hand, arm or person enters the frame that was not already established in the scene above.

Nobody touches their hair, face, cheek, chin or clothing unless the scene above asks for it.

The camera stops pushing in while the faces, the hands and anything they hold are still fully inside the frame with margin around them.

Every surface keeps its own shape and material: a curved object stays curved across its whole visible side, with the light falling on it as a continuous highlight. The only flat rectangular shapes in the frame are the ones the scene above describes.

The faces keep the exact proportions of the reference pictures from the first frame to the last: same nose length and width, same eye spacing and eye shape, same jaw and beard line, same hairline. Each person reads as the same person at the end of the shot as at the beginning."""


# ---------------------------------------------------------------------------
# Vocabulario de camara.
#
# MiniMax publica una tabla de movimientos de camara en su guia oficial de
# prompts, y pide expresamente que se escriban como ingles normal dentro de la
# frase del plano, NO como etiquetas sueltas entre corchetes al final. Los
# corchetes en H3 ya significan otra cosa ([Shot 2], [reference generation]),
# asi que meter ahi "[Push in]" es pedir problemas.
#
# Los movimientos de abajo son los doce que MiniMax tabula, con sus palabras.
# Los tamanos de plano salen de los ejemplos oficiales. Los angulos NO estan
# documentados en ninguna de las dos guias: por eso van descritos como
# geometria ("mirando hacia arriba desde el suelo") y no como jerga de cine.
# ---------------------------------------------------------------------------

PLANOS = [
    ("sin especificar", ""),
    ("primerisimo primer plano", "an extreme close-up"),
    ("primer plano", "a close-up"),
    ("plano medio corto", "a close shot"),
    ("plano medio", "a medium shot"),
    ("plano americano", "a medium-wide shot"),
    ("plano general", "a wide shot"),
    ("gran plano general", "an extreme wide shot"),
]

ANGULOS = [
    ("sin especificar", ""),
    ("altura de los ojos", "the camera at the subject's eye level"),
    ("contrapicado", "the camera below the subject, looking up at them"),
    ("picado", "the camera above the subject, looking down at them"),
    ("cenital", "the camera directly overhead, looking straight down"),
    ("tres cuartos", "the camera about forty-five degrees off the subject's front"),
    ("sobre el hombro", "the camera just behind and beside the subject's shoulder, looking past it"),
]

MOVIMIENTOS = [
    ("sin especificar", ""),
    ("fijo", "holds a static shot for the entire shot"),
    ("acercarse", "pushes in toward the subject"),
    ("alejarse", "pulls out away from the subject"),
    ("zoom in", "zooms in on the subject"),
    ("zoom out", "zooms out from the subject"),
    ("panoramica izquierda", "pans left"),
    ("panoramica derecha", "pans right"),
    ("inclinar arriba", "tilts up"),
    ("inclinar abajo", "tilts down"),
    ("lateral izquierda", "trucks left"),
    ("lateral derecha", "trucks right"),
    ("grua arriba", "pedestals up"),
    ("grua abajo", "pedestals down"),
    # el arc shot tiende a girar al personaje en vez de a la camara: se le
    # dice explicitamente que el cuerpo no gira y que lo que corre es el fondo
    ("orbita", "arcs around the subject; the subject's body keeps facing its "
               "original direction while the background slides behind them with "
               "visible parallax"),
    ("seguimiento", "follows the subject in a tracking shot"),
    ("camara en mano", "shakes slightly, handheld"),
    ("punto de vista", "takes the point of view of the subject"),
    ("giro de horizonte", "rolls clockwise"),
]

INTENSIDADES = [
    ("normal", ""),
    ("suave", "with small amplitude at slow speed"),
    ("marcada", "with large amplitude at fast speed"),
]


# ---------------------------------------------------------------------------
# LTX-2.5 habla distinto. Mismas etiquetas en castellano, otro ingles.
#
# Su guia oficial (ltx.io/blog/prompting-guide-for-ltx-2) usa "dolly" y
# "cranes up", que son justo las palabras que MiniMax NO usa. Y pide un solo
# parrafo continuo, sin secciones y sin prompt negativo.
# ---------------------------------------------------------------------------

LTX_PLANOS = {
    "sin especificar": "",
    "primerisimo primer plano": "an extreme close-up",
    "primer plano": "a close-up",
    "plano medio corto": "a tight cinematic close-up",
    "plano medio": "a medium shot",
    "plano americano": "a medium wide shot",
    "plano general": "a wide shot",
    "gran plano general": "a wide establishing shot",
}

LTX_ANGULOS = {
    "sin especificar": "",
    "altura de los ojos": "at the subject's eye level",
    "contrapicado": "looking up at the subject from below",
    "picado": "looking down at the subject from above",
    "cenital": "an overhead view looking straight down",
    "tres cuartos": "at a three-quarter angle to the subject",
    "sobre el hombro": "an over-the-shoulder shot",
}

LTX_MOVIMIENTOS = {
    "sin especificar": "",
    "fijo": "holds a static frame",
    "acercarse": "pushes in toward the subject",
    "alejarse": "pulls back from the subject",
    "zoom in": "zooms in on the subject",
    "zoom out": "zooms out from the subject",
    "panoramica izquierda": "pans left",
    "panoramica derecha": "pans right",
    "inclinar arriba": "tilts up",
    "inclinar abajo": "tilts down",
    "lateral izquierda": "dollies left",
    "lateral derecha": "dollies right",
    "grua arriba": "cranes up",
    "grua abajo": "cranes down",
    "orbita": "circles around the subject, keeping them in frame while the background sweeps past",
    "seguimiento": "tracks the subject in handheld style",
    "camara en mano": "moves with a handheld feel",
    "punto de vista": "takes the subject's point of view",
    "giro de horizonte": "rolls slowly around the lens axis",
}


def _frase_camara_ltx(plano, angulo, movimiento):
    """Una frase de camara en el ingles que usa LTX, para meter en el parrafo."""
    p = LTX_PLANOS.get(plano, "")
    a = LTX_ANGULOS.get(angulo, "")
    m = LTX_MOVIMIENTOS.get(movimiento, "")
    fr = []
    if p and a:
        fr.append("The shot opens on {} {}.".format(p, a))
    elif p:
        fr.append("The shot opens on {}.".format(p))
    elif a:
        fr.append("The shot is filmed {}.".format(a))
    if m:
        fr.append("The camera {}.".format(m))
    return " ".join(fr)


def _num(v, porDefecto=0.75):
    """float() que no explota. Devuelve (valor, hubo_problema)."""
    try:
        if v is None:
            return porDefecto, True
        f = float(v)
        if f != f:                      # NaN: se cuela por float() sin quejarse
            return porDefecto, True
        return f, False
    except (TypeError, ValueError):
        return porDefecto, True


def _busca(tabla, clave):
    for k, v in tabla:
        if k == clave:
            return v
    return ""


def _frase_camara(plano, angulo, movimiento, intensidad):
    """Arma la frase de camara en ingles, en prosa, como pide la guia de H3."""
    p = _busca(PLANOS, plano)
    a = _busca(ANGULOS, angulo)
    m = _busca(MOVIMIENTOS, movimiento)
    i = _busca(INTENSIDADES, intensidad)

    frases = []
    if p and a:
        frases.append("The shot is framed as {}, with {}.".format(p, a))
    elif p:
        frases.append("The shot is framed as {}.".format(p))
    elif a:
        frases.append("The shot is filmed with {}.".format(a))

    if m:
        # "holds a static shot" y "takes the point of view" no admiten amplitud
        # el ";" marca un movimiento que ya trae su propia explicacion larga
        # (la orbita): pegarle " with small amplitude" al final queda fatal
        sin_intensidad = m.startswith("holds") or m.startswith("takes") or ";" in m
        frases.append("The camera {}{}.".format(m, "" if sin_intensidad or not i else " " + i))

    return " ".join(frases)


_RE_SHOT1 = re.compile(r"\[Shot\s*1\](?:\s*At\s*[\d:.]+)?", re.IGNORECASE)

# --- sustitucion de la camara al construir el prompt ------------------------
#
# Los chips mandan siempre. Si el texto ya trae una camara escrita, se quita
# DE UNA COPIA y se pone la nueva. El texto que ve el usuario no se toca: si
# el recorte saliera mal, se ve en el render y el prompt sigue intacto.
#
# El movimiento se come hasta el final de SU frase a proposito: lo que venia
# detras describia el movimiento viejo ("directly in front of him, at his eye
# height") y con el nuevo ya no es verdad.

_RE_PLANO = [re.compile(x, re.IGNORECASE) for x in (
    r"extreme close-?up", r"extreme wide shot", r"medium[- ]wide shot",
    r"tight cinematic close-?up", r"\bclose shot\b", r"\bclose-?up\b",
    r"\bmedium shot\b", r"wide establishing shot", r"\bwide shot\b",
)]

# Igual que _RE_PLANO pero llevandose el articulo por delante. Solo se usa
# para BORRAR: si se quita "medium shot" de "A medium shot frames him", el
# "A" se queda huerfano y la frase pierde el sentido.
_RE_PLANO_ART = [re.compile(r"(?:\b(?:an?|the)\s+)?(?:" + x.pattern + r")", re.IGNORECASE)
                 for x in _RE_PLANO]

_RE_MOV = [re.compile(r"(?:the camera\s+)?" + x + r"[^.]*", re.IGNORECASE) for x in (
    r"holds? a static (?:shot|frame)", r"push(?:es|ing)? in", r"pull(?:s|ing)? (?:out|back)",
    r"zoom(?:s|ing)? in", r"zoom(?:s|ing)? out", r"pan(?:s|ning)? (?:left|right)",
    r"tilt(?:s|ing)? (?:up|down)", r"truck(?:s|ing)? (?:left|right)",
    r"doll(?:y|ies|ying) (?:in|out|left|right)", r"pedestal(?:s|ing)? (?:up|down)",
    r"cran(?:e|es|ing) (?:up|down)", r"arc(?:s|ing)? around", r"circles around",
    r"tracking shot", r"shak(?:es|ing)", r"roll(?:s|ing)? (?:clockwise|counterclockwise)",
)]

# basura que queda al quitar frases: "[Shot 1] : ", " . .", espacios dobles
_LIMPIEZA = [
    (re.compile(r"(\[Shot\s*\d+\](?:\s*At\s*[\d:.]+)?)\s*[:,.;]+\s*"), r"\1 "),
    (re.compile(r"\s+([.,;:])"), r"\1"),
    (re.compile(r"([.;])\s*[.;]+"), r"\1"),
    (re.compile(r"[ \t]{2,}"), " "),
    (re.compile(r"\.\s*\."), "."),
    # dos puntos o coma que se quedan colgando delante de un punto
    (re.compile(r"\s*[:;,]\s*(?=[.?!]|$)"), ""),
    (re.compile(r"(^|[.?!]\s+)[:;,]\s*"), r"\1"),
]


# Como se escribe cada plano DENTRO de la prosa, sin articulo.
_PLANO_TXT = {
    "sin especificar": "", "primerisimo primer plano": "extreme close-up",
    "primer plano": "close-up", "plano medio corto": "close shot",
    "plano medio": "medium shot", "plano americano": "medium-wide shot",
    "plano general": "wide shot", "gran plano general": "extreme wide shot",
}
_PLANO_TXT_LTX = {
    "sin especificar": "", "primerisimo primer plano": "extreme close-up",
    "primer plano": "close-up", "plano medio corto": "tight cinematic close-up",
    "plano medio": "medium shot", "plano americano": "medium wide shot",
    "plano general": "wide shot", "gran plano general": "wide establishing shot",
}


def _como_estaba(viejo, nuevo):
    """Conserva la mayuscula inicial del trozo que se sustituye."""
    return nuevo[:1].upper() + nuevo[1:] if viejo[:1].isupper() else nuevo


def _pulir(texto):
    """Barre la puntuacion huerfana que dejan el sustituir y el insertar.

    Siempre al final de cada paso: si se limpia en medio, el punto de la
    frase nueva choca con el que quedo del recorte y salen dos seguidos.
    """
    for rx, rep in _LIMPIEZA:
        texto = rx.sub(rep, texto)
    return texto.strip()


def _camara_en_texto(texto, plano_txt, mov_txt):
    """Cambia la camara que ya hubiera, SUSTITUYENDO en su sitio.

    Borrar dejaba frases rotas y trozos sueltos ("Close-up:." colgando).
    Sustituir mantiene la prosa entera: donde ponia "Medium-wide shot" pone
    "Close-up", y donde ponia "holds a static shot directly in front of him"
    pone el movimiento nuevo, que ademas se come lo que venia detras porque
    describia el movimiento viejo.

    Devuelve (texto, plano_puesto, movimiento_puesto).
    """
    fuera = texto
    plano_ok = False
    mov_ok = False

    if plano_txt:
        for rx in _RE_PLANO:
            if rx.search(fuera):
                fuera = rx.sub(lambda m: _como_estaba(m.group(0), plano_txt), fuera)
                plano_ok = True
                break

    if mov_txt:
        for rx in _RE_MOV:
            if rx.search(fuera):
                fuera = rx.sub(lambda m: _como_estaba(m.group(0), mov_txt), fuera)
                mov_ok = True
                break

    return (_pulir(fuera) if (plano_ok or mov_ok) else texto), plano_ok, mov_ok


def _inyectar_camara(descripcion, bloque):
    """Mete la frase de camara dentro del plano, que es donde H3 la espera.

    La guia oficial coloca la camara al principio de la frase del plano, justo
    detras del marcador [Shot 1]. Si el texto no trae marcador, la ponemos al
    final para no romper el arranque por el estilo visual.
    """
    if not bloque:
        return descripcion
    if not descripcion.strip():
        return bloque
    m = _RE_SHOT1.search(descripcion)
    if m:
        i = m.end()
        return _pulir(descripcion[:i] + " " + bloque + " " + descripcion[i:])
    return _pulir(descripcion.rstrip() + "\n\n" + bloque)


def _aplicar_camara(descripcion, manual, plano, angulo, movimiento, intensidad, ltx=False):
    """Deja la descripcion con la camara que dicen los chips (o la caja).

    Trabaja SOBRE UNA COPIA: el texto que ve el usuario no se modifica nunca.
    Si el texto ya traia camara, el tamano de plano se sustituye en su sitio y
    el movimiento viejo se borra; luego se inserta solo lo que falte.
    """
    manual = (manual or "").strip()
    if manual:
        # texto a mano: no se puede sustituir palabra a palabra, asi que se
        # borra el movimiento viejo y se inserta lo que escribio el usuario
        texto = descripcion
        for tabla in (_RE_MOV, _RE_PLANO_ART):
            for rx in tabla:
                if rx.search(texto):
                    texto = rx.sub("", texto)
                    break
        return _inyectar_camara(_pulir(texto), manual)

    tablaP = _PLANO_TXT_LTX if ltx else _PLANO_TXT
    tablaM = LTX_MOVIMIENTOS if ltx else dict(MOVIMIENTOS)
    plano_txt = tablaP.get(plano, "")
    mov = tablaM.get(movimiento, "")
    mov_txt = ("the camera " + mov) if mov else ""

    texto, plano_ok, mov_ok = _camara_en_texto(descripcion, plano_txt, mov_txt)

    # solo se inserta lo que NO se pudo sustituir dentro de la prosa
    if ltx:
        falta = _frase_camara_ltx("sin especificar" if plano_ok else plano, angulo,
                                  "sin especificar" if mov_ok else movimiento)
    else:
        falta = _frase_camara("sin especificar" if plano_ok else plano, angulo,
                              "sin especificar" if mov_ok else movimiento, intensidad)
    return _inyectar_camara(texto, falta) if falta else texto


# Perfiles del nodo de prompt. Se agregan por nombre, no por posicion, para
# que los workflows guardados sigan reconociendo la pestana que ya usaban.
MODELOS = [
    "MiniMax H3",
    "LTX-2.5",
    "Wan 2.2",
    "Hunyuan 1.5",
    "CogVideoX 1.5",
    "Mochi 1",
    "Libre",
]


class CinePrompt6:
    """Arma prompts editables para las principales familias locales de video."""

    SECCIONES = [
        ("subject_definitions", "Etiqueta cada elemento: <Subject 1> es..., <Picture 1> es el primer fotograma de [Shot 1]."),
        ("summary", "Un parrafo. Empieza con el prefijo: [reference generation], [keyframe completion], [video editing], [video continuation], [audio reuse], [audio reference]."),
        ("retention_analysis", "Una linea por etiqueta: que se conserva de cada una."),
        ("detailed_description", "El cuerpo, 350-500 palabras. Empieza con el estilo, luego [Shot 1] sin timestamp. Los siguientes: [Shot N] At MM:SS.mmm."),
        ("overall_soundscape", "Ambiente y sonido diegetico."),
        ("non_diegetic_music", "Musica de fondo, o N/A."),
    ]

    @classmethod
    def INPUT_TYPES(cls):
        req = {}
        for nombre, ayuda in cls.SECCIONES:
            req[nombre] = ("STRING", {"multiline": True, "default": "", "tooltip": ayuda})
        req["omitir_vacias"] = ("BOOLEAN", {"default": True})
        req["reglas_de_oficio"] = ("BOOLEAN", {"default": True,
                                               "tooltip": "Anade al final unas reglas que valen para cualquier plano: manos que no sueltan lo que agarran, la camara que no corta las manos, las caras que no derivan. No describen ninguna escena concreta."})
        # Los widgets se guardan por POSICION en widgets_values, asi que todo
        # lo nuevo va al final: asi un workflow guardado antes sigue leyendo
        # sus seis secciones y sus dos interruptores donde estaban.
        req["plano"] = ([k for k, _ in PLANOS], {"default": "sin especificar",
                        "tooltip": "Tamano de plano. Sale de los ejemplos oficiales de MiniMax."})
        req["angulo"] = ([k for k, _ in ANGULOS], {"default": "sin especificar",
                         "tooltip": "Desde donde mira la camara. MiniMax no documenta los angulos, "
                                    "asi que se escriben describiendo la geometria, no con jerga."})
        req["movimiento"] = ([k for k, _ in MOVIMIENTOS], {"default": "sin especificar",
                             "tooltip": "Los doce movimientos que MiniMax tabula en su guia. "
                                        "Uno solo por plano: dos movimientos a la vez se emborronan."})
        req["intensidad"] = ([k for k, _ in INTENSIDADES], {"default": "normal",
                             "tooltip": "Amplitud y velocidad del movimiento. 'normal' no escribe nada, "
                                        "que es lo que pide la guia."})
        req["camara"] = ("STRING", {"multiline": True, "default": "",
                         "tooltip": "Si escribes algo aqui, manda sobre las tres listas de arriba. "
                                    "En ingles y en prosa. Se inserta dentro de detailed_description, "
                                    "justo detras de [Shot 1]."})

        # --- pestanas ------------------------------------------------------
        # Todo lo de abajo va al final y en este orden para siempre: los
        # valores se guardan por posicion. Los campos de los tres modelos
        # conviven declarados; la interfaz ensena solo los de la pestana viva.
        req["modelo"] = (MODELOS, {"default": MODELOS[0]})

        # LTX. Provisional hasta ver un workflow real del modelo.
        req["ltx_prompt"] = ("STRING", {"multiline": True, "default": "",
                             "tooltip": "Descripcion del plano. LTX espera un parrafo continuo, no secciones."})
        req["ltx_audio"] = ("STRING", {"multiline": True, "default": "",
                            "tooltip": "Sonido y dialogo, si el modelo los admite por separado."})
        req["ltx_negativo"] = ("STRING", {"multiline": True, "default": "",
                               "tooltip": "Prompt negativo. H3 no lo usa; otros modelos si."})

        # Libre: sirve para cualquier modelo, presente o futuro.
        req["libre_prompt"] = ("STRING", {"multiline": True, "default": "",
                               "tooltip": "El prompt tal cual lo quiere tu modelo. Aqui no se toca nada."})
        req["libre_extra"] = ("STRING", {"multiline": True, "default": "",
                              "tooltip": "Segundo campo, por si tu modelo separa negativo, audio o estilo."})
        req["libre_separador"] = ("STRING", {"multiline": False, "default": "\\n\\n",
                                  "tooltip": "Lo que se pone entre los dos campos al unirlos. \\n es un salto de linea."})
        req["libre_instruccion"] = ("STRING", {"multiline": True, "default": "",
                                    "tooltip": "Tu propia receta para la IA. El boton de copiar copia ESTO cuando la pestana Libre esta activa."})
        # Igual que en Duracion: las pestanas esconden los campos del modelo
        # que no esta activo, asi que TODO va en "optional". El orden se
        # conserva porque van en el mismo diccionario y en el mismo orden.
        req["extra"] = ("STRING", {"forceInput": True})

        # --- Wan 2.2 -----------------------------------------------------
        # Todo campo nuevo queda al final para no desplazar widgets_values
        # de workflows anteriores. Las secciones son una ayuda de edicion:
        # el modelo recibe un unico prompt continuo y un negativo separado.
        req["wan_modo"] = (["image-to-video", "text-to-video"],
                           {"default": "image-to-video"})
        req["wan_sujeto"] = ("STRING", {"multiline": True, "default": ""})
        req["wan_movimiento"] = ("STRING", {"multiline": True, "default": ""})
        req["wan_escena"] = ("STRING", {"multiline": True, "default": ""})
        req["wan_camara"] = ("STRING", {"multiline": True, "default": ""})
        req["wan_estilo"] = ("STRING", {"multiline": True, "default": ""})
        req["wan_negativo"] = ("STRING", {"multiline": True, "default": ""})

        # --- HunyuanVideo 1.5 -------------------------------------------
        req["hunyuan_modo"] = (["image-to-video", "text-to-video"],
                                {"default": "image-to-video"})
        for nombre in ("sujeto", "movimiento", "escena", "plano", "camara",
                       "luz", "estilo", "atmosfera", "negativo"):
            req["hunyuan_" + nombre] = ("STRING", {"multiline": True, "default": ""})

        # --- CogVideoX 1.5 ----------------------------------------------
        req["cog_modo"] = (["image-to-video", "text-to-video"],
                            {"default": "image-to-video"})
        for nombre in ("sujeto_escena", "accion_temporal", "camara_composicion",
                       "luz_color", "estilo_atmosfera", "negativo"):
            req["cog_" + nombre] = ("STRING", {"multiline": True, "default": ""})

        # --- Mochi 1 -----------------------------------------------------
        for nombre in ("sujeto", "accion", "entorno", "camara",
                       "luz_estilo", "negativo"):
            req["mochi_" + nombre] = ("STRING", {"multiline": True, "default": ""})
        return {"required": {}, "optional": req}

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("prompt", "negative")
    FUNCTION = "armar"
    CATEGORY = CATEGORY
    DESCRIPTION = "Perfiles de prompt para modelos locales de video, con positivo y negativo separados."

    def armar(self, omitir_vacias=True, reglas_de_oficio=True, extra=None,
              plano="sin especificar", angulo="sin especificar",
              movimiento="sin especificar", intensidad="normal", camara="",
              modelo=None, ltx_prompt="", ltx_audio="", ltx_negativo="",
              libre_prompt="", libre_extra="", libre_separador="\\n\\n",
              libre_instruccion="", **kwargs):
        modelo = modelo or MODELOS[0]

        # --- Libre: no se toca nada, se une y se entrega
        if modelo == "Libre":
            sep = (libre_separador or "\n\n").replace("\\n", "\n").replace("\\t", "\t")
            partes = [t.strip() for t in (libre_prompt, libre_extra) if t and t.strip()]
            salida = sep.join(partes)
            if extra and extra.strip():
                salida = (salida + sep + extra.strip()) if salida else extra.strip()
            return (salida, "")

        # --- LTX-2.5: UN SOLO PARRAFO. Su guia lo dice expresamente, y el
        # orden que pide es plano, escena, accion, personajes, camara, audio.
        # Por eso la camara y el sonido se anaden al final del texto y no en
        # bloques aparte. LTX no usa prompt negativo.
        if modelo == "LTX-2.5":
            # misma regla que en H3, pero con las palabras de LTX
            cuerpo = _aplicar_camara((ltx_prompt or "").strip(), camara, plano,
                                     angulo, movimiento, intensidad, ltx=True)
            trozos = [cuerpo]
            if (ltx_audio or "").strip():
                trozos.append(ltx_audio.strip())
            salida = _pulir(" ".join(t for t in trozos if t))
            if extra and extra.strip():
                salida = (salida + " " + extra.strip()).strip()
            return (salida, "")

        # Los cuatro perfiles siguientes se editan en bloques para que sea
        # facil revisar lo que devolvio la IA, pero sus modelos reciben un
        # unico texto continuo. El negativo sale por una conexion aparte.
        perfiles = {
            "Wan 2.2": (
                ("wan_sujeto", "wan_movimiento", "wan_escena", "wan_camara", "wan_estilo"),
                "wan_negativo",
            ),
            "Hunyuan 1.5": (
                ("hunyuan_sujeto", "hunyuan_movimiento", "hunyuan_escena",
                 "hunyuan_plano", "hunyuan_camara", "hunyuan_luz",
                 "hunyuan_estilo", "hunyuan_atmosfera"),
                "hunyuan_negativo",
            ),
            "CogVideoX 1.5": (
                ("cog_sujeto_escena", "cog_accion_temporal",
                 "cog_camara_composicion", "cog_luz_color",
                 "cog_estilo_atmosfera"),
                "cog_negativo",
            ),
            "Mochi 1": (
                ("mochi_sujeto", "mochi_accion", "mochi_entorno",
                 "mochi_camara", "mochi_luz_estilo"),
                "mochi_negativo",
            ),
        }
        if modelo in perfiles:
            campos, campo_negativo = perfiles[modelo]
            def valor(campo):
                texto = str(kwargs.get(campo) or "").strip()
                return "" if texto.lower() in {
                    "n/a", "na", "none", "not applicable", "sin especificar"
                } else texto

            salida = _pulir(" ".join(
                valor(c) for c in campos if valor(c)
            ))
            if extra and extra.strip():
                salida = (salida + " " + extra.strip()).strip()
            negativo = valor(campo_negativo)
            return (salida, negativo)

        # --- MiniMax H3: el formato de seis secciones de siempre
        # La camara no es una seccion aparte del formato: H3 la quiere dentro
        # de la descripcion, en la frase del plano. El texto a mano gana a las
        # listas para que se pueda afinar sin pelearse con los desplegables.
        partes = []
        for nombre, _ in self.SECCIONES:
            texto = (kwargs.get(nombre) or "").strip()
            if nombre == "detailed_description":
                texto = _aplicar_camara(texto, camara, plano, angulo,
                                        movimiento, intensidad).strip()
            if not texto and omitir_vacias:
                continue
            partes.append("{}:\n{}".format(nombre, texto if texto else "N/A"))
        salida = "\n\n".join(partes)
        if reglas_de_oficio:
            salida = salida + "\n\n" + REGLAS_DE_OFICIO
        if extra and extra.strip():
            salida = salida + "\n\n" + extra.strip()
        return (salida, "")



# ---------------------------------------------------------------------------
# Cargar H3: sustituye UNETLoader + CLIPLoader + 2 VAELoader + los parches
# de VRAM + el sigma shift. Diez nodos en uno.
# ---------------------------------------------------------------------------

def _desenvolver(salida):
    """Los nodos de la API nueva devuelven io.NodeOutput; los viejos, tuplas."""
    if salida is None:
        return None
    if isinstance(salida, (tuple, list)):
        return salida[0] if salida else None
    args = getattr(salida, "args", None)
    if args:
        return args[0]
    try:
        return salida[0]
    except Exception:
        return salida


# Guarda el motivo del ultimo fallo para poder explicarlo bien mas arriba.
_ULTIMO_ERROR = {"texto": ""}


def _sin_memoria(texto):
    t = (texto or "").lower()
    return any(p in t for p in ("allocation on device", "out of memory",
                                "outofmemory", "cuda error", "cublas"))


def _llamar_nodo(node_id, **kwargs):
    """Llama a un nodo registrado en ComfyUI por su id. Devuelve None si no existe."""
    try:
        import nodes as comfy_nodes
        cls = comfy_nodes.NODE_CLASS_MAPPINGS.get(node_id)
    except Exception:
        cls = None
    if cls is None:
        return None
    try:
        fn = getattr(cls, "execute", None)
        if fn is not None:
            return _desenvolver(fn(**kwargs))
        nombre = getattr(cls, "FUNCTION", None)
        if nombre:
            return _desenvolver(getattr(cls(), nombre)(**kwargs))
    except Exception as e:
        import logging
        _ULTIMO_ERROR["texto"] = "{}: {}".format(type(e).__name__, e)
        logging.warning("[Cine con IA] %s no se pudo aplicar: %s", node_id, e)
    return None


def _lista(carpeta):
    try:
        import folder_paths
        return folder_paths.get_filename_list(carpeta)
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Perfiles del cargador
#
# Cada familia de modelos se carga distinto y no basta con cambiar el nombre
# de los archivos:
#   - el codificador de texto se abre en un "modo" propio (CLIPType),
#   - el sigma shift lo pone un nodo distinto en cada familia,
#   - los troceos de VRAM de MiniMax solo valen para MiniMax,
#   - el VAE de audio solo lo usa H3; las demas familias no llevan audio.
#
# La tabla dice, por familia, que usar. Anadir una familia nueva es anadir
# una entrada aqui: cargar() no se toca.
#
# "shift" es una lista de candidatos; se prueban en orden y se usa el primero
# que exista en esta instalacion. Cada candidato es (nodo, forma):
#   "av"  -> shift_video y shift_audio, los dos
#   "uno" -> shift = shift_video
#   "ltx" -> max_shift = shift_video, base_shift = shift_audio
#
# "pistas" son trozos de nombre de archivo para que la interfaz rellene sola
# los cuatro desplegables. La copia de esta tabla que usa la interfaz esta en
# web/cineconia.js (PISTAS_PERFIL): si se toca una, se toca la otra.
# ---------------------------------------------------------------------------

PERFILES_CARGA = {
    "MiniMax H3": {
        "clip": "MINIMAX",
        "audio": True,
        "shift": [("MiniMaxH3SigmaShift", "av")],
        "parches": True,
        "previa": "taeh3",
        "valores": {"trocear_atencion": 16, "trocear_ffn": 16,
                    "shift_video": 6.0, "shift_audio": 3.0},
        "pistas": {
            "modelo": ["minimax_h3", "minimax", "_h3"],
            "codificador_texto": ["qwen3vl", "minimax"],
            "vae_video": ["h3_video_vae", "minimax"],
            "vae_audio": ["h3_audio_vae", "audio_vae"],
        },
    },
    "LTX-2.5": {
        "clip": "LTXV",
        "audio": False,
        "shift": [("ModelSamplingLTXV", "ltx"), ("ModelSamplingSD3", "uno")],
        "parches": False,
        "previa": "taelt",
        "valores": {"trocear_atencion": 1, "trocear_ffn": 1,
                    "shift_video": 2.05, "shift_audio": 0.95},
        "pistas": {
            "modelo": ["ltxv", "ltx"],
            "codificador_texto": ["t5xxl", "t5"],
            "vae_video": ["ltxv", "ltx"],
            "vae_audio": ["ltxv", "ltx"],
        },
    },
    "Wan 2.2": {
        "clip": "WAN",
        "audio": False,
        "shift": [("ModelSamplingSD3", "uno")],
        "parches": False,
        "previa": "taew",
        "valores": {"trocear_atencion": 1, "trocear_ffn": 1,
                    "shift_video": 8.0, "shift_audio": 3.0},
        "pistas": {
            "modelo": ["wan2", "wan_2", "wan"],
            "codificador_texto": ["umt5"],
            "vae_video": ["wan2", "wan"],
            "vae_audio": ["wan2", "wan"],
        },
    },
    "Hunyuan 1.5": {
        "clip": "HUNYUAN_VIDEO",
        "audio": False,
        "shift": [("ModelSamplingSD3", "uno")],
        "parches": False,
        "previa": "taehv",
        "valores": {"trocear_atencion": 1, "trocear_ffn": 1,
                    "shift_video": 7.0, "shift_audio": 3.0},
        "pistas": {
            "modelo": ["hunyuan"],
            "codificador_texto": ["llava", "llama"],
            "vae_video": ["hunyuan"],
            "vae_audio": ["hunyuan"],
        },
    },
}

# El orden manda en la interfaz. "Personalizado" va al final: no rellena nada
# y deduce la familia mirando los nombres de archivo que haya elegido el
# usuario, para que quien monte algo raro no se quede sin cargador.
PERFILES = list(PERFILES_CARGA) + ["Personalizado"]
PERFIL_POR_DEFECTO = "MiniMax H3"


def _familia_por_archivos(*nombres):
    """Deduce el perfil mirando los nombres de archivo elegidos.

    Se usa solo con 'Personalizado'. Puntua cada perfil por cuantas de sus
    pistas aparecen; gana el que mas puntue. Si no puntua ninguno, H3, que es
    con lo que nacio el nodo.
    """
    texto = " ".join(str(n or "").lower().replace("\\", "/") for n in nombres)
    # Los nombres se pisan entre familias: "hunyuan_video_vae" lleva dentro
    # "video_vae". Por eso cada campo suma la pista MAS LARGA que aparezca,
    # que siempre es la mas especifica, en vez de contar coincidencias sueltas.
    mejor, puntos_mejor = PERFIL_POR_DEFECTO, 0
    for nombre, perfil in PERFILES_CARGA.items():
        puntos = 0
        for pistas in perfil["pistas"].values():
            largos = [len(p) for p in pistas if p in texto]
            if largos:
                puntos += max(largos)
        if puntos > puntos_mejor:
            mejor, puntos_mejor = nombre, puntos
    return mejor


def _perfil_carga(nombre, *archivos):
    """Devuelve (nombre_resuelto, diccionario del perfil)."""
    if nombre in PERFILES_CARGA:
        return nombre, PERFILES_CARGA[nombre]
    resuelto = _familia_por_archivos(*archivos)
    return resuelto, PERFILES_CARGA[resuelto]


def _tipo_clip(nombre_tipo):
    """Traduce el nombre del modo del codificador al enum de ComfyUI.

    Si esta version de ComfyUI no conoce ese modo, se avisa y se sigue con el
    modo normal en vez de reventar la carga entera.
    """
    import logging
    import comfy.sd
    tipo = getattr(comfy.sd.CLIPType, nombre_tipo, None)
    if tipo is None:
        logging.warning("[Cine con IA] Esta version de ComfyUI no conoce el modo "
                        "de codificador %s. Se usa el modo normal.", nombre_tipo)
        tipo = getattr(comfy.sd.CLIPType, "STABLE_DIFFUSION", None)
    return tipo


def _aplicar_shift(model, candidatos, shift_video, shift_audio):
    """Prueba los nodos de sigma shift del perfil y usa el primero que exista.

    Devuelve (modelo, nota). Si no hay ninguno, deja el modelo igual: el shift
    es un ajuste, no un requisito, y vale mas seguir que parar el render.
    """
    for nodo, forma in candidatos:
        if forma == "av":
            args = {"shift_video": shift_video, "shift_audio": shift_audio}
        elif forma == "ltx":
            args = {"max_shift": shift_video, "base_shift": shift_audio}
        else:
            args = {"shift": shift_video}
        m = _llamar_nodo(nodo, model=model, **args)
        if m is not None:
            detalle = "/".join("{:g}".format(v) for v in args.values())
            return m, "shift {} ({})".format(detalle, nodo)
    return model, "sin shift (no esta {})".format(candidatos[0][0])


class CineCargarH3:
    """Carga el modelo, el codificador y los dos VAE, y aplica los ahorros de VRAM."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "modelo": (_lista("diffusion_models"),),
                "codificador_texto": (_lista("text_encoders"),),
                "vae_video": (_lista("vae"),),
                "vae_audio": (_lista("vae"),),
                "trocear_atencion": ("INT", {"default": 16, "min": 1, "max": 56,
                                             "tooltip": "El modelo mira el video con muchas cabezas independientes. Las procesa en N grupos en vez de todas a la vez. Resultado identico, menos memoria. 1 = todas de golpe."}),
                "trocear_ffn": ("INT", {"default": 16, "min": 1, "max": 64,
                                        "tooltip": "Parte el calculo pesado de cada bloque en N tandas en vez de hacerlo de una. Mismo resultado exacto, menos pico de VRAM, algo mas lento. 1 = sin trocear."}),
                "shift_video": ("FLOAT", {"default": 6.0, "min": 0.01, "max": 100.0, "step": 0.01}),
                "shift_audio": ("FLOAT", {"default": 3.0, "min": 0.01, "max": 100.0, "step": 0.01}),
                "lora": (["ninguno"] + _lista("loras"), {"default": "ninguno",
                          "tooltip": "LoRA opcional sobre el modelo. Para realismo de piel y rostro en H3: h3-realism-people-t2v-i2v-r2v.safetensors"}),
                "lora_fuerza": ("FLOAT", {"default": 0.0, "min": -2.0, "max": 3.0, "step": 0.05,
                                          "tooltip": "Sin LoRA queda en 0. Al elegir uno por primera vez, la interfaz propone 0.75 como punto de partida."}),
                "vista_previa": ("BOOLEAN", {"default": True,
                                             "tooltip": "Muestra el video avanzando mientras se genera, decodificado con un VAE diminuto. Cuesta muy poco y deja ver si la toma va bien antes de esperar el render entero."}),
            },
            # Ranuras 2 a 4. Van al final a proposito: los valores se guardan
            # por posicion y mover las de arriba romperia los workflows ya
            # guardados. Y van en "optional" para que un workflow guardado
            # antes de que existieran no falle la validacion por traerlas
            # vacias: la funcion ya tiene sus valores por defecto.
            "optional": {
                "lora_2": (["ninguno"] + _lista("loras"), {"default": "ninguno"}),
                "lora_fuerza_2": ("FLOAT", {"default": 0.0, "min": -2.0, "max": 3.0, "step": 0.05}),
                "lora_3": (["ninguno"] + _lista("loras"), {"default": "ninguno"}),
                "lora_fuerza_3": ("FLOAT", {"default": 0.0, "min": -2.0, "max": 3.0, "step": 0.05}),
                "lora_4": (["ninguno"] + _lista("loras"), {"default": "ninguno"}),
                "lora_fuerza_4": ("FLOAT", {"default": 0.0, "min": -2.0, "max": 3.0, "step": 0.05}),
                # El perfil se ve arriba del todo, pero el control de verdad va
                # aqui, el ultimo, por la misma razon de siempre: los valores
                # se guardan por posicion. Lo que se ve arriba son las
                # pestanas, que no se guardan y solo escriben en este campo.
                "perfil": (PERFILES, {"default": PERFIL_POR_DEFECTO,
                           "tooltip": "Que familia de modelos se esta cargando. Cambia el modo del codificador de texto, el nodo de sigma shift y que parches de VRAM tienen sentido. Personalizado no rellena nada y deduce la familia por el nombre de los archivos."}),
            },
        }

    RETURN_TYPES = ("MODEL", "CLIP", "VAE", "VAE", "STRING")
    RETURN_NAMES = ("model", "clip", "vae_video", "vae_audio", "info")
    FUNCTION = "cargar"
    CATEGORY = CATEGORY
    DESCRIPTION = "Modelo + codificador + VAE de video y audio, con el troceo de FFN y atencion ya aplicado."

    @classmethod
    def VALIDATE_INPUTS(cls, lora_fuerza=None, lora_fuerza_2=None,
                        lora_fuerza_3=None, lora_fuerza_4=None, **kwargs):
        """ComfyUI se salta la comprobacion de tipo de los campos que se
        nombran aqui. Solo las cuatro fuerzas: si a una le llega algo que no
        es un numero, se arregla dentro y se avisa, pero NO se para un render
        de media hora por eso. Todo lo demas se sigue validando como siempre.
        """
        return True

    def cargar(self, modelo, codificador_texto, vae_video, vae_audio,
               trocear_atencion, trocear_ffn, shift_video, shift_audio,
               lora="ninguno", lora_fuerza=0.0, vista_previa=True,
               lora_2="ninguno", lora_fuerza_2=0.0,
               lora_3="ninguno", lora_fuerza_3=0.0,
               lora_4="ninguno", lora_fuerza_4=0.0,
               perfil=PERFIL_POR_DEFECTO):
        import logging
        import folder_paths
        import comfy.sd
        import comfy.utils

        notas = []

        # --- que familia se esta cargando. De aqui salen el modo del
        # codificador, el nodo de shift, si hay audio y que parches valen.
        nombre_perfil, p = _perfil_carga(
            perfil, modelo, codificador_texto, vae_video, vae_audio)
        if perfil not in PERFILES_CARGA:
            notas.append("perfil {} (deducido)".format(nombre_perfil))
        else:
            notas.append("perfil {}".format(nombre_perfil))

        # --- modelo
        ruta = folder_paths.get_full_path_or_raise("diffusion_models", modelo)
        model = comfy.sd.load_diffusion_model(ruta, model_options={})

        # --- LoRAs opcionales, en cadena y por orden, antes de los parches
        # para que estos envuelvan el modelo ya modificado. El orden importa:
        # cada uno se aplica sobre el resultado del anterior.
        cadena = []
        for ranura, (nombre, fuerza) in enumerate(
                ((lora, lora_fuerza), (lora_2, lora_fuerza_2),
                 (lora_3, lora_fuerza_3), (lora_4, lora_fuerza_4)), start=1):
            if not nombre or nombre == "ninguno":
                continue
            valor, raro = _num(fuerza)
            if raro:
                logging.warning("[Cine con IA] La fuerza del LoRA %d llego como %r, "
                                "que no es un numero. Se usa 0.75. Si esto se repite, "
                                "revisa el nodo Cargar modelo.", ranura, fuerza)
            m = _llamar_nodo("LoraLoaderModelOnly", model=model,
                             lora_name=nombre, strength_model=valor)
            corto = nombre.split("\\")[-1].split("/")[-1].replace(".safetensors", "")
            if m is not None:
                model = m
                cadena.append("{} x{}".format(corto, valor))
            else:
                cadena.append("{} (FALLO)".format(corto))
        if cadena:
            notas.append("LoRA: " + " -> ".join(cadena))

        # --- codificador de texto, en el modo que pida la familia
        ruta_clip = folder_paths.get_full_path_or_raise("text_encoders", codificador_texto)
        clip = comfy.sd.load_clip(
            ckpt_paths=[ruta_clip],
            embedding_directory=folder_paths.get_folder_paths("embeddings"),
            clip_type=_tipo_clip(p["clip"]),
            model_options={},
        )

        # --- VAE. El de audio solo lo abre H3: cargar un segundo VAE que
        # nadie va a usar cuesta RAM para nada. En las familias sin audio la
        # salida vae_audio repite la de video para no dejar la ranura vacia.
        def _vae(nombre):
            rp = folder_paths.get_full_path_or_raise("vae", nombre)
            sd, meta = comfy.utils.load_torch_file(rp, return_metadata=True)
            return comfy.sd.VAE(sd=sd, metadata=meta)

        vae_v = _vae(vae_video)
        if p["audio"]:
            vae_a = _vae(vae_audio)
        else:
            vae_a = vae_v
            notas.append("sin VAE de audio ({} no lleva audio)".format(nombre_perfil))

        # --- parches de VRAM (KJNodes). Son de MiniMax: en otras familias no
        # se aplican aunque el numero este puesto. Si no estan, se sigue.
        if not p["parches"]:
            if trocear_ffn > 1 or trocear_atencion > 1:
                notas.append("troceo omitido (solo sirve en MiniMax)")
        else:
            if trocear_ffn > 1:
                m = _llamar_nodo("MiniMaxChunkFeedForward", model=model,
                                 chunks=trocear_ffn, seq_threshold=2048)
                if m is not None:
                    model = m
                    notas.append("FFN troceado x{}".format(trocear_ffn))
                else:
                    notas.append("FFN sin trocear (falta KJNodes)")

            if trocear_atencion > 1:
                m = _llamar_nodo("MiniMaxLowVRAMAttention", model=model,
                                 head_chunks=trocear_atencion)
                if m is not None:
                    model = m
                    notas.append("atencion en {} grupos".format(trocear_atencion))
                else:
                    notas.append("atencion sin trocear (falta KJNodes)")

        # --- sigma shift, con el nodo que use cada familia
        model, nota_shift = _aplicar_shift(model, p["shift"], shift_video, shift_audio)
        notas.append(nota_shift)

        # --- vista previa en vivo (KJNodes + un VAE diminuto)
        if vista_previa:
            clave = p["previa"]
            pequenos = [v for v in _lista("vae_approx") if clave in v.lower()] or _lista("vae_approx")
            if pequenos:
                m = _llamar_nodo("ModelPreviewOverrideKJ", model=model, vae=vae_v,
                                 max_resolution=1024, jpeg_quality=80,
                                 suppress_default_preview=True,
                                 preview_frames=1, preview_fps=12,
                                 tiny_vae=pequenos[0])
                if m is not None:
                    model = m
                    notas.append("vista previa con {}".format(pequenos[0]))
                else:
                    notas.append("sin vista previa (falta KJNodes)")
            else:
                notas.append("sin vista previa (falta un VAE en models/vae_approx)")

        info = "\n".join([
            modelo.split("\\")[-1].split("/")[-1],
            ", ".join(notas) if notas else "sin parches",
        ])
        logging.info("[Cine con IA] Cargar modelo: %s",
                     " | ".join(notas) if notas else "sin parches")
        return (model, clip, vae_v, vae_a, info)


# ---------------------------------------------------------------------------
# Utilidades compartidas por Escalar y Salida
# ---------------------------------------------------------------------------

def _llamar_nodo_todo(node_id, **kwargs):
    """Igual que _llamar_nodo pero devuelve la tupla completa de salidas."""
    try:
        import nodes as comfy_nodes
        cls = comfy_nodes.NODE_CLASS_MAPPINGS.get(node_id)
    except Exception:
        cls = None
    if cls is None:
        return None
    try:
        fn = getattr(cls, "execute", None)
        if fn is None:
            nombre = getattr(cls, "FUNCTION", None)
            if not nombre:
                return None
            salida = getattr(cls(), nombre)(**kwargs)
        else:
            salida = fn(**kwargs)
        if salida is None:
            return None
        if isinstance(salida, (tuple, list)):
            return tuple(salida)
        args = getattr(salida, "args", None)
        if args is not None:
            return tuple(args)
        return (salida,)
    except Exception as e:
        import logging
        logging.warning("[Cine con IA] %s fallo: %s", node_id, e)
    return None


def _separar_av(latente):
    """Parte el latente conjunto de H3 en video y audio."""
    par = _llamar_nodo_todo("LTXVSeparateAVLatent", av_latent=latente)
    if par and len(par) >= 2:
        return par[0], par[1]
    s = latente["samples"]
    tensores = getattr(s, "tensors", None)
    if not tensores or len(tensores) != 2:
        raise ValueError("Esto no parece un latente de video+audio de MiniMax H3")
    return {"samples": tensores[0]}, {"samples": tensores[1]}


def _unir_av(latente_video, latente_audio):
    """Vuelve a juntar video y audio en el latente conjunto."""
    uno = _llamar_nodo("LTXVConcatAVLatent",
                       video_latent=latente_video, audio_latent=latente_audio)
    if uno is not None:
        return uno
    import comfy.nested_tensor
    return {"samples": comfy.nested_tensor.NestedTensor(
        (latente_video["samples"], latente_audio["samples"]))}


def _samplers():
    try:
        import comfy.samplers
        return list(comfy.samplers.SAMPLER_NAMES)
    except Exception:
        return ["er_sde", "euler", "res_multistep", "dpmpp_2m"]


def _sampler_por_defecto():
    lista = _samplers()
    return "er_sde" if "er_sde" in lista else lista[0]


# Escalones de ruido medidos para el pase de refinado de H3.
SIGMAS_REFINADO = {
    "3 pasos  ·  rapido": [0.9035, 0.6316, 0.3158, 0.0000],
    "4 pasos  ·  recomendado": [0.9035, 0.8000, 0.6316, 0.3158, 0.0000],
    "5 pasos  ·  maxima calidad": [0.9231, 0.8780, 0.8000, 0.6316, 0.3158, 0.0000],
}
PASOS_REFINADO = list(SIGMAS_REFINADO.keys())


def _schedulers():
    try:
        import comfy.samplers
        return list(comfy.samplers.SCHEDULER_NAMES)
    except Exception:
        return ["beta", "normal", "simple", "karras"]


def _ajustar(imagen, width, height):
    """Lleva una imagen al tamano exacto del video, recortando al centro."""
    import comfy.utils
    s = imagen[..., :3].movedim(-1, 1)
    s = comfy.utils.common_upscale(s, width, height, "lanczos", "center")
    return s.movedim(1, -1)


# ---------------------------------------------------------------------------
# Escena H3: sustituye MiniMaxH3ReferenceToVideo + los MiniMaxH3AddGuide +
# el redimensionado de la imagen guia. Cinco nodos en uno.
# ---------------------------------------------------------------------------

class CineEscenaH3:
    """Arma el condicionamiento y el latente vacio a partir del prompt y las referencias."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "clip": ("CLIP",),
                "vae_video": ("VAE",),
                "vae_audio": ("VAE",),
                "prompt": ("STRING", {"multiline": True, "default": "",
                                      "tooltip": "Conectalo al nodo Prompt 6 Secciones o escribelo aqui."}),
                "width": ("INT", {"default": 416, "min": 32, "max": 16384, "step": 32}),
                "height": ("INT", {"default": 736, "min": 32, "max": 16384, "step": 32}),
                "length": ("INT", {"default": 124, "min": 5, "max": 3600, "step": 17}),
                "tamano_referencia": (["max  ·  mas identidad", "match  ·  mas rapido"],
                                      {"default": "max  ·  mas identidad",
                                       "tooltip": "'max' lee la referencia a 2048 px de lado corto: conserva mucho mejor la cara y la textura, pero es mas lento. 'match' la baja al area del video: mas rapido, menos identidad."}),
                "fotograma_guia": ("INT", {"default": 0, "min": 0, "max": 3600,
                                           "tooltip": "En que fotograma se ancla la imagen guia. 0 = primer fotograma."}),
            },
            "optional": {
                "referencia_1": ("IMAGE",),
                "referencia_2": ("IMAGE",),
                "referencia_3": ("IMAGE",),
                "imagen_guia": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("CONDITIONING", "CONDITIONING", "LATENT", "STRING")
    RETURN_NAMES = ("positive", "positive_escalar", "latent", "info")
    FUNCTION = "escena"
    CATEGORY = CATEGORY
    DESCRIPTION = "Prompt + imagenes de referencia -> condicionamiento y latente de video+audio de H3."

    def escena(self, clip, vae_video, vae_audio, prompt, width, height, length,
               tamano_referencia, fotograma_guia,
               referencia_1=None, referencia_2=None, referencia_3=None, imagen_guia=None):
        import logging

        refs = {}
        for img in (referencia_1, referencia_2, referencia_3):
            if img is not None:
                refs["ref_image_{}".format(len(refs))] = img

        par = _llamar_nodo_todo(
            "MiniMaxH3ReferenceToVideo",
            clip=clip, vae=vae_video, audio_vae=vae_audio,
            prompt=prompt, width=int(width), height=int(height), length=int(length),
            ref_image_size="max" if str(tamano_referencia).startswith("max") else "match",
            ref_images=refs or None,
        )
        if not par or len(par) < 2:
            raise RuntimeError("Falta el nodo MiniMaxH3ReferenceToVideo del core de ComfyUI")
        positivo, latente = par[0], par[1]

        notas = ["{} referencia(s)".format(len(refs))] if refs else ["sin referencias"]

        # El anclaje de la imagen guia lleva dentro un latente del tamano de
        # este pase. En el segundo pase el latente ya esta escalado y ese
        # anclaje no encaja, asi que se entrega tambien el condicionamiento
        # sin guia, que es lo que debe alimentar a Escalar y Refinar.
        positivo_escalar = positivo

        if imagen_guia is not None:
            guia = _ajustar(imagen_guia, int(width), int(height))
            nuevo = _llamar_nodo("MiniMaxH3AddGuide",
                                 positive=positivo, latent=latente,
                                 frame_idx=int(fotograma_guia),
                                 vae=vae_video, audio_vae=vae_audio, image=guia)
            if nuevo is not None:
                positivo = nuevo
                notas.append("guia en el fotograma {}".format(fotograma_guia))

        if int(length) < 124:
            notas.append("OJO: {} fotogramas, bajo el rango entrenado de H3 (124-362)".format(length))
        info = "{}x{}  ·  {} fotogramas  ·  {}".format(width, height, length, ", ".join(notas))
        logging.info("[Cine con IA] Escena H3: %s", info)
        return (positivo, positivo_escalar, latente, info)


# ---------------------------------------------------------------------------
# Render H3: sustituye KSamplerSelect + BasicScheduler + BasicGuider +
# RandomNoise + SamplerCustomAdvanced. Cinco nodos en uno.
# ---------------------------------------------------------------------------

class CineRenderH3:
    """Primer pase de sampleo."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": ("MODEL",),
                "positivo": ("CONDITIONING",),
                "latente": ("LATENT",),
                "pasos": ("INT", {"default": 8, "min": 1, "max": 100}),
                "sampler": (_samplers(), {"default": _sampler_por_defecto()}),
                "scheduler": (_schedulers(), {"default": "beta" if "beta" in _schedulers() else _schedulers()[0]}),
                "semilla": ("INT", {"default": 833, "min": 0, "max": 0xffffffffffffffff,
                                    "control_after_generate": True}),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
            }
        }

    RETURN_TYPES = ("LATENT", "STRING")
    RETURN_NAMES = ("latent", "info")
    FUNCTION = "render"
    CATEGORY = CATEGORY
    DESCRIPTION = "Primer pase: convierte el latente vacio en el video latente."

    def render(self, model, positivo, latente, pasos, sampler, scheduler, semilla, denoise):
        import logging

        sigmas = _llamar_nodo("BasicScheduler", model=model, scheduler=scheduler,
                              steps=int(pasos), denoise=float(denoise))
        obj_sampler = _llamar_nodo("KSamplerSelect", sampler_name=sampler)
        guia = _llamar_nodo("BasicGuider", model=model, conditioning=positivo)
        ruido = _llamar_nodo("RandomNoise", noise_seed=int(semilla))

        if sigmas is None or obj_sampler is None or guia is None or ruido is None:
            raise RuntimeError("Faltan los nodos de sampleo avanzado del core de ComfyUI")

        salida = _llamar_nodo("SamplerCustomAdvanced",
                              noise=ruido, guider=guia, sampler=obj_sampler,
                              sigmas=sigmas, latent_image=latente)
        if salida is None:
            raise RuntimeError("El sampleo fallo")

        info = "{} pasos  ·  {}  ·  {}  ·  semilla {}".format(pasos, sampler, scheduler, semilla)
        logging.info("[Cine con IA] Render H3: %s", info)
        return (salida, info)


# ---------------------------------------------------------------------------
# Escalar y Refinar: sustituye separar + escalador + juntar + KSamplerSelect +
# BasicGuider + RandomNoise + sigmas + SamplerCustomAdvanced. Ocho nodos en uno.
# ---------------------------------------------------------------------------

class CineEscalarRefinar:
    """Segundo pase: sube la resolucion del latente y lo vuelve a samplear."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": ("MODEL",),
                "positivo": ("CONDITIONING",),
                "latente": ("LATENT",),
                "activar": ("BOOLEAN", {"default": True,
                                        "tooltip": "Apagado, el latente pasa de largo sin escalar ni refinar. Util para probar solo el primer pase."}),
                "escala": ("FLOAT", {"default": 2.0, "min": 1.0, "max": 4.0, "step": 0.05,
                                     "tooltip": "Cuanto se multiplica el lado. 2.0 = el doble de ancho y alto."}),
                "modelo_escalador": (_lista("latent_upscale_models"),),
                "pasos": (PASOS_REFINADO, {"default": PASOS_REFINADO[1]}),
                "sampler": (_samplers(), {"default": _sampler_por_defecto()}),
                "semilla": ("INT", {"default": 833, "min": 0, "max": 0xffffffffffffffff,
                                    "control_after_generate": True}),
            }
        }

    RETURN_TYPES = ("LATENT", "STRING")
    RETURN_NAMES = ("latent", "info")
    FUNCTION = "escalar"
    CATEGORY = CATEGORY
    DESCRIPTION = "Escala el latente de video con el upscaler 3D de H3 y lo refina en pocos pasos."

    def escalar(self, model, positivo, latente, activar, escala,
                modelo_escalador, pasos, sampler, semilla):
        import logging
        import torch

        if not activar:
            return (latente, "escalado y refinado: apagado")

        latente_video, latente_audio = _separar_av(latente)

        grande = _llamar_nodo(
            "MinimaxH3LatentUpscaler3D",
            latent=latente_video,
            model_name=modelo_escalador,
            mode={"mode": "scale by multiplier", "scale": float(escala)},
            align=32,
            enable_temporal_chunking=True,
            force_unload=True,
            device="cuda",
            precision="fp16",
        )
        if grande is None:
            return (latente, "falta el nodo MinimaxH3LatentUpscaler3D: se devuelve el latente sin escalar")

        juntos = _unir_av(grande, latente_audio)

        # El escalador deja en VRAM su modelo y los intermedios del pase. Aqui
        # es justo donde se decide si el refinado cabe o se va a memoria
        # compartida; y una vez ahi cada paso tarda minutos y Windows acaba
        # reiniciando el driver (CUDA error: unknown error). Se devuelve todo
        # lo que se pueda antes de arrancar.
        try:
            import gc
            import comfy.model_management as mm
            del latente_video
            gc.collect()
            mm.soft_empty_cache()
        except Exception:
            pass

        try:
            t = grande["samples"]
            logging.info("[Cine con IA] Refinado: %sx%s px, %s, sampler %s",
                         t.shape[-1] * 16, t.shape[-2] * 16, pasos, sampler)
        except Exception:
            pass

        obj_sampler = _llamar_nodo("KSamplerSelect", sampler_name=sampler)
        guia = _llamar_nodo("BasicGuider", model=model, conditioning=positivo)
        ruido = _llamar_nodo("RandomNoise", noise_seed=int(semilla))
        sigmas = torch.tensor(SIGMAS_REFINADO[pasos], dtype=torch.float32)

        if obj_sampler is None or guia is None or ruido is None:
            return (juntos, "escalado hecho, pero falta el sampler del core: sin refinado")

        _ULTIMO_ERROR["texto"] = ""
        salida = _llamar_nodo("SamplerCustomAdvanced",
                              noise=ruido, guider=guia, sampler=obj_sampler,
                              sigmas=sigmas, latent_image=juntos)
        if salida is None:
            causa = _ULTIMO_ERROR["texto"]
            try:
                t = grande["samples"]
                w_px, h_px = t.shape[-1] * 16, t.shape[-2] * 16
                medida = "{}x{} px".format(w_px, h_px)
            except Exception:
                medida = "el tamano pedido"

            if _sin_memoria(causa):
                raise RuntimeError(
                    "No hay VRAM suficiente para refinar a {}. El primer pase si cabe, "
                    "el segundo no. Se detiene aqui a proposito: seguir habria dado un "
                    "video escalado pero sin refinar, o sea blando y sin detalle en la "
                    "cara.\n"
                    "Que hacer, de menos a mas drastico: baja la Escala de este nodo "
                    "(1.7 -> 1.5), o baja el Tamano en el panel de Proporcion y Tamano "
                    "(0.50 -> 0.40 MP), o apaga 'Activar el escalado' para quedarte con "
                    "el primer pase.\n"
                    "Error original: {}".format(medida, causa))

            raise RuntimeError(
                "El refinado fallo y el video habria salido sin refinar (blando, sin "
                "detalle en la cara). Si el error habla de 'shape mismatch' o "
                "'broadcast', el condicionamiento que entra aqui trae el anclaje de la "
                "imagen guia, que es del tamano del primer pase: conecta la salida "
                "'positive_escalar' de Escena H3 a este nodo, no 'positive'.\n"
                "Error original: {}".format(causa or "desconocido"))

        try:
            t = salida["samples"]
            v = t.tensors[0] if hasattr(t, "tensors") else t
            medida = "{}x{} px".format(v.shape[-1] * 16, v.shape[-2] * 16)
        except Exception:
            medida = "escalado x{}".format(escala)

        info = "{}  ·  {}  ·  semilla {}".format(medida, pasos.split("·")[0].strip(), semilla)
        logging.info("[Cine con IA] Escalar y Refinar: %s", info)
        return (salida, info)


# ---------------------------------------------------------------------------
# Salida: sustituye VAEDecode + VAEDecodeAudio + cargar modelo de
# interpolacion + FrameInterpolate + el armado del video. Cinco nodos en uno.
# ---------------------------------------------------------------------------

INTERPOLACION = [
    "no  ·  24 fps",
    "x2  ·  48 fps",
    "x3  ·  72 fps",
    "x4  ·  96 fps",
]


class CineSalida:
    """Decodifica video y audio, interpola fotogramas y arma el video final."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "latente": ("LATENT",),
                "vae_video": ("VAE",),
                "vae_audio": ("VAE",),
                "interpolar": (INTERPOLACION, {"default": INTERPOLACION[1],
                                               "tooltip": "Inventa fotogramas intermedios para que el movimiento sea mas suave. No cambia la duracion."}),
                "modelo_interpolacion": (_lista("frame_interpolation"),),
                "fps_base": ("FLOAT", {"default": 24.0, "min": 1.0, "max": 120.0, "step": 1.0,
                                       "tooltip": "H3 genera a 24 fps. Cambiarlo acelera o frena el video."}),
            }
        }

    RETURN_TYPES = ("VIDEO", "IMAGE", "AUDIO", "FLOAT", "STRING")
    RETURN_NAMES = ("video", "fotogramas", "audio", "fps", "info")
    FUNCTION = "salida"
    CATEGORY = CATEGORY
    DESCRIPTION = "Decodifica, interpola y arma el video final. Conecta 'video' a Guardar Video."

    def salida(self, latente, vae_video, vae_audio, interpolar,
               modelo_interpolacion, fps_base):
        import logging

        imagenes = _llamar_nodo("VAEDecode", samples=latente, vae=vae_video)
        if imagenes is None:
            raise RuntimeError("No se pudo decodificar el video")
        audio = _llamar_nodo("VAEDecodeAudio", samples=latente, vae=vae_audio)

        multiplicador = 1
        if interpolar.startswith("x"):
            try:
                multiplicador = int(interpolar[1])
            except Exception:
                multiplicador = 2

        notas = []
        if multiplicador > 1 and modelo_interpolacion:
            interp = _llamar_nodo("FrameInterpolationModelLoader",
                                  model_name=modelo_interpolacion)
            if interp is not None:
                nuevas = _llamar_nodo("FrameInterpolate", interp_model=interp,
                                      images=imagenes, multiplier=multiplicador)
                if nuevas is not None:
                    imagenes = nuevas
                    notas.append("interpolado x{}".format(multiplicador))
                else:
                    multiplicador = 1
                    notas.append("interpolacion fallida")
            else:
                multiplicador = 1
                notas.append("falta el modelo de interpolacion")
        else:
            multiplicador = 1

        fps_final = float(fps_base) * multiplicador

        video = _llamar_nodo("CreateVideo", images=imagenes, fps=fps_final, audio=audio)
        if video is None:
            notas.append("sin objeto VIDEO (usa fotogramas + audio)")

        n = int(imagenes.shape[0]) if hasattr(imagenes, "shape") else 0
        info = "  ·  ".join(filter(None, [
            "{} fotogramas".format(n),
            "{:.0f} fps".format(fps_final),
            "{:.2f} s".format(n / fps_final) if fps_final else "",
            ", ".join(notas),
        ]))
        logging.info("[Cine con IA] Salida: %s", info)
        return (video, imagenes, audio, fps_final, info)


NODE_CLASS_MAPPINGS = {
    "CineCargarH3": CineCargarH3,
    "CineEscenaH3": CineEscenaH3,
    "CineRenderH3": CineRenderH3,
    "CineEscalarRefinar": CineEscalarRefinar,
    "CineSalida": CineSalida,
    "CineRatioSize": CineRatioSize,
    "CineDuracion": CineDuracion,
    "CinePrompt6": CinePrompt6,
}

# Los nombres de CLASE no se tocan nunca: son la llave con la que ComfyUI
# encuentra cada nodo dentro de un workflow guardado. Lo que se ve en
# pantalla si puede cambiar, y va entre parentesis el modelo al que sirve
# cada nodo hoy: asi se distinguen cuando haya un "Cargar (LTX)" al lado.
NODE_DISPLAY_NAME_MAPPINGS = {
    "CineCargarH3": "Cine con IA · Cargar modelo",
    "CineEscenaH3": "Cine con IA · Escena",
    "CineRenderH3": "Cine con IA · Render",
    "CineEscalarRefinar": "Cine con IA · Escalar y Refinar",
    "CineSalida": "Cine con IA · Salida",
    "CineRatioSize": "Cine con IA · Proporción y Tamaño",
    "CineDuracion": "Cine con IA · Duración",
    "CinePrompt6": "Cine con IA · Prompt",
}
