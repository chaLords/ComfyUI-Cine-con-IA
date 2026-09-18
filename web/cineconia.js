import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const ACCENT = "#e08a3c";
const CHIP_BG = "#2b3335";
const CHIP_FG = "#9fb0b0";
const CHIP_ON_FG = "#12181a";
const INFO_FG = "#8fb9b3";

const SEGUNDOS = [2, 3, 4, 5, 6, 8, 10, 12, 15];

// etiqueta corta -> valor real del combo de Python
const RATIOS = [
  ["9:16", "9:16  vertical (reels, tiktok)"],
  ["2:3", "2:3   vertical (foto)"],
  ["4:5", "4:5   vertical (instagram)"],
  ["3:4", "3:4   vertical (clasico)"],
  ["1:1", "1:1   cuadrado"],
  ["4:3", "4:3   horizontal (clasico)"],
  ["3:2", "3:2   horizontal (foto)"],
  ["16:9", "16:9  horizontal (cine, youtube)"],
  ["1.85", "1.85:1 horizontal (cine)"],
  ["2.39", "2.39:1 horizontal (scope)"],
];

const RATIO_VAL = {
  "9:16": 9 / 16, "2:3": 2 / 3, "4:5": 4 / 5, "3:4": 3 / 4, "1:1": 1,
  "4:3": 4 / 3, "3:2": 3 / 2, "16:9": 16 / 9, "1.85": 1.85, "2.39": 2.39,
};

const TAM_MP = [
  ["0.15", "0.15 MP  ·  prueba rapida"],
  ["0.2", "0.20 MP"],
  ["0.25", "0.25 MP"],
  ["0.3", "0.30 MP  ·  base medida"],
  ["0.4", "0.40 MP"],
  ["0.5", "0.50 MP"],
  ["0.7", "0.70 MP"],
  ["1.0", "1.00 MP"],
];

const TAM_LADO = [
  ["512", "tamano 512"], ["640", "tamano 640"],
  ["704", "tamano 704"], ["768", "tamano 768"],
  ["864", "tamano 864"], ["1024", "tamano 1024"],
  ["1216", "tamano 1216"], ["1344", "tamano 1344"],
];

// una entrada es de megapixeles si empieza por numero; si no, es dimension mayor
const esMP = (t) => /^[0-9]/.test(String(t ?? "").trim());
const ultimoNumero = (t) => {
  const m = String(t ?? "").match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 864;
};

const FPS_CHIPS = [
  ["24", "24  ·  nativo H3"], ["25", "25"], ["30", "30"], ["48", "48"], ["60", "60"],
];

const ETIQUETAS = {
  proporcion: "Proporción",
  tamano: "Tamaño",
  personalizado_mp: "MP a medida",
  multiplo_de: "Múltiplo de",
  segundos: "Segundos",
  fps: "FPS",
  rejilla: "Rejilla",
  desfase: "Desfase",
  minimo_fotogramas: "Mínimo",
  omitir_vacias: "Omitir secciones vacías",
  reglas_de_oficio: "Añadir reglas de oficio",
  modelo: "Modelo",
  codificador_texto: "Codificador de texto",
  vae_video: "VAE de vídeo",
  vae_audio: "VAE de audio",
  trocear_atencion: "Ahorro VRAM · attention",
  trocear_ffn: "Ahorro VRAM · FFN",
  shift_video: "Shift vídeo",
  shift_audio: "Shift audio",
  activar: "Activar el escalado",
  escala: "Escala",
  modelo_escalador: "Modelo escalador",
  pasos: "Pasos de refinado",
  sampler: "Sampler",
  semilla: "Semilla",
  latente: "latent",
  positivo: "positive",
  interpolar: "Interpolar",
  modelo_interpolacion: "Modelo de interpolación",
  fps_base: "FPS base",
  tamano_referencia: "Calidad de referencias",
  fotograma_guia: "Fotograma de la guía",
  imagen_guia: "imagen guía",
  referencia_1: "referencia 1",
  referencia_2: "referencia 2",
  referencia_3: "referencia 3",
  scheduler: "Scheduler",
  denoise: "Denoise",
  avanzado: "Ajustes avanzados",
  plano: "Tamaño de plano",
  angulo: "Ángulo",
  movimiento: "Movimiento",
  intensidad: "Intensidad",
  camara: "Cámara a mano (manda sobre las listas)",
  lora: "LoRA 1",
  lora_fuerza: "Fuerza 1",
  lora_2: "LoRA 2", lora_fuerza_2: "Fuerza 2",
  lora_3: "LoRA 3", lora_fuerza_3: "Fuerza 3",
  lora_4: "LoRA 4", lora_fuerza_4: "Fuerza 4",
  modelo: "Modelo",
  ltx_prompt: "Prompt", ltx_audio: "Audio", ltx_negativo: "Negativo",
  wan_modo: "Modalidad", wan_sujeto: "Sujeto", wan_movimiento: "Movimiento",
  wan_escena: "Escena", wan_camara: "Cámara", wan_estilo: "Estética",
  wan_negativo: "Prompt negativo",
  hunyuan_modo: "Modalidad", hunyuan_sujeto: "Sujeto",
  hunyuan_movimiento: "Movimiento", hunyuan_escena: "Escena",
  hunyuan_plano: "Tipo de plano", hunyuan_camara: "Movimiento de cámara",
  hunyuan_luz: "Iluminación", hunyuan_estilo: "Estilo",
  hunyuan_atmosfera: "Atmósfera", hunyuan_negativo: "Prompt negativo",
  cog_modo: "Modalidad", cog_sujeto_escena: "Sujeto y escena",
  cog_accion_temporal: "Acción en el tiempo",
  cog_camara_composicion: "Cámara y composición",
  cog_luz_color: "Luz y color", cog_estilo_atmosfera: "Estilo y atmósfera",
  cog_negativo: "Prompt negativo",
  mochi_sujeto: "Sujeto", mochi_accion: "Acción",
  mochi_entorno: "Entorno", mochi_camara: "Cámara",
  mochi_luz_estilo: "Luz y estilo", mochi_negativo: "Prompt negativo",
  libre_prompt: "Prompt", libre_extra: "Segundo campo",
  libre_separador: "Separador", libre_instruccion: "Tu instrucción para la IA",
  vista_previa: "Vista previa en vivo",
  perfil: "Perfil de modelo",
};

const ESCALAS = [["1.5x", 1.5], ["1.65x", 1.65], ["1.8x", 1.8], ["2x", 2.0], ["2.5x", 2.5]];

/**
 * Perfiles del nodo Cargar modelo.
 *
 * ESTO ES UNA COPIA. La tabla de verdad esta en nodes.py (PERFILES_CARGA) y es
 * la que decide como se carga el modelo. Aqui solo estan las dos cosas que
 * necesita la interfaz: que archivos proponer y con que numeros empezar. Si se
 * toca una tabla, se toca la otra.
 */
const PERFILES_CARGA_UI = {
  "MiniMax H3": {
    resumen: "modo MiniMax  ·  video + audio  ·  troceo de VRAM",
    valores: { trocear_atencion: 16, trocear_ffn: 16, shift_video: 6.0, shift_audio: 3.0 },
    pistas: {
      modelo: ["minimax_h3_ref2va", "ref2va", "minimax_h3", "minimax", "_h3"],
      codificador_texto: ["qwen3vl_32b_minimax", "qwen3vl", "minimax"],
      vae_video: ["h3_video_vae_int8", "h3_video_vae", "minimax_h3_video"],
      vae_audio: ["h3_audio_vae", "audio_vae"],
    },
  },
  "LTX-2.5": {
    resumen: "modo LTXV  ·  video + audio  ·  sin troceo",
    valores: { trocear_atencion: 1, trocear_ffn: 1, shift_video: 2.05, shift_audio: 0.95 },
    pistas: {
      modelo: ["ltx-2.5-22b", "ltx-2.5", "ltxv", "ltx"],
      codificador_texto: ["gemma4", "gemma", "t5xxl"],
      vae_video: ["ltx-2.5-video-vae", "video-vae", "ltx"],
      vae_audio: ["ltx-2.5-audio-vae", "audio-vae"],
    },
  },
  "Wan 2.2": {
    resumen: "modo WAN  ·  sin audio  ·  sin troceo",
    valores: { trocear_atencion: 1, trocear_ffn: 1, shift_video: 8.0, shift_audio: 3.0 },
    pistas: {
      modelo: ["wan2_2", "wan2.2", "wan2", "wan_2", "wan"],
      codificador_texto: ["umt5"],
      vae_video: ["wan_2.1_vae", "wan2", "wan"],
      vae_audio: ["wan_2.1_vae", "wan2", "wan"],
    },
  },
  "Hunyuan 1.5": {
    resumen: "modo HunyuanVideo 1.5  ·  sin audio  ·  sin troceo",
    valores: { trocear_atencion: 1, trocear_ffn: 1, shift_video: 7.0, shift_audio: 3.0 },
    pistas: {
      modelo: ["hunyuanvideo1.5", "hunyuanvideo15", "hunyuan"],
      codificador_texto: ["qwen_2.5_vl", "qwen2.5_vl", "qwen_2_5_vl"],
      vae_video: ["hunyuanvideo15_vae", "hunyuan"],
      vae_audio: ["hunyuanvideo15_vae", "hunyuan"],
    },
  },
};

const PERFILES_UI = Object.keys(PERFILES_CARGA_UI).concat(["Personalizado"]);
// Las familias del nodo Modelos. El catalogo de verdad esta en nodes.py;
// aqui solo hacen falta los nombres para dibujar las pestanas.
const MODELOS_CATALOGO = Object.keys(PERFILES_CARGA_UI);
const PERFIL_POR_DEFECTO_UI = "MiniMax H3";
const CAMPOS_ARCHIVO = ["modelo", "codificador_texto", "vae_video", "vae_audio"];

const normalizarRuta = (v) => String(v ?? "").toLowerCase().replace(/\\/g, "/");

/**
 * De quien es este archivo.
 *
 * Los nombres se pisan entre familias: "hunyuan_video_vae" lleva dentro
 * "video_vae", y "umt5_xxl" lleva dentro "t5". Por eso no vale con preguntar
 * "¿encaja?": gana la pista mas larga que aparezca, que siempre es la mas
 * especifica. Devuelve el nombre del perfil, o null si no es de ninguno.
 */
function duenoDelArchivo(campo, valor) {
  const v = normalizarRuta(valor);
  if (!v) return null;
  let dueno = null, largo = 0;
  for (const nombre of Object.keys(PERFILES_CARGA_UI)) {
    for (const p of PERFILES_CARGA_UI[nombre].pistas[campo] || []) {
      if (v.includes(p) && p.length > largo) { dueno = nombre; largo = p.length; }
    }
  }
  return dueno;
}

/** El archivo que ya hay, ¿es de este perfil? */
function archivoYaEncaja(campo, valor, perfil) {
  return duenoDelArchivo(campo, valor) === perfil;
}

/** El mejor archivo de la lista para este perfil, por orden de pista. */
function archivoQueEncaja(campo, opciones, perfil) {
  if (!Array.isArray(opciones) || !opciones.length) return null;
  const pistas = PERFILES_CARGA_UI[perfil]?.pistas[campo] || [];
  // Los .gguf van al final: este nodo carga con load_diffusion_model, que no
  // los abre. Solo se proponen si no hay ninguna otra cosa que encaje.
  opciones = opciones.filter((o) => !normalizarRuta(o).endsWith(".gguf"))
             .concat(opciones.filter((o) => normalizarRuta(o).endsWith(".gguf")));
  // primero los que ademas son suyos de verdad; si no, el que encaje a secas
  for (const pista of pistas) {
    const propio = opciones.find(
      (o) => normalizarRuta(o).includes(pista) && duenoDelArchivo(campo, o) === perfil);
    if (propio) return propio;
  }
  for (const pista of pistas) {
    const hit = opciones.find((o) => normalizarRuta(o).includes(pista));
    if (hit) return hit;
  }
  return null;
}

function findWidget(node, name) {
  return node.widgets?.find((w) => w.name === name);
}

/** Los widgets puramente visuales nunca deben ocupar una posicion guardada. */
function widgetSeGuarda(w) {
  return Boolean(w) && w.serialize !== false && w.options?.serialize !== false;
}

function esCargarModelo(node) {
  return node?.comfyClass === "CineCargarH3" || node?.type === "CineCargarH3";
}

function loraVacia(valor) {
  const v = String(valor ?? "").trim().toLowerCase();
  return !v || v === "ninguno" || v === "none";
}

/**
 * LiteGraph guarda usando el indice completo del widget, pero al restaurar
 * consume los valores seguidos y salta los widgets con serialize:false. Si un
 * titulo visual esta entre dos controles reales, eso deja un hueco `null` y
 * desplaza todo lo que viene despues. Esta funcion elimina esos huecos usando
 * la lista de widgets como mapa, sin tocar el valor de ningun control real.
 */
function compactarValoresWidgets(node, valores) {
  if (!Array.isArray(valores)) return valores;
  const widgets = node.widgets || [];
  const reales = widgets.filter(widgetSeGuarda);
  if (valores.length <= reales.length) return valores.slice();

  const limpios = [];
  for (let i = 0; i < widgets.length && i < valores.length; i++) {
    if (widgetSeGuarda(widgets[i])) limpios.push(valores[i]);
  }
  return limpios;
}

/** Migra las versiones anteriores del cargador al esquema actual de 4 LoRAs. */
function migrarValoresCargarModelo(node, valores) {
  if (!Array.isArray(valores)) return valores;
  const reales = (node.widgets || []).filter(widgetSeGuarda);
  let v = compactarValoresWidgets(node, valores);

  // Version de una sola LoRA guardada despues de insertar el titulo visual:
  // el hueco puede existir aunque la lista sea mas corta que el esquema actual.
  if (v.length > 8 && v[8] == null && typeof v[9] === "string") {
    v = v.slice(0, 8).concat(v.slice(9));
  }

  // Version original: los ocho campos del modelo y Vista previa, sin LoRAs.
  if (v.length === 9 && typeof v[8] === "boolean") {
    v = v.slice(0, 8).concat([
      "ninguno", 0, v[8],
      "ninguno", 0,
      "ninguno", 0,
      "ninguno", 0,
    ]);
  } else if (v.length >= 8 && v.length < 17 && reales.length >= 17) {
    // Version intermedia con una sola LoRA. Completa las tres ranuras nuevas.
    const base = [
      undefined, undefined, undefined, undefined,
      16, 16, 6.0, 3.0,
      "ninguno", 0, true,
      "ninguno", 0,
      "ninguno", 0,
      "ninguno", 0,
    ];
    for (let i = 0; i < v.length; i++) base[i] = v[i];
    v = base;
  }
  return v;
}

/**
 * Restaura valores por nombre cuando el frontend nuevo los proporciona y usa
 * la migracion posicional como respaldo para workflows antiguos.
 */
function repararValoresGuardados(node, info) {
  if (!info || typeof info !== "object") return;
  const reales = (node.widgets || []).filter(widgetSeGuarda);
  let pos = Array.isArray(info.widgets_values) ? info.widgets_values.slice() : null;
  if (pos) {
    pos = esCargarModelo(node)
      ? migrarValoresCargarModelo(node, pos)
      : compactarValoresWidgets(node, pos);
  }
  const porNombre = info.widgets_values_named;
  const tieneNombres = porNombre && typeof porNombre === "object" && !Array.isArray(porNombre);

  reales.forEach((w, i) => {
    let valor;
    let existe = false;
    if (tieneNombres && Object.prototype.hasOwnProperty.call(porNombre, w.name)) {
      valor = porNombre[w.name];
      existe = true;
    } else if (pos && i < pos.length) {
      valor = pos[i];
      existe = true;
    }
    if (existe) w.value = valor;
  });
}

/** Sin LoRA, la fuerza asociada siempre es exactamente cero. */
function normalizarLoras(node) {
  if (!esCargarModelo(node)) return;
  for (let i = 1; i <= 4; i++) {
    const sufijo = i === 1 ? "" : "_" + i;
    const nombre = findWidget(node, "lora" + sufijo);
    const fuerza = findWidget(node, "lora_fuerza" + sufijo);
    if (!fuerza) continue;
    if (loraVacia(nombre?.value)) {
      fuerza.value = 0;
    } else if (!Number.isFinite(Number(fuerza.value))) {
      fuerza.value = 0.75;
    }
  }
}

function sincronizarValoresGuardados(node, info) {
  if (!info || typeof info !== "object") return;
  const reales = (node.widgets || []).filter(widgetSeGuarda);
  info.widgets_values = reales.map((w) => w.value);
  const porNombre = info.widgets_values_named;
  if (porNombre && typeof porNombre === "object" && !Array.isArray(porNombre)) {
    for (const w of reales) porNombre[w.name] = w.value;
  }
}

function sanear(node) {
  // valores que pudieron quedar del formato antiguo al reutilizar un nodo
  const mult = findWidget(node, "multiplo_de");
  if (mult && (Number(mult.value) > 128 || Number(mult.value) < 8)) mult.value = 32;
  for (const w of node.widgets || []) {
    const ops = w.options?.values;
    const vacio = w.value === undefined || w.value === null;
    if (Array.isArray(ops) && ops.length && (vacio || !ops.includes(w.value))) w.value = ops[0];

    // Un workflow guardado antes de que existieran estos widgets trae menos
    // valores de los que hay ahora, y los que sobran llegan sin nada: en un
    // numero eso se ve como NaN. Se repone el valor por defecto.
    if (w.type === "number" || typeof w.__valorNumerico === "boolean") {
      const v = Number(w.value);
      if (w.value === undefined || w.value === null || !Number.isFinite(v)) {
        const o = w.options || {};
        w.value = o.default !== undefined ? o.default
                : o.min !== undefined ? o.min : 0;
      }
    }
  }
}

/**
 * Recalcula el alto del nodo sin tocarle el ancho.
 *
 * computeSize() devuelve tambien un ancho, casi siempre mas estrecho, y
 * asignarlo entero encogia el nodo cada vez que se escondia un widget o se
 * cambiaba de pestana. Aqui el ancho solo puede crecer, nunca menguar por
 * debajo de lo que pida el titulo.
 */
function reajustar(node, anchoMin) {
  const antes = node.size ? node.size[0] : 0;
  const nuevo = node.computeSize();
  let ancho = Math.max(antes, anchoMin || node.__anchoMin || 0);
  try { ancho = Math.max(ancho, anchoPorTitulo(node)); } catch (e) { /* al crear aun no hay logo */ }
  node.size = [ancho, nuevo[1]];
  node.setDirtyCanvas(true, true);
}

/** Oculta o muestra un widget sin borrarlo: el valor se conserva. */
function verWidget(w, visible) {
  if (!w) return;

  // Las cajas de texto multilinea NO son lienzo: son un <textarea> de verdad
  // colocado encima del nodo. Cambiarles el tipo no las esconde, siguen
  // flotando ahi. Hay que apagar tambien el elemento del DOM, y hay que
  // hacerlo SIEMPRE, no solo al cambiar de estado: el elemento se crea tarde
  // y puede aparecer despues de haber escondido el widget.
  const el = w.inputEl || w.element || w.domElement || null;
  if (el && el.style) {
    if (visible) {
      el.style.display = w.__display !== undefined ? w.__display : "";
      delete w.__display;
    } else {
      if (w.__display === undefined) w.__display = el.style.display;
      el.style.display = "none";
    }
  }
  // Esconder de verdad hace falta en TRES sitios, porque el frontend dibuja
  // cada clase de widget por un camino distinto:
  //   - el tipo, para los que dibuja el propio ComfyUI (listas, numeros)
  //   - el metodo draw, para los nuestros (titulos, chips, botones)
  //   - la marca hidden, que es la que respeta el frontend nuevo
  // Tocar solo uno deja widgets fantasma pisandose, que es lo que pasaba.
  //
  // Y el efecto secundario de "hidden" es que el widget puede no viajar en
  // el prompt. Eso NO se arregla aqui: se arregla declarando en Python como
  // opcional todo lo que la interfaz pueda esconder, para que al servidor no
  // le falte nada obligatorio. Ver el comentario en INPUT_TYPES.
  w.hidden = !visible;

  if (visible) {
    if (w.__tipo !== undefined) {
      w.type = w.__tipo;
      w.computeSize = w.__computeSize;
      if (w.__draw !== undefined) { w.draw = w.__draw; delete w.__draw; }
      delete w.__tipo;
      delete w.__computeSize;
    }
  } else if (w.__tipo === undefined) {
    w.__tipo = w.type;
    w.__computeSize = w.computeSize;
    w.__draw = w.draw;
    w.type = "cineconia_oculto";
    // alto 0 y no -4: con muchos escondidos los -4 se acumulaban y el nodo
    // se quedaba corto, con los de abajo montandose unos sobre otros
    w.computeSize = () => [0, 0];
    w.draw = () => {};
  }
}

/** Ata un interruptor a la visibilidad de otros widgets. */
function atarAvanzado(node, interruptor, nombres) {
  const sw = findWidget(node, interruptor);
  if (!sw) return;
  const aplicar = () => {
    const on = !!sw.value;
    for (const n of nombres) verWidget(findWidget(node, n), on);
    reajustar(node);
  };
  const antes = sw.callback;
  sw.callback = function () {
    const r = antes?.apply(this, arguments);
    aplicar();
    return r;
  };
  // al cargar un workflow guardado el valor llega despues, en onConfigure
  const conf = node.onConfigure;
  node.onConfigure = function () {
    const r = conf?.apply(this, arguments);
    setTimeout(aplicar, 0);
    return r;
  };
  aplicar();
}

/**
 * Titulos viejos que quedaron guardados dentro de los workflows.
 *
 * ComfyUI guarda el titulo de cada nodo en el JSON, asi que cambiar el nombre
 * del nodo solo afecta a los que arrastras nuevos: los que ya estan puestos
 * conservan el suyo. Aqui se traducen los antiguos, y solo esos: si el
 * usuario le puso un nombre propio a un nodo, no se le toca.
 */
const TITULOS_VIEJOS = {
  "Cine con IA · Cargar H3": "Cine con IA · Cargar modelo",
  "Cine con IA · Cargar modelo (H3)": "Cine con IA · Cargar modelo",
  "Cine con IA · Escena H3": "Cine con IA · Escena",
  "Cine con IA · Escena (H3)": "Cine con IA · Escena",
  "Cine con IA · Render H3": "Cine con IA · Render",
  "Cine con IA · Prompt 6 Secciones (H3)": "Cine con IA · Prompt",
  "Cine con IA · Prompt (MiniMax H3)": "Cine con IA · Prompt",
  "Cine con IA · Prompt (LTX-2.5)": "Cine con IA · Prompt",
  "Cine con IA · Prompt (Libre)": "Cine con IA · Prompt",
};

function migrarTitulo(node) {
  const nuevo = TITULOS_VIEJOS[node.title];
  if (nuevo) node.title = nuevo;
}

function etiquetar(node) {
  for (const w of node.widgets || []) {
    if (ETIQUETAS[w.name]) w.label = ETIQUETAS[w.name];
  }
}

function snap(v, m) {
  if (m < 1) m = 1;
  return Math.max(m, Math.round(v / m) * m);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Fila de chips pulsables que escriben en un widget existente.
 * items: [[etiqueta, valor], ...] o funcion(node) -> ese array
 */
function addChips(node, targetName, items, titulo = null, activa = null, usado = null) {
  const chipH = 22;
  const gap = 5;
  const pad = 10;
  const cab = titulo ? 17 : 0; // alto de la cabecera con la linea separadora
  const state = { rects: [], rows: 1 };
  const listar = typeof items === "function" ? items : () => items;

  const mismo = (a, b) => {
    const na = Number(a), nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== "" && b !== "") {
      return Math.abs(na - nb) < 1e-6;
    }
    return String(a) === String(b);
  };

  const w = {
    type: "cineconia_chips",
    name: "__chips_" + targetName + "_" + Math.random().toString(36).slice(2, 7),
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) {
      return [width, cab + state.rows * (chipH + gap) + gap];
    },
    draw(ctx, n, width, y) {
      const target = findWidget(n, targetName);
      if (!target) return;
      ctx.save();
      ctx.textBaseline = "middle";

      if (titulo) {
        const ty = y + 8;
        ctx.font = "9px 'IBM Plex Mono', Consolas, monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = "#6f7d7e";
        const etq = titulo.toUpperCase();
        ctx.fillText(etq, pad, ty);
        const tw = ctx.measureText(etq).width;
        ctx.strokeStyle = "#394446";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad + tw + 8, ty + 0.5);
        ctx.lineTo(width - pad, ty + 0.5);
        ctx.stroke();
      }

      const viva = activa ? !!activa(n) : true;
      ctx.globalAlpha = viva ? 1 : 0.35;
      ctx.font = "11px 'IBM Plex Mono', Consolas, monospace";
      state.rects = [];
      let x = pad, row = 0;
      const maxX = width - pad;
      y = y + cab;

      for (const [label, value] of listar(n)) {
        const tw = Math.ceil(ctx.measureText(String(label)).width) + 16;
        if (x + tw > maxX && x > pad) { x = pad; row++; }
        const cy = y + gap + row * (chipH + gap);
        const on = mismo(target.value, value);
        // tres estados con el mismo color, como las pestanas:
        //   elegido ahora  -> naranja entero
        //   ya usado antes -> naranja atenuado
        //   sin usar       -> gris
        const ya = usado ? !!usado(n, value) : false;
        const alfa = ctx.globalAlpha;

        ctx.globalAlpha = alfa * (!on && ya ? 0.3 : 1);
        ctx.fillStyle = on || ya ? ACCENT : CHIP_BG;
        roundRect(ctx, x, cy, tw, chipH, 4);
        ctx.fill();
        // elegido Y ya rodado: un punto para que no se confunda con uno nuevo
        if (on && ya) {
          ctx.globalAlpha = alfa * 0.55;
          ctx.fillStyle = CHIP_ON_FG;
          ctx.beginPath();
          ctx.arc(x + tw - 5, cy + 5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = alfa * (!on && ya ? 0.75 : 1);
        ctx.fillStyle = on || ya ? CHIP_ON_FG : CHIP_FG;
        ctx.textAlign = "center";
        ctx.fillText(String(label), x + tw / 2, cy + chipH / 2 + 0.5);
        ctx.globalAlpha = alfa;

        state.rects.push({ x, y: cy, w: tw, h: chipH, value });
        x += tw + gap;
      }
      state.rows = Math.max(1, row + 1);
      ctx.restore();
    },
    mouse(event, pos, n) {
      if (event.type !== "pointerdown" && event.type !== "mousedown") return false;
      for (const r of state.rects) {
        if (pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.y && pos[1] <= r.y + r.h) {
          const target = findWidget(n, targetName);
          if (target) {
            target.value = r.value;
            target.callback?.(target.value);
            n.setDirtyCanvas(true, true);
          }
          return true;
        }
      }
      return false;
    },
  };
  node.widgets.push(w);
  return w;
}

/**
 * Titulo de apartado, con su linea y una explicacion pequena debajo.
 * Se inserta JUSTO ENCIMA del widget que se le diga, para que cada caja de
 * texto lleve escrito lo que hace.
 */
function addTitulo(node, antesDe, texto, sub) {
  const alto = sub ? 32 : 19;
  const w = {
    type: "cineconia_titulo",
    name: "__t_" + antesDe,
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) { return [width, alto]; },
    draw(ctx, n, width, y) {
      ctx.save();
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.font = "9px 'IBM Plex Mono', Consolas, monospace";
      ctx.fillStyle = ACCENT;
      const etq = String(texto).toUpperCase();
      ctx.fillText(etq, 10, y + 10);
      const tw = ctx.measureText(etq).width;
      ctx.strokeStyle = "#394446";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10 + tw + 8, y + 10.5);
      ctx.lineTo(width - 10, y + 10.5);
      ctx.stroke();
      if (sub) {
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillStyle = "#77878a";
        let t = sub;
        // recorta si no cabe, en vez de desbordar por la derecha
        const max = width - 20;
        if (ctx.measureText(t).width > max) {
          while (t.length > 4 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
          t += "…";
        }
        ctx.fillText(t, 10, y + 25);
      }
      ctx.restore();
    },
  };
  const i = (node.widgets || []).findIndex((x) => x.name === antesDe);
  if (i < 0) node.widgets.push(w); else node.widgets.splice(i, 0, w);
  return w;
}

/**
 * Fila de pestanas. No cambia de color: la activa va encendida y las otras
 * se quedan atenuadas, que es la misma idea que los chips y no mete un tono
 * nuevo en el nodo.
 */
function addPestanas(node, targetName, items) {
  const alto = 26, gap = 6, pad = 10;
  const filasPara = (width) => width < 760 && items.length > 5 ? 2 : 1;
  const state = { rects: [] };
  const w = {
    type: "cineconia_pestanas",
    name: "__pest_" + targetName,
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) {
      const filas = filasPara(width);
      return [width, filas * (alto + gap) + 12];
    },
    draw(ctx, n, width, y) {
      const t = findWidget(n, targetName);
      if (!t) return;
      ctx.save();
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      state.rects = [];

      const filas = filasPara(width);
      const porFila = filas === 1 ? items.length : Math.ceil(items.length / filas);
      for (let fila = 0; fila < filas; fila++) {
        const desde = fila * porFila;
        const deFila = items.slice(desde, desde + porFila);
        if (!deFila.length) continue;
        const libre = width - pad * 2 - gap * (deFila.length - 1);
        const ancho = Math.max(40, Math.floor(libre / deFila.length));
        let x = pad;
        const fy = y + 4 + fila * (alto + gap);
        for (const it of deFila) {
          const activa = String(t.value) === String(it);
          ctx.globalAlpha = activa ? 1 : 0.26;
          ctx.fillStyle = ACCENT;
          roundRect(ctx, x, fy, ancho, alto, 6);
          ctx.fill();
          ctx.fillStyle = CHIP_ON_FG;
          ctx.fillText(String(it), x + ancho / 2, fy + alto / 2 + 0.5);
          state.rects.push({ x, y: fy, w: ancho, h: alto, value: it });
          x += ancho + gap;
        }
      }

      // la raya que cierra la fila y abre el cuerpo de la pestana
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#394446";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const rayaY = y + filas * (alto + gap) + 6.5;
      ctx.moveTo(pad, rayaY);
      ctx.lineTo(width - pad, rayaY);
      ctx.stroke();
      ctx.restore();
    },
    mouse(event, pos, n) {
      if (event.type !== "pointerdown" && event.type !== "mousedown") return false;
      for (const r of state.rects) {
        if (pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.y && pos[1] <= r.y + r.h) {
          const t = findWidget(n, targetName);
          if (t && String(t.value) !== String(r.value)) {
            t.value = r.value;
            t.callback?.(t.value);
          }
          return true;
        }
      }
      return false;
    },
  };
  node.widgets.push(w);
  return w;
}

/** Marca a que pestana pertenece un widget. "siempre" = se ve en todas. */
function grupo(w, nombre) {
  if (w) w.__grupo = nombre;
  return w;
}

function grupoPorNombre(node, nombres, nombreGrupo) {
  for (const n of nombres) grupo(findWidget(node, n), nombreGrupo);
}

/**
 * Ensena solo los widgets de la pestana viva. Nada se borra: el texto de
 * MiniMax sigue ahi cuando te vas a LTX y vuelves.
 */
function atarPestanas(node, selector, mapa, titulos) {
  const sel = findWidget(node, selector);
  if (!sel) return;
  const aplicar = () => {
    const vivos = mapa[String(sel.value)] || mapa[Object.keys(mapa)[0]];
    for (const w of node.widgets || []) {
      const g = w.__grupo;
      if (!g) continue;
      verWidget(w, g === "siempre" || vivos.includes(g));
    }
    if (titulos && titulos[String(sel.value)]) node.title = titulos[String(sel.value)];
    reajustar(node);
  };
  const antes = sel.callback;
  sel.callback = function () {
    const r = antes?.apply(this, arguments);
    aplicar();
    return r;
  };
  const conf = node.onConfigure;
  node.onConfigure = function () {
    const r = conf?.apply(this, arguments);
    setTimeout(aplicar, 0);
    return r;
  };
  aplicar();
  return aplicar;
}

// --- progreso en vivo ----------------------------------------------------
//
// ComfyUI avisa por websocket de cada paso del sampler. Como nuestros nodos
// llaman al sampler por dentro, esos avisos llegan con el id de NUESTRO nodo,
// asi que se pueden pintar en el propio nodo en vez de ir a leer el s/it a la
// ventana negra.

const PROGRESO = {};          // id de nodo -> estado de su ultima ejecucion
let RELOJ = null;             // repintado mientras algo corre

function estadoProgreso(id) {
  if (!PROGRESO[id]) PROGRESO[id] = {
    hecho: 0, total: 0, pasos: [], muestras: [], ultimo: 0,
    t: 0, ini: 0, vivo: false, fin: 0,
  };
  return PROGRESO[id];
}

function repintarVivos() {
  const nodos = app.graph?._nodes || app.graph?.nodes || [];
  for (const n of nodos) if (PROGRESO[n.id]?.vivo) n.setDirtyCanvas(true, true);
}

api.addEventListener("progress", (e) => {
  const d = e.detail || {};
  const id = d.node;
  if (id === undefined || id === null) return;
  const s = estadoProgreso(id);
  const ahora = performance.now();

  // Un valor que retrocede, un total distinto o un nodo que ya termino
  // significan que empezo otra pasada. Un valor repetido NO reinicia: hay
  // extensiones que notifican dos veces el mismo paso.
  const totalNuevo = Number(d.max || s.total || 0);
  const reinicia = !s.vivo || Number(d.value) < s.hecho ||
                   (s.total && totalNuevo && totalNuevo !== s.total);
  if (reinicia) {
    s.pasos = [];
    s.muestras = [];
    s.ultimo = 0;
    s.ini = ahora;
    s.vivo = true;
    s.fin = 0;
    s.t = 0;
  } else if (Number(d.value) > s.hecho && s.t) {
    const duracion = ahora - s.t;
    s.pasos.push(duracion);
    s.ultimo = duracion;
  }
  s.t = ahora;
  s.hecho = Number(d.value || 0);
  s.total = totalNuevo;
  s.muestras.push({ paso: s.hecho, ms: ahora - s.ini });

  if (!RELOJ) RELOJ = setInterval(repintarVivos, 1000);
  const nodo = (app.graph?._nodes || []).find((n) => n.id === id);
  if (nodo) nodo.setDirtyCanvas(true, true);
});

function cerrarNodo(id) {
  const s = PROGRESO[id];
  if (!s || !s.vivo) return;
  s.vivo = false;
  s.fin = performance.now() - s.ini;
  const nodo = (app.graph?._nodes || []).find((n) => n.id === id);
  if (nodo) nodo.setDirtyCanvas(true, true);
}

api.addEventListener("executing", (e) => {
  // llega el id del nodo que empieza: el anterior ya termino
  const id = e.detail;
  for (const k of Object.keys(PROGRESO)) {
    if (String(k) !== String(id)) cerrarNodo(k);
  }
  if (id === null || id === undefined) {
    if (RELOJ) { clearInterval(RELOJ); RELOJ = null; }
  }
});

for (const ev of ["execution_success", "execution_error", "execution_interrupted"]) {
  api.addEventListener(ev, () => {
    for (const k of Object.keys(PROGRESO)) cerrarNodo(k);
    if (RELOJ) { clearInterval(RELOJ); RELOJ = null; }
  });
}

function reloj(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "--:--";
  const t = Math.round(ms / 1000);
  return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
}

/**
 * Panel estadistico real: curva de tiempo por paso + resumen/ETA.
 *
 * `obtenerTotal` permite dibujar el panel antes de la primera ejecucion. El
 * evento de progreso sigue siendo la fuente de los datos reales; el valor del
 * widget solo sirve para mostrar desde el inicio "paso 0/N" en vez de ocultar
 * las tarjetas.
 */
function addProgreso(node, titulo, obtenerTotal = null) {
  const alto = 78, pad = 10, cab = 17, gap = 8;
  const w = {
    type: "cineconia_estadisticas",
    name: "__prog",
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) { return [width, cab + alto + 18]; },
    draw(ctx, n, width, y) {
      const previo = PROGRESO[n.id] || {};
      const configurado = typeof obtenerTotal === "function"
        ? Number(obtenerTotal(n) || 0) : 0;
      const s = {
        hecho: Number(previo.hecho || 0),
        total: Number(previo.total || configurado || 0),
        pasos: Array.isArray(previo.pasos) ? previo.pasos : [],
        muestras: Array.isArray(previo.muestras) ? previo.muestras : [],
        ultimo: Number(previo.ultimo || 0),
        t: Number(previo.t || 0),
        ini: Number(previo.ini || 0),
        vivo: Boolean(previo.vivo),
        fin: Number(previo.fin || 0),
      };
      ctx.save();
      ctx.textBaseline = "middle";

      // cabecera
      ctx.font = "9px 'IBM Plex Mono', Consolas, monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "#6f7d7e";
      const etq = String(titulo || "progreso").toUpperCase();
      ctx.fillText(etq, pad, y + 7);
      const tw = ctx.measureText(etq).width;
      ctx.strokeStyle = "#394446";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad + tw + 8, y + 7.5);
      ctx.lineTo(width - pad, y + 7.5);
      ctx.stroke();

      const total = Math.max(0, s.total);
      const base = y + cab;

      const disponible = width - pad * 2;
      const izq = Math.max(150, Math.floor(disponible * 0.58));
      const der = disponible - izq - gap;
      const x1 = pad, x2 = pad + izq + gap;

      // dos tarjetas, como un pequeno monitor de rendimiento
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#20282a";
      ctx.strokeStyle = "#394446";
      ctx.lineWidth = 1;
      roundRect(ctx, x1, base, izq, alto, 6); ctx.fill(); ctx.stroke();
      roundRect(ctx, x2, base, der, alto, 6); ctx.fill(); ctx.stroke();

      // grafico real de duracion por paso (el primero no se puede medir con
      // precision porque ComfyUI notifica cuando ya termino).
      ctx.font = "8px 'IBM Plex Mono', Consolas, monospace";
      ctx.fillStyle = "#6f7d7e";
      ctx.fillText("TIEMPO POR PASO", x1 + 8, base + 10);
      const gx = x1 + 8, gy = base + 17, gw = izq - 16, gh = alto - 33;
      ctx.strokeStyle = "#303a3c";
      ctx.beginPath();
      ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh);
      ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh);
      ctx.stroke();

      const datos = (s.pasos || []).slice(-Math.max(2, total));
      const lento = Math.max(1, ...datos);
      if (datos.length) {
        ctx.beginPath();
        datos.forEach((ms, i) => {
          const px = gx + (datos.length === 1 ? gw : (i / (datos.length - 1)) * gw);
          const py = gy + gh - (ms / lento) * (gh - 3);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 1.7;
        ctx.stroke();
        ctx.lineTo(gx + gw, gy + gh);
        ctx.lineTo(gx, gy + gh);
        ctx.closePath();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = ACCENT;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "#566164";
        ctx.beginPath(); ctx.moveTo(gx, gy + gh / 2); ctx.lineTo(gx + gw, gy + gh / 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.font = "8px 'IBM Plex Mono', Consolas, monospace";
      ctx.fillStyle = "#6f7d7e";
      ctx.fillText(datos.length ? `máx ${(lento / 1000).toFixed(1)} s  ·  ${datos.length} medidas`
                                : "máx 0.0 s  ·  0 medidas", gx, base + alto - 7);

      // resumen numerico. Solo calcula con tiempos observados, nunca inventa
      // sigma ni datos internos que ComfyUI no haya enviado.
      const medio = s.pasos.length
        ? s.pasos.reduce((a, b) => a + b, 0) / s.pasos.length : 0;
      const porcentaje = total ? Math.max(0, Math.min(100, Math.round(100 * s.hecho / total))) : 0;
      const va = s.vivo ? performance.now() - s.ini : s.fin;
      const faltan = s.vivo && medio ? medio * Math.max(0, total - s.hecho) : 0;
      ctx.fillStyle = s.vivo ? ACCENT : INFO_FG;
      ctx.font = "700 20px 'IBM Plex Mono', Consolas, monospace";
      ctx.fillText(`${porcentaje}%`, x2 + 8, base + 20);
      ctx.font = "9px 'IBM Plex Mono', Consolas, monospace";
      ctx.fillStyle = "#9fb0b0";
      ctx.fillText(`paso ${s.hecho}/${total}`, x2 + 8, base + 34);
      ctx.fillText(`último ${s.ultimo ? (s.ultimo / 1000).toFixed(1) : "0.0"} s`, x2 + 8, base + 47);
      ctx.fillText(`media  ${medio ? (medio / 1000).toFixed(1) : "0.0"} s`, x2 + 8, base + 59);
      ctx.fillStyle = s.vivo ? INFO_FG : "#6f7d7e";
      ctx.fillText(s.vivo ? (faltan ? `ETA ${reloj(faltan)}` : `tiempo ${reloj(va)}`)
                           : (s.fin || s.hecho ? `total ${reloj(va)}` : "ETA pendiente"),
                   x2 + 8, base + 71);

      // linea final accesible al ampliar el nodo: conserva los mismos datos
      // en texto sin depender de interpretar el grafico.
      let txt;
      if (!s.vivo && !s.fin && !s.hecho && !s.pasos.length) {
        txt = `paso 0/${total}   0.0 s/paso   00:00 transcurrido   ETA pendiente`;
      } else if (s.vivo) {
        txt = `paso ${s.hecho}/${total}   ${(medio / 1000).toFixed(1)} s/paso   ` +
              `${reloj(va)} transcurrido` + (faltan ? `   faltan ~${reloj(faltan)}` : "");
      } else {
        txt = `último: ${total} pasos   ${(medio / 1000).toFixed(1)} s/paso   ` +
              `${reloj(s.fin)} en total`;
      }
      let t = txt;
      const max = width - pad * 2;
      if (ctx.measureText(t).width > max) {
        while (t.length > 2 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
        t += "…";
      }
      ctx.font = "9px 'IBM Plex Mono', Consolas, monospace";
      ctx.fillStyle = "#6f7d7e";
      ctx.fillText(t, pad, base + alto + 10);
      ctx.restore();
    },
  };
  node.widgets.push(w);
  return w;
}

/** Bloque de texto informativo, calculado en vivo. */
function addInfo(node, fn) {
  const w = {
    type: "cineconia_info",
    name: "__info",
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) {
      return [width, 53];
    },
    draw(ctx, n, width, y) {
      let lines = [];
      try { lines = fn(n) || []; } catch (e) { lines = []; }
      ctx.save();
      ctx.font = "11px 'IBM Plex Mono', Consolas, monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillStyle = INFO_FG;
      const max = width - 24;
      lines.slice(0, 3).forEach((t, i) => {
        let s = String(t ?? "");
        if (ctx.measureText(s).width > max) {
          while (s.length > 2 && ctx.measureText(s + "…").width > max) s = s.slice(0, -1);
          s += "…";
        }
        ctx.fillText(s, 12, y + 11 + i * 15);
      });
      ctx.restore();
    },
  };
  node.widgets.push(w);
  return w;
}

// --- marca: logo en el nodo ---------------------------------------------
const LOGO = new Image();
let LOGO_OK = false;
LOGO.onload = () => { LOGO_OK = true; app.graph?.setDirtyCanvas(true, true); };
LOGO.src = new URL("./logo.png", import.meta.url).href;

const LOGO_H_CUERPO = 38;   // hay hueco libre a la izquierda: logo grande
const LOGO_H_TITULO = 20;   // no hay hueco: logo chico colgado del titulo
const LOGO_X = 11;          // margen izquierdo dentro del cuerpo

/**
 * Entradas de verdad: las que se conectan con un cable.
 * En el frontend nuevo cada widget aparece tambien en node.inputs, con la
 * propiedad `widget` puesta; esas no ocupan sitio a la izquierda del cuerpo.
 */
function entradasReales(node) {
  return (node.inputs || []).filter((i) => !i.widget).length;
}

const LOGO_RATIO = 213 / 132;

/**
 * Ancho minimo para que el titulo no se tope con el logo cuando este va
 * colgado del titulo. Devuelve 0 si el logo no va ahi.
 */
const MEDIDOR = (() => {
  try { return document.createElement("canvas").getContext("2d"); }
  catch (e) { return null; }
})();

function anchoPorTitulo(node) {
  if (!MEDIDOR || entradasReales(node) === 0) return 0;
  MEDIDOR.font = "bold 14px Arial";
  const texto = MEDIDOR.measureText(String(node.title || "")).width;
  const logo = (LOGO_OK ? LOGO.width / LOGO.height : LOGO_RATIO) * LOGO_H_TITULO;
  // 24 = sangria del titulo   14 = aire entre titulo y logo   10 = margen derecho
  return Math.ceil(24 + texto + 14 + logo + 10);
}

// Regla: si entran cables por la izquierda, el cuerpo no tiene hueco libre y
// el logo va chico arriba. Si no entra nada, va grande dentro del cuerpo.
function marcarNodo(nodeType) {
  const onDraw = nodeType.prototype.onDrawForeground;
  nodeType.prototype.onDrawForeground = function (ctx) {
    const r = onDraw?.apply(this, arguments);
    if (this.flags?.collapsed || !LOGO_OK) return r;
    try {
      const arriba = entradasReales(this) > 0;
      const H = arriba ? LOGO_H_TITULO : LOGO_H_CUERPO;
      const W = (LOGO.width / LOGO.height) * H;
      const x = arriba ? this.size[0] - W - 10 : LOGO_X;
      const y = arriba ? -H - 5 : 8;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(LOGO, x, y, W, H);
      ctx.restore();
    } catch (e) { /* el nodo sigue funcionando igual */ }
    return r;
  };
}

// --- helper para engancharse a onNodeCreated -----------------------------
function alCrear(nodeType, fn, anchoMin = 0) {
  // Nunca vuelve a guardar huecos de widgets visuales. Esto protege no solo
  // las LoRAs: tambien los titulos insertados entre campos del nodo Prompt.
  if (!nodeType.__cineSerializacionSegura) {
    nodeType.__cineSerializacionSegura = true;
    const serializar = nodeType.prototype.serialize;
    nodeType.prototype.serialize = function () {
      if (esCargarModelo(this)) normalizarLoras(this);
      const info = serializar?.apply(this, arguments);
      if (info && Array.isArray(info.widgets_values)) {
        info.widgets_values = compactarValoresWidgets(this, info.widgets_values);
      }
      if (info?.widgets_values_named && esCargarModelo(this)) {
        for (let i = 1; i <= 4; i++) {
          const sufijo = i === 1 ? "" : "_" + i;
          const n = findWidget(this, "lora" + sufijo);
          const f = findWidget(this, "lora_fuerza" + sufijo);
          if (n) info.widgets_values_named[n.name] = n.value;
          if (f) info.widgets_values_named[f.name] = f.value;
        }
      }
      return info;
    };
  }

  // tras cargar un workflow guardado los valores llegan en onConfigure,
  // despues de onNodeCreated: hay que sanear otra vez ahi
  const onConf = nodeType.prototype.onConfigure;
  nodeType.prototype.onConfigure = function (info) {
    const r = onConf?.apply(this, arguments);
    try {
      repararValoresGuardados(this, info);
      sanear(this);
      normalizarLoras(this);
      sincronizarValoresGuardados(this, info);
      migrarTitulo(this);
      this.__anchoMin = anchoMin;
      const min = Math.max(anchoMin, anchoPorTitulo(this));
      if (this.size[0] < min) this.size[0] = min;
      this.setDirtyCanvas(true, true);
    } catch (e) { console.error("[CineConIA]", e); }
    return r;
  };

  const onCreated = nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated = function () {
    const r = onCreated?.apply(this, arguments);
    try {
      sanear(this);
      migrarTitulo(this);
      this.__anchoMin = anchoMin;
      fn.call(this);
      reajustar(this, anchoMin);
    }
    catch (e) { console.error("[CineConIA]", e); }
    return r;
  };
}


// Receta que el usuario le da a su IA para que devuelva el formato correcto.
// Va dentro del pack para no depender del formato de un GPT ajeno.
const INSTRUCCION_H3 = `Vas a escribir prompts para el modelo de video MiniMax H3, en modo referencia completa (ref2va: imagenes de referencia + texto). Yo te describo la escena en lenguaje normal y tu me devuelves el prompt ya formateado.

Estas reglas salen de las dos guias oficiales de MiniMax, las que vienen en la carpeta docs del repositorio del modelo. No te las inventes ni las mejores: el modelo fue entrenado con este formato exacto.

Devuelve SIEMPRE, y solo, este bloque, sin comentarios antes ni despues, sin markdown, sin negritas, sin numerar:

subject_definitions:
summary:
retention_analysis:
detailed_description:
camera:
overall_soundscape:
non_diegetic_music:

Todo en ingles, menos el dialogo y el texto que se vea escrito dentro de la escena, que van en su idioma original.

=== 1. subject_definitions ===

Aqui defines cada cosa referenciada que luego haya que seguir por separado. Una linea por etiqueta. Hay cuatro tipos y cada uno significa una cosa distinta:

<Subject N> = contenido visible reutilizable: personas, animales, objetos, escenarios, ropa, props, estilos, acciones.
<Picture N> = una imagen que sirve de fotograma concreto: primer fotograma, fotograma clave, ultimo fotograma, o ancla de composicion.
<Video N> = un video de origen del que se edita, se continua, o del que se toma la estructura temporal.
<Audio N> = una pista de audio que se copia o se referencia.

REGLA IMPORTANTE que casi todo el mundo se salta: si una imagen solo sirve para definir un personaje, un escenario, una ropa o un estilo, NO le crees una entrada <Picture N> propia. Cita esa imagen dentro de la definicion del <Subject N> que corresponda. Solo lleva entrada propia la imagen que sea de verdad un fotograma del video.

Ejemplos correctos:
<Subject 1> is the seated man whose appearance comes from <Picture 1> and whose facial identity comes from the second reference photograph: dark wavy hair greying at the temples, a full dark beard, a brown wool overcoat.
<Picture 1> is the first frame of [Shot 1].

Una vez que le pones etiqueta a algo, esa etiqueta significa lo mismo en todas las secciones.

=== 2. summary ===

Un parrafo corto. Empieza por el prefijo de tipo de tarea entre corchetes. Los tipos son exactamente estos:

keyframe completion  = una imagen es el primer fotograma, un fotograma clave o el ultimo
reference generation = una imagen, video o audio guia la generacion sin ser un fotograma concreto
video editing        = se modifica directamente un video de origen
video continuation   = se continua o se extiende un video de origen
audio reuse          = se reutiliza la misma senal de audio
audio reference      = solo se referencia el timbre, el estilo o el ritmo, sin copiar la senal

Si hay varias relaciones, se combinan con un mas y sin repetir ninguna: [keyframe completion + reference generation]

En el resumen usas las etiquetas ya definidas. No inventes etiquetas nuevas aqui.

=== 3. retention_analysis ===

ESTO NO ES PROSA LIBRE. Tiene un vocabulario fijo. Una linea por etiqueta, con este formato exacto:

<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved - explicacion breve.
<Picture 1> ([Shot 1] first frame): fully_preserved - explicacion breve.

Los marcadores para lo visual son exactamente estos cuatro, en ingles y con guion bajo:
fully_preserved     = se conserva entero el papel definido
partially_preserved = se sigue usando pero cambian o se pierden algunas caracteristicas
attribute_transfer  = las caracteristicas se trasladan a otro sujeto distinto
weak_reference      = solo se mantiene un parecido general de estilo, categoria o ambiente

Y para el audio, estos cuatro:
fully_copy, partially_copy, reference, weak_reference

No escribas (S1) en esta seccion. Y que el personaje haga cosas nuevas en el video no es una perdida de fidelidad: no lo marques como partially_preserved por eso.

=== 4. detailed_description ===

Es el cuerpo. Entre 350 y 500 palabras.

Empieza con UNA O DOS FRASES DE ESTILO, ANTES del marcador [Shot 1]. Ahi va el estilo visual y la luz. Palabras de estilo que el modelo conoce: cinematic, live-action, 2D-animated, 3D CG, claymation, watercolor, vintage film.

Luego [Shot 1], sin marca de tiempo. Si hay mas planos: [Shot N] At MM:SS.mmm, con el tiempo estrictamente creciente y dentro de la duracion. Para los cortes usa: the camera cuts to, the shot cuts to, the shot transitions to.

Un corte tiene que aportar informacion nueva: otro sujeto, otro espacio, otro estado, otro punto de vista, otro momento. Si solo cambia la distancia o un poco el angulo, NO cortes: mueve la camara.

En cada plano establece de verdad la composicion, el aspecto y la posicion del sujeto, el entorno y la luz, las acciones y los cambios de estado, y el sonido de ese momento. No lo reduzcas a un resumen de la trama ni a una lista de que imagen aporta que.

NO escribas nada de camara aqui. Va en el bloque camera, aparte. Te explico por que mas abajo.

Para anclar una imagen usa frases naturales: the shot begins from <Picture 1>, the shot ends on <Picture 2>.

DIALOGO. Esto es importante y casi nadie lo hace bien. Cada voz lleva un identificador estable (S1), (S2), asignado por orden de aparicion, y se mantiene igual en todos los planos. El texto hablado va dentro de una etiqueta con el idioma:

<Subject 1> (S1) looks into the lens and says in a calm, warm voice, <d>[Spanish] Y asi queda. Sigan el canal.</d>

Dentro de <d> va SOLO la etiqueta de idioma y las palabras exactas que yo te di, sin traducir, sin reescribir y con su puntuacion. Todo lo demas (quien habla, como lo dice, que hace mientras) va fuera de <d>.

Si es voz en off, usa la frase exacta says in an off-screen voiceover y justo despues di que los labios se quedan cerrados:
The man (S1) says in an off-screen voiceover: <d>[Spanish] Todavia recuerdo ese camino.</d> while his lips remain completely closed.

Si dos personas hablan a la vez: (S1,S2). Quien no habla nunca, no lleva identificador.
Si una frase cruza un corte, usa <scenetrans> en los dos lados y di que el audio continua. Si el video corta la frase al final, usa <cutoff>.

TEXTO EN PANTALLA. Cualquier cartel, letrero, rotulo o texto que se vea, va entre comillas dobles inglesas y tal cual, sin traducir:
The dark wall lettering reads "Cine con IA" behind him.

=== 5. camera ===

Este bloque no esta en el formato oficial de MiniMax: lo pide la herramienta que uso. Escribe aqui la camara y solo la camara, en una o dos frases, y la herramienta la coloca sola dentro de detailed_description, en la frase del plano, detras de [Shot 1], que es exactamente donde MiniMax la quiere. Si la escribes en los dos sitios, el plano acaba con dos instrucciones de camara peleandose.

La camara se escribe como ingles conjugado dentro de la accion, NUNCA como etiquetas sueltas entre corchetes: en H3 los corchetes ya significan [Shot 2] y [reference generation], y meter ahi Push in lo confunde. Eso de los corchetes es de otro modelo, el Hailuo Video-01 Director, que no es este.

Tres dimensiones: tipo de movimiento, amplitud y velocidad. La amplitud y la velocidad solo se escriben cuando dicen algo; amplitud media y velocidad normal se omiten.

Los tipos de movimiento son EXACTAMENTE estos doce, con las palabras de MiniMax y no con sus sinonimos de cine:
Zoom In / Zoom Out           el objetivo cambia, la camara no se mueve
Push In / Pull Out           la camara avanza o retrocede
Pan Left / Pan Right         la camara gira sobre si misma en horizontal
Truck Left / Truck Right     la camara se desplaza lateralmente
Tilt Up / Tilt Down          la camara gira sobre si misma en vertical
Pedestal Up / Pedestal Down  la camara entera sube o baja
Arc Shot                     la camara describe un arco alrededor del sujeto
Tracking Shot                la camara sigue a un sujeto en movimiento
Static Shot                  la camara y el objetivo se quedan quietos
Shake Slightly / Strongly    temblor leve o fuerte
POV                          el punto de vista del sujeto
Roll Clockwise / Counter     la camara gira sobre el eje del objetivo

Di pushes in y no dolly in. Pedestals up y no crane up. Arcs around y no orbit. Holds a static shot y no locked off.

Amplitud: with small amplitude / with large amplitude. Velocidad: at slow speed / at fast speed.

Un solo movimiento principal por plano. Dos a la vez se emborronan.

Los tamanos de plano si van con su nombre normal, al principio: extreme close-up, close-up, close shot, medium shot, medium-wide shot, wide shot, extreme wide shot.

Los angulos MiniMax NO los documenta. Asi que describe la geometria en vez de usar jerga: the camera below him, looking up at him, mejor que low angle. Lo mismo con los efectos de objetivo: en vez de rack focus o 85mm, describe lo que se ve cambiar.

Si pido una orbita, di ademas que el cuerpo del personaje no gira y que lo que corre es el fondo, con parallax: si no, el modelo gira a la persona en vez de la camara.

Ejemplo de bloque camera bien escrito:
The shot is framed as a medium shot, with the camera at his eye level. The camera pushes in toward his face with small amplitude at slow speed across the entire shot, ending on a close-up of his head and shoulders.

=== 6. overall_soundscape ===

De una a cuatro frases, en un solo parrafo. Resume el ambiente, los sonidos fisicos de las acciones y los sonidos humanos no verbales: viento, lluvia, trafico, pasos, roce de ropa, golpes, respiracion, risas. El dialogo y la musica que suena dentro de la escena ya estan en detailed_description y NO se repiten aqui. Solo pon N/A si te pido silencio total.

=== 7. non_diegetic_music ===

De una a tres frases. La musica que solo oye el espectador, no los personajes. Habla de instrumentos, velocidad, ritmo y como cambia el volumen. NO uses palabras de ambiente abstractas ni expliques que emocion busca. Si alguien canta, o suena una radio, una tele o un movil dentro de la escena, eso es diegetico y va en detailed_description. Si no hay musica de fondo, N/A.

=== Reglas de oficio, que no estan en la guia pero me han costado renders ===

1. Describe siempre lo que SI se ve. No escribas no, sin, evita, nunca: el modelo no entiende la negacion y acaba dibujando justo lo que prohibes. Si algo no debe aparecer, describe mejor lo que si ocupa ese sitio.
2. Si un personaje sostiene un objeto, di con que mano, por donde lo agarra y que no lo suelta en todo el plano. Las manos que salen de cuadro se deforman.
3. Un solo plano continuo salvo que yo pida cortes. Cada corte es una ocasion para que la cara del personaje derive.
4. La camara deja de acercarse mientras las manos y los objetos sigan enteros dentro del encuadre.
5. MiniMax documenta una duracion de 4 a 15 segundos. Por debajo de 5,2 segundos yo he tenido peores resultados,
   asi que si me pides algo mas corto, avisamelo.
6. Limites de referencias en ref2va: hasta 9 imagenes, hasta 3 videos y hasta 3 audios, con un maximo de 12 archivos
   en total. Los videos y audios, de 2 a 15 segundos cada uno.
7. Si hay dos imagenes de referencia, di cual manda en cada cosa: la del primer fotograma manda en el peinado, la ropa, la luz y el encuadre; la del rostro manda solo en las proporciones de la cara. Si no lo dices, el modelo mezcla las dos y el peinado cambia cada vez que cambia el angulo.
8. Si pido varios angulos, escribe un prompt por angulo, cada uno completo. Solo cambia el bloque camera entre ellos. Los cortes se hacen despues en el montaje.
9. El encuadre decide la calidad de la cara. Si la cara ocupa poco cuadro, sale mal por mucho que subamos la resolucion. Si te pido un plano abierto con la cara importante, avisame.

Antes de escribir, preguntame lo que te falte, y de una en una:
- Que dice el personaje, con sus palabras exactas, y cuanto dura el plano.
- Si hay segunda imagen de referencia del rostro.
- Que tipo de toma quiero: tamano de plano, desde donde mira la camara y que hace durante el plano. Si no te lo digo, proponme tu una y dime por que.`;

/**
 * Busca el nodo Duracion del workflow y devuelve su duracion real.
 * Asi la instruccion que copiamos lleva ya los segundos correctos y el
 * usuario no tiene que escribirlos a mano en dos sitios.
 */
function duracionDelGrafo() {
  try {
    const nodos = (app.graph?._nodes || app.graph?.nodes || []);
    const d = nodos.find((n) => n.type === "CineDuracion" || n.comfyClass === "CineDuracion");
    if (!d) return null;
    const g = (nombre, porDefecto) => {
      const w = (d.widgets || []).find((x) => x.name === nombre);
      return w ? w.value : porDefecto;
    };
    const fps = parseInt(String(g("fps", "24")), 10) || 24;
    const seg = Number(g("segundos", 8)) || 8;
    const rejilla = Number(g("rejilla", 17)) || 17;
    const desfase = Number(g("desfase", 5)) || 0;
    const minimo = Number(g("minimo_fotogramas", 5)) || 5;
    let f = Math.max(minimo, Math.round(seg * fps));
    if (rejilla > 0) f = f + (((desfase - (f % rejilla)) % rejilla) + rejilla) % rejilla;
    return { fotogramas: f, fps, segundos: f / fps };
  } catch (e) { return null; }
}

/** Le pega a la receta la duracion concreta de este workflow. */
function instruccionConDuracion() {
  const d = duracionDelGrafo();
  if (!d) return INSTRUCCION_H3;
  const s = d.segundos;
  const palabras = Math.round(s * 2.3);
  return INSTRUCCION_H3 +
    `\n\nDatos de este plano en concreto:\n` +
    `- Duracion exacta: ${s.toFixed(2)} segundos (${d.fotogramas} fotogramas a ${d.fps} fps). ` +
    `Toda la accion tiene que caber ahi y terminar dentro del plano, sin quedar cortada ni sobrar tiempo al final.\n` +
    `- Si hay dialogo, unas ${palabras} palabras como maximo. Mas que eso sale acelerado.\n` +
    (s < 5.2 ? `- OJO: por debajo de 5.2 segundos el modelo trabaja fuera de su rango entrenado y pierde calidad.\n` : "") +
    (s > 15 ? `- OJO: por encima de 15 segundos el modelo trabaja fuera de su rango entrenado.\n` : "") +
    `- Si usas timecodes [Shot N] At MM:SS.mmm, ninguno puede pasar de ${s.toFixed(2)} s.`;
}

// --- titulos de cada apartado del prompt --------------------------------
// El formato de H3 es opaco visto desde fuera, asi que cada caja lleva
// escrito encima que se espera dentro.
const TITULOS_P6 = [
  ["subject_definitions", "1  ·  quién y qué sale",
   "<Subject 1> es…, <Picture 1> es el primer fotograma"],
  ["summary", "2  ·  resumen en un párrafo",
   "Empieza por el prefijo: [reference generation]"],
  ["retention_analysis", "3  ·  qué manda cada imagen",
   "Una línea por etiqueta: qué se conserva de cada una"],
  ["detailed_description", "4  ·  la escena",
   "El cuerpo del prompt, 350-500 palabras. Aquí entra la cámara"],
  ["overall_soundscape", "5  ·  sonido del lugar",
   "Ambiente y sonido diegético"],
  ["non_diegetic_music", "6  ·  música de fondo",
   "La que no suena dentro de la escena, o N/A"],
];

// --- vocabulario de camara (espejo de las tablas de nodes.py) -----------
// Los movimientos son los doce que MiniMax tabula en su guia oficial y pide
// escribir como ingles normal dentro de la frase, no entre corchetes: en H3
// los corchetes ya significan [Shot 2] y [reference generation].
const PLANOS_CHIPS = [
  ["libre", "sin especificar"],
  ["primerísimo", "primerisimo primer plano"],
  ["primer plano", "primer plano"],
  ["medio corto", "plano medio corto"],
  ["medio", "plano medio"],
  ["americano", "plano americano"],
  ["general", "plano general"],
  ["gran general", "gran plano general"],
];

const ANGULOS_CHIPS = [
  ["libre", "sin especificar"],
  ["ojos", "altura de los ojos"],
  ["contrapicado", "contrapicado"],
  ["picado", "picado"],
  ["cenital", "cenital"],
  ["3/4", "tres cuartos"],
  ["sobre el hombro", "sobre el hombro"],
];

const MOVIMIENTOS_CHIPS = [
  ["libre", "sin especificar"],
  ["fijo", "fijo"],
  ["acercar", "acercarse"],
  ["alejar", "alejarse"],
  ["zoom in", "zoom in"],
  ["zoom out", "zoom out"],
  ["pan ←", "panoramica izquierda"],
  ["pan →", "panoramica derecha"],
  ["tilt ↑", "inclinar arriba"],
  ["tilt ↓", "inclinar abajo"],
  ["lateral ←", "lateral izquierda"],
  ["lateral →", "lateral derecha"],
  ["grúa ↑", "grua arriba"],
  ["grúa ↓", "grua abajo"],
  ["órbita", "orbita"],
  ["seguir", "seguimiento"],
  ["en mano", "camara en mano"],
  ["POV", "punto de vista"],
  ["giro", "giro de horizonte"],
];

const PLANOS_EN = {
  "sin especificar": "", "primerisimo primer plano": "an extreme close-up",
  "primer plano": "a close-up", "plano medio corto": "a close shot",
  "plano medio": "a medium shot", "plano americano": "a medium-wide shot",
  "plano general": "a wide shot", "gran plano general": "an extreme wide shot",
};
const ANGULOS_EN = {
  "sin especificar": "",
  "altura de los ojos": "the camera at the subject's eye level",
  "contrapicado": "the camera below the subject, looking up at them",
  "picado": "the camera above the subject, looking down at them",
  "cenital": "the camera directly overhead, looking straight down",
  "tres cuartos": "the camera about forty-five degrees off the subject's front",
  "sobre el hombro": "the camera just behind and beside the subject's shoulder, looking past it",
};
const MOVIMIENTOS_EN = {
  "sin especificar": "", "fijo": "holds a static shot for the entire shot",
  "acercarse": "pushes in toward the subject", "alejarse": "pulls out away from the subject",
  "zoom in": "zooms in on the subject", "zoom out": "zooms out from the subject",
  "panoramica izquierda": "pans left", "panoramica derecha": "pans right",
  "inclinar arriba": "tilts up", "inclinar abajo": "tilts down",
  "lateral izquierda": "trucks left", "lateral derecha": "trucks right",
  "grua arriba": "pedestals up", "grua abajo": "pedestals down",
  "orbita": "arcs around the subject; the subject's body keeps facing its original " +
            "direction while the background slides behind them with visible parallax",
  "seguimiento": "follows the subject in a tracking shot",
  "camara en mano": "shakes slightly, handheld",
  "punto de vista": "takes the point of view of the subject",
  "giro de horizonte": "rolls clockwise",
};
const INTENSIDAD_EN = {
  "normal": "", "suave": "with small amplitude at slow speed",
  "marcada": "with large amplitude at fast speed",
};

// --- LTX-2.5: mismas etiquetas en castellano, otro ingles ---------------
// Su guia oficial usa "dolly" y "cranes up", que son justo las palabras que
// MiniMax no usa. Por eso los chips son los mismos pero traducen distinto.
const PLANOS_LTX = {
  "sin especificar": "", "primerisimo primer plano": "an extreme close-up",
  "primer plano": "a close-up", "plano medio corto": "a tight cinematic close-up",
  "plano medio": "a medium shot", "plano americano": "a medium wide shot",
  "plano general": "a wide shot", "gran plano general": "a wide establishing shot",
};
const ANGULOS_LTX = {
  "sin especificar": "",
  "altura de los ojos": "at the subject's eye level",
  "contrapicado": "looking up at the subject from below",
  "picado": "looking down at the subject from above",
  "cenital": "an overhead view looking straight down",
  "tres cuartos": "at a three-quarter angle to the subject",
  "sobre el hombro": "an over-the-shoulder shot",
};
const MOVIMIENTOS_LTX = {
  "sin especificar": "", "fijo": "holds a static frame",
  "acercarse": "pushes in toward the subject", "alejarse": "pulls back from the subject",
  "zoom in": "zooms in on the subject", "zoom out": "zooms out from the subject",
  "panoramica izquierda": "pans left", "panoramica derecha": "pans right",
  "inclinar arriba": "tilts up", "inclinar abajo": "tilts down",
  "lateral izquierda": "dollies left", "lateral derecha": "dollies right",
  "grua arriba": "cranes up", "grua abajo": "cranes down",
  "orbita": "circles around the subject, keeping them in frame while the background sweeps past",
  "seguimiento": "tracks the subject in handheld style",
  "camara en mano": "moves with a handheld feel",
  "punto de vista": "takes the subject's point of view",
  "giro de horizonte": "rolls slowly around the lens axis",
};

/** Misma frase que arma el nodo en Python, para poder enseñarla antes. */
function fraseCamara(node) {
  const g = (n) => String(findWidget(node, n)?.value ?? "");
  const ltx = String(findWidget(node, "modelo")?.value || "") === "LTX-2.5";
  const fr = [];

  if (ltx) {
    const p = PLANOS_LTX[g("plano")] || "";
    const a = ANGULOS_LTX[g("angulo")] || "";
    const m = MOVIMIENTOS_LTX[g("movimiento")] || "";
    if (p && a) fr.push(`The shot opens on ${p} ${a}.`);
    else if (p) fr.push(`The shot opens on ${p}.`);
    else if (a) fr.push(`The shot is filmed ${a}.`);
    if (m) fr.push(`The camera ${m}.`);
    return fr.join(" ");
  }

  const p = PLANOS_EN[g("plano")] || "";
  const a = ANGULOS_EN[g("angulo")] || "";
  const m = MOVIMIENTOS_EN[g("movimiento")] || "";
  const i = INTENSIDAD_EN[g("intensidad")] || "";
  if (p && a) fr.push(`The shot is framed as ${p}, with ${a}.`);
  else if (p) fr.push(`The shot is framed as ${p}.`);
  else if (a) fr.push(`The shot is filmed with ${a}.`);
  if (m) {
    const solo = m.startsWith("holds") || m.startsWith("takes") || m.includes(";");
    fr.push(`The camera ${m}${solo || !i ? "" : " " + i}.`);
  }
  return fr.join(" ");
}

// --- leer la camara del texto y poder cambiarla ------------------------
// Como se escribe cada plano DENTRO de la prosa (sin articulo, que es como
// lo ponen las IA: "Medium-wide shot: the camera...").
const PLANO_TXT = {
  "sin especificar": "", "primerisimo primer plano": "extreme close-up",
  "primer plano": "close-up", "plano medio corto": "close shot",
  "plano medio": "medium shot", "plano americano": "medium-wide shot",
  "plano general": "wide shot", "gran plano general": "extreme wide shot",
};

// De lo mas concreto a lo mas general: "medium-wide shot" antes que "wide shot"
const PLANO_RE = [
  [/extreme close-?up/i, "primerisimo primer plano"],
  [/extreme wide shot/i, "gran plano general"],
  [/medium[- ]wide shot/i, "plano americano"],
  [/\bclose shot\b/i, "plano medio corto"],
  [/\bclose-?up\b/i, "primer plano"],
  [/\bmedium shot\b/i, "plano medio"],
  [/\bwide shot\b/i, "plano general"],
];

// Cada movimiento se come el resto de SU frase ([^.]*). Es a proposito: lo
// que venia detras describia el movimiento viejo ("directly in front of him,
// at his eye height") y con el nuevo ya no es verdad. Lo que sigue despues
// del punto no se toca.
const MOV_RE = [
  [/holds? a static shot[^.]*/i, "fijo"],
  [/push(?:es|ing)? in[^.]*/i, "acercarse"],
  [/pull(?:s|ing)? out[^.]*/i, "alejarse"],
  [/zoom(?:s|ing)? in[^.]*/i, "zoom in"],
  [/zoom(?:s|ing)? out[^.]*/i, "zoom out"],
  [/pan(?:s|ning)? left[^.]*/i, "panoramica izquierda"],
  [/pan(?:s|ning)? right[^.]*/i, "panoramica derecha"],
  [/tilt(?:s|ing)? up[^.]*/i, "inclinar arriba"],
  [/tilt(?:s|ing)? down[^.]*/i, "inclinar abajo"],
  [/truck(?:s|ing)? left[^.]*/i, "lateral izquierda"],
  [/truck(?:s|ing)? right[^.]*/i, "lateral derecha"],
  [/pedestal(?:s|ing)? up[^.]*/i, "grua arriba"],
  [/pedestal(?:s|ing)? down[^.]*/i, "grua abajo"],
  [/arc(?:s|ing)? around[^.]*/i, "orbita"],
  [/tracking shot[^.]*/i, "seguimiento"],
  [/shak(?:es|ing)[^.]*/i, "camara en mano"],
  [/roll(?:s|ing)? (?:clockwise|counterclockwise)[^.]*/i, "giro de horizonte"],
];

const ANG_RE = [
  [/eye (?:level|height)/i, "altura de los ojos"],
  [/looking up at/i, "contrapicado"],
  [/looking down at/i, "picado"],
  [/directly overhead|straight down/i, "cenital"],
  [/forty-five degrees/i, "tres cuartos"],
  [/behind and beside/i, "sobre el hombro"],
];

/** Mira que camara describe ya el texto de la seccion 4.
 *
 * Gana la que aparezca ANTES EN EL TEXTO, no la primera de la tabla. Un
 * bloque de camara suele nombrar dos tamanos de plano: donde empieza y
 * donde acaba ("framed as a medium shot ... tightening to a close-up").
 * El encuadre es el primero; el segundo es a donde llega. Recorriendo la
 * tabla por orden ganaba "close-up" solo por estar antes en la lista, y
 * los chips se quedaban con el plano equivocado.
 */
function primeroEnElTexto(t, tabla) {
  let clave = null, donde = Infinity;
  for (const [re, k] of tabla) {
    const m = t.match(new RegExp(re.source, re.flags.replace("g", "")));
    if (m && m.index < donde) { donde = m.index; clave = k; }
  }
  return clave;
}

function leerCamara(texto) {
  const t = String(texto || "");
  return {
    plano: primeroEnElTexto(t, PLANO_RE),
    angulo: primeroEnElTexto(t, ANG_RE),
    movimiento: primeroEnElTexto(t, MOV_RE),
  };
}

// --- historial de tomas ya rodadas --------------------------------------
// Va en node.properties, que se guarda con el workflow: asi abres el archivo
// mañana y sigues viendo que angulos ya hiciste. No toca widgets_values, asi
// que no puede desordenar nada.

function tomasDe(node) {
  const p = node.properties || (node.properties = {});
  if (!Array.isArray(p.tomasUsadas)) p.tomasUsadas = [];
  return p.tomasUsadas;
}

function apuntarToma(node) {
  const g = (n) => String(findWidget(node, n)?.value || "sin especificar");
  const toma = [g("plano"), g("angulo"), g("movimiento")].join(" | ");
  const lista = tomasDe(node);
  if (!lista.includes(toma)) lista.push(toma);
  return lista.length;
}

/**
 * Cobertura clasica de una escena, en el orden en que se rueda de verdad:
 * primero el plano maestro, luego el cerrado para la emocion, luego los
 * angulos alternativos, y al final los recursos. Cada clic del boton avanza
 * a la siguiente que no hayas usado.
 */
const TOMAS_SUGERIDAS = [
  ["plano medio", "altura de los ojos", "fijo"],
  ["primer plano", "altura de los ojos", "acercarse"],
  ["plano americano", "tres cuartos", "fijo"],
  ["plano medio corto", "sobre el hombro", "fijo"],
  ["plano general", "altura de los ojos", "fijo"],
  ["primer plano", "contrapicado", "orbita"],
  ["plano medio", "picado", "alejarse"],
  ["gran plano general", "altura de los ojos", "grua arriba"],
];

/** La primera de la lista que no se haya rodado, o null si ya estan todas. */
function siguienteToma(node) {
  const hechas = tomasDe(node);
  for (const t of TOMAS_SUGERIDAS) {
    if (!hechas.includes(t.join(" | "))) return t;
  }
  return null;
}

function ponerToma(node, toma) {
  const campos = ["plano", "angulo", "movimiento"];
  campos.forEach((c, i) => {
    const w = findWidget(node, c);
    if (w) w.value = toma[i];
  });
}

function tomaActual(node) {
  return ["plano", "angulo", "movimiento"]
    .map((c) => String(findWidget(node, c)?.value || "sin especificar")).join(" | ");
}

/** ¿Ya se uso este valor en alguna toma anterior? */
function tomaUsada(node, campo, valor) {
  const i = { plano: 0, angulo: 1, movimiento: 2 }[campo];
  if (i === undefined) return false;
  return tomasDe(node).some((t) => t.split(" | ")[i] === String(valor));
}

/** Traduce lo que leyo a las etiquetas cortas de los chips. */
function resumirCamara(texto) {
  const c = leerCamara(texto);
  const etq = (tabla, clave) => (tabla.find(([, v]) => v === clave) || [])[0] || clave;
  const p = [];
  if (c.plano) p.push(etq(PLANOS_CHIPS, c.plano));
  if (c.angulo) p.push(etq(ANGULOS_CHIPS, c.angulo));
  if (c.movimiento) p.push(etq(MOVIMIENTOS_CHIPS, c.movimiento));
  return p.join("  ·  ");
}

/** Resumen de la camara que quedo escrita DENTRO de la seccion 4, o "". */
function camaraEnTexto(node) {
  return resumirCamara(findWidget(node, "detailed_description")?.value);
}

/**
 * Pone los chips a lo que diga la CAJA DE CAMARA, y solo esa.
 *
 * Antes miraba tambien la seccion 4 si la caja venia vacia, y eso dejaba el
 * nodo en un estado tramposo: los chips marcados como si el usuario hubiera
 * pedido algo cuando en realidad solo estaban repitiendo lo que ya decia el
 * texto. Si la camara vive dentro de la seccion 4, los chips se quedan en
 * "libre" y la linea de estado lo cuenta; para cambiarla esta el boton.
 */
function chipsDesdeTexto(node) {
  const caja = String(findWidget(node, "camara")?.value || "").trim();
  const c = leerCamara(caja);
  let n = 0;
  for (const campo of ["plano", "angulo", "movimiento"]) {
    const w = findWidget(node, campo);
    if (!w) continue;
    w.value = c[campo] || "sin especificar";
    if (c[campo]) n++;
  }
  return n;
}

/** Copia la mayuscula inicial del trozo que sustituimos. */
function comoEstaba(viejo, nuevo) {
  return /^[A-Z]/.test(viejo) ? nuevo.charAt(0).toUpperCase() + nuevo.slice(1) : nuevo;
}

/**
 * Escribe en el texto de la seccion 4 la camara que dicen los chips,
 * sustituyendo la que ya hubiera en vez de anadir una segunda.
 * Devuelve que cambio.
 */
function aplicarCamaraAlTexto(node) {
  const w = findWidget(node, "detailed_description");
  if (!w) return { error: "no encuentro la sección 4" };
  let t = String(w.value || "");
  if (!t.trim()) return { error: "la sección 4 está vacía" };

  const hechos = [];
  // Se sustituye la que aparezca ANTES en el texto, por la misma razon que
  // en leerCamara: la primera es el encuadre, la segunda es a donde llega.
  const sustituir = (tabla, destino) => {
    if (!destino) return false;
    let elegida = null, donde = Infinity;
    for (const [re] of tabla) {
      const m = t.match(new RegExp(re.source, re.flags.replace("g", "")));
      if (m && m.index < donde) { donde = m.index; elegida = re; }
    }
    if (!elegida) return false;
    t = t.replace(new RegExp(elegida.source, "gi"), (m) => comoEstaba(m, destino));
    return true;
  };

  const plano = PLANO_TXT[String(findWidget(node, "plano")?.value || "")] || "";
  const mov = MOVIMIENTOS_EN[String(findWidget(node, "movimiento")?.value || "")] || "";

  if (plano && sustituir(PLANO_RE, plano)) hechos.push("plano");
  if (mov && sustituir(MOV_RE, mov)) hechos.push("movimiento");

  // lo que no estaba escrito no se puede sustituir: se inserta entero
  const falta = [];
  if (plano && !hechos.includes("plano")) falta.push(`The shot is framed as ${/^[aeiou]/i.test(plano) ? "an" : "a"} ${plano}.`);
  if (mov && !hechos.includes("movimiento")) {
    const solo = mov.startsWith("holds") || mov.startsWith("takes");
    const i = INTENSIDAD_EN[String(findWidget(node, "intensidad")?.value || "")] || "";
    falta.push(`The camera ${mov}${solo || !i ? "" : " " + i}.`);
  }
  if (falta.length) {
    const m = t.match(/\[Shot\s*1\](?:\s*At\s*[\d:.]+)?/i);
    if (m) {
      const k = t.indexOf(m[0]) + m[0].length;
      t = t.slice(0, k) + " " + falta.join(" ") + t.slice(k);
    } else {
      t = t.trimEnd() + "\n\n" + falta.join(" ");
    }
    hechos.push("insertado");
  }

  if (!hechos.length) return { error: "no hay nada que aplicar: las listas están en 'libre'" };
  ponerTexto(w, t);
  return { hechos };
}

function cortar(t, n) { return t.length > n ? t.slice(0, n - 1) + "…" : t; }

function partir(t, n) {
  const out = [];
  let linea = "";
  for (const p of String(t).split(/\s+/)) {
    if ((linea + " " + p).trim().length > n) { out.push(linea.trim()); linea = p; }
    else linea += " " + p;
  }
  if (linea.trim()) out.push(linea.trim());
  return out;
}

/** Sube un widget ya creado a lo mas alto del nodo. */
function alPrincipio(node, w) {
  const ws = node.widgets || [];
  const i = ws.indexOf(w);
  if (i > 0) { ws.splice(i, 1); ws.unshift(w); }
  return w;
}

/** Mueve un widget ya creado para que quede justo detrás de otro. */
function reubicar(node, w, tras) {
  const ws = node.widgets || [];
  const i = ws.indexOf(w);
  if (i < 0) return w;
  ws.splice(i, 1);
  const j = ws.findIndex((x) => x.name === tras);
  if (j < 0) ws.push(w); else ws.splice(j + 1, 0, w);
  return w;
}

// --- pegar un prompt entero y repartirlo en las seis secciones -----------
const SECCIONES_P6 = [
  "subject_definitions", "summary", "retention_analysis",
  "detailed_description", "overall_soundscape", "non_diegetic_music",
  // no es una seccion del formato de H3: es la caja de camara, que el nodo
  // inserta luego dentro de detailed_description, detras de [Shot 1]
  "camara",
];

// Las seis secciones reales del formato de H3, sin la caja de camara.
const SECCIONES_H3 = SECCIONES_P6.filter((x) => x !== "camara");

// Espejo de MODELOS en nodes.py. El orden es el que se ve en la fila.
const MODELOS_UI = [
  "MiniMax H3", "LTX-2.5", "Wan 2.2", "Hunyuan 1.5",
  "CogVideoX 1.5", "Mochi 1", "Libre",
];

// Recetas por pestana. La de H3 es la larga de arriba; la de LTX queda
// pendiente de ver un workflow real, y se dice asi en vez de inventarsela.
const INSTRUCCION_LTX = `Vas a escribir prompts para el modelo de video LTX-2.5, de Lightricks. Yo te describo la escena en lenguaje normal y tu me devuelves el prompt.

Estas reglas salen de su guia oficial de prompts. OJO: LTX no se escribe como MiniMax H3. Si vienes de H3, olvida el formato de secciones.

FORMATO

Un solo parrafo continuo, en ingles. Sin secciones, sin encabezados, sin listas, sin corchetes. Entre 4 y 8 frases.

No hay prompt negativo. Todo se dice en positivo.

Verbos en presente para el movimiento y la accion.

EL ORDEN QUE PIDE LA GUIA, dentro de ese mismo parrafo:

1. El plano: terminos de cine, escala, genero.
2. La escena: luz, color, textura, atmosfera.
3. La accion: la secuencia natural, de principio a fin.
4. Los personajes: edad, pelo, ropa, y las emociones DESCRITAS POR SENALES FISICAS.
5. La camara: cuando y como cambia la vista, y como se ve el sujeto despues del movimiento.
6. El sonido: ambiente, musica, dialogo.

CAMARA

Va dentro del parrafo, en la frase, nunca en un bloque aparte. Las palabras que usa su guia:

Planos: wide shot, wide establishing shot, medium shot, close-up, tight cinematic close-up, extreme close-up, over-the-shoulder, overhead view, static frame.

Movimientos: pans, dollies, tracking, follows, circles around, tilts, pushes in, pulls back, cranes up, arcs, handheld tracking.

Fijate en que LTX SI dice dolly y cranes up, que son justo las palabras que MiniMax H3 no usa. No mezcles los dos vocabularios.

La guia pide ademas describir la camara por su relacion con el sujeto, no en abstracto: no "the camera moves", sino "the camera circles around her, keeping her face in frame".

DIALOGO

Entre comillas, y di el idioma y el acento si importa. Su formato de ejemplo es de guion:

Reporter (live): "Thank you, Sylvia. And yes, this is a sentence I never thought I would say on live television."

Puedes marcar como se dice: whispering, shouting, muttering, deadpan.

LO QUE NO FUNCIONA, y esto lo dice su guia expresamente:

1. TEXTO Y LOGOS NO. La guia dice que LTX-2 no genera texto legible ni consistente, y pide evitar carteles, marcas y cualquier cosa impresa. Si mi escena lleva un rotulo o un logo, avisame: hay que resolverlo de otra manera.
2. Nada de estados de animo sin senal fisica. En vez de "sad" o "confused", describe la postura, el gesto, la mirada.
3. Fisica complicada o movimiento caotico no: saltar, hacer malabares. Bailar si funciona.
4. No amontones la escena. Cuantos mas personajes, acciones y objetos metas, mas probable es que alguno no aparezca. Empieza simple.
5. La luz tiene que tener logica: nada de fuentes que se contradicen sin motivo.

Ajusta el detalle al tamano del plano: un primer plano necesita mas precision que un plano general.

Antes de escribir, preguntame lo que te falte, de una en una: que pasa en la escena, que dice cada personaje con sus palabras exactas, y que tipo de toma quiero. Si no te lo digo, proponme tu una y dime por que.`;

const INSTRUCCION_WAN = `Vas a preparar un prompt para Wan 2.2 local. Primero averigua si voy a usar text-to-video o image-to-video. Preguntame de una en una las cosas que falten y no escribas el bloque final hasta tener una escena clara.

REGLAS OFICIALES IMPORTANTES

En image-to-video la imagen es el primer fotograma. No repitas una descripcion estatica de lo que ya se ve: concentra el prompt en lo que empieza a moverse, la secuencia de acciones, los cambios del entorno y la camara. Conserva y enfatiza cualquier movimiento de camara. El texto final debe ser directo, en ingles y de 100 palabras o menos.

En text-to-video conserva el sujeto y la accion que te pida. Puedes enriquecer tiempo del dia, fuente y direccion de luz, tono, contraste, tipo de plano, angulo y composicion, pero solo cuando ayuden. No cambies la intencion original.

Escribe acciones observables y ordenadas. Evita adjetivos abstractos que no puedan verse. Si hay varias personas, identificalas por ropa, posicion o rasgos estables.

Cuando yo confirme la escena, devuelve SOLO este bloque, sin markdown ni comentarios. Estas secciones son para Cine con IA; el nodo las unira en un unico prompt:

mode:
subject:
motion:
scene:
camera:
style:
negative_prompt:

mode debe ser exactamente image-to-video o text-to-video. Todo lo demas va en ingles. En image-to-video deja subject o scene breves si ya estan fijados por la imagen. negative_prompt puede ser N/A.`;

const INSTRUCCION_HUNYUAN = `Vas a preparar un prompt para HunyuanVideo 1.5 local. Primero preguntame si es text-to-video o image-to-video y luego pregunta, de una en una, solo lo que falte.

La formula oficial para text-to-video es:
Subject + Motion + Scene + [Shot Type] + [Camera Movement] + [Lighting] + [Style] + [Atmosphere].

Para image-to-video el primer fotograma ya viene dado. La formula prioritaria es:
Subject Motion Dynamics + Scene Motion Dynamics + [Camera Movement].

Usa ingles claro y directo. Describe procesos en orden (first, then, meanwhile, finally), convierte emociones abstractas en gestos visibles, especifica izquierda/derecha, primer plano/fondo y distingue a cada personaje por atributos o posicion. El texto visible en pantalla debe ir entre comillas dobles.

Cuando yo confirme la escena, devuelve SOLO este bloque, sin markdown ni explicaciones. Cine con IA unira los campos en el orden oficial:

mode:
subject:
motion:
scene:
shot_type:
camera_movement:
lighting:
style:
atmosphere:
negative_prompt:

mode debe ser exactamente image-to-video o text-to-video. El resto va en ingles. En image-to-video no redescribas inutilmente lo que ya esta fijado por el primer fotograma. Los campos opcionales pueden decir N/A.`;

const INSTRUCCION_COG = `Vas a preparar un prompt para CogVideoX 1.5 local. Primero preguntame si es text-to-video o image-to-video. Haz las preguntas que falten de una en una y espera mis respuestas antes de entregar el bloque final.

CogVideoX fue entrenado con captions largos y descriptivos. Escribe en ingles, con oraciones completas y una secuencia temporal clara. Integra sujeto, entorno, acciones, cambios, composicion, camara, luz, color y atmosfera en una descripcion coherente. No empieces con frases vacias como "the image shows".

En image-to-video la imagen es el primer fotograma y la accion debe comenzar desde ese estado. No introduzcas cortes, cambios de escena, transiciones de camara ni saltos de perspectiva que contradigan la imagen inicial.

Respeta el limite del codificador de CogVideoX 1.5: maximo 224 tokens. Prefiere detalle concreto antes que listas de adjetivos.

Cuando yo confirme la escena, devuelve SOLO este bloque, sin markdown ni comentarios. Las secciones son para revisar y Cine con IA las unira en un solo caption:

mode:
subject_and_scene:
temporal_action:
camera_and_composition:
lighting_and_color:
style_and_atmosphere:
negative_prompt:

mode debe ser exactamente image-to-video o text-to-video. Todo lo demas va en ingles. negative_prompt puede ser N/A.`;

const INSTRUCCION_MOCHI = `Vas a preparar un prompt para Mochi 1 local. Preguntame de una en una por el sujeto, la accion, el entorno, la toma y la luz. No escribas el bloque final hasta que yo confirme la idea.

Mochi 1 recibe un prompt en ingles y un negativo separado. Su documentacion publica no impone una plantilla de secciones; Cine con IA usa los campos de abajo solo para que yo pueda revisar y corregir el resultado antes de unirlo en un parrafo.

Describe una escena fotorealista concreta, con acciones visibles y continuidad temporal. Incluye encuadre y movimiento de camara solo si son importantes. Prefiere movimiento moderado y fisicamente claro: la version preview reconoce que el movimiento extremo puede producir deformaciones y que esta optimizada para estilos fotorealistas, no para animacion.

Cuando yo confirme la escena, devuelve SOLO este bloque, sin markdown ni explicaciones:

subject:
action:
environment:
camera:
lighting_and_style:
negative_prompt:

Todo va en ingles. negative_prompt puede ser N/A.`;

// Cada perfil declara el bloque que devuelve la IA y el widget donde se
// guarda. Las secciones son una mesa de montaje: Python las recompone como
// un prompt continuo y mantiene el negativo en una salida independiente.
const PERFILES_PROMPT = {
  "Wan 2.2": {
    grupo: "wan", instruccion: INSTRUCCION_WAN, principal: "wan_movimiento",
    titulos: [
      ["wan_sujeto", "sujeto", "En I2V, solo lo necesario para identificar qué elemento se mueve."],
      ["wan_movimiento", "movimiento  ·  lo más importante", "Acciones visibles y ordenadas; describe cómo empieza y cómo termina."],
      ["wan_escena", "escena dinámica", "Cambios del entorno. En I2V evita repetir lo que ya muestra la imagen."],
      ["wan_camara", "cámara", "Conserva y enfatiza el movimiento de cámara solicitado."],
      ["wan_estilo", "estética", "Luz, tono, encuadre y composición que realmente ayuden."],
      ["wan_negativo", "prompt negativo", "Sale por la conexión negative; N/A se convierte en vacío."],
    ],
    secciones: {
      mode: "wan_modo", subject: "wan_sujeto", motion: "wan_movimiento",
      scene: "wan_escena", camera: "wan_camara", style: "wan_estilo",
      negative_prompt: "wan_negativo",
    },
    alias: { modo: "mode", sujeto: "subject", movimiento: "motion",
             escena: "scene", camara: "camera", cámara: "camera",
             estilo: "style", negative: "negative_prompt", negativo: "negative_prompt" },
  },
  "Hunyuan 1.5": {
    grupo: "hunyuan", instruccion: INSTRUCCION_HUNYUAN, principal: "hunyuan_movimiento",
    titulos: [
      ["hunyuan_sujeto", "1 · sujeto", "Apariencia o identidad estable del sujeto."],
      ["hunyuan_movimiento", "2 · movimiento", "Acción observable y secuencia temporal."],
      ["hunyuan_escena", "3 · escena", "Entorno y cambios que ocurren en él."],
      ["hunyuan_plano", "4 · tipo de plano", "Close-up, medium shot, long shot, aerial shot…"],
      ["hunyuan_camara", "5 · movimiento de cámara", "Relación de la cámara con el sujeto."],
      ["hunyuan_luz", "6 · iluminación", "Fuente, dirección, dureza y evolución de la luz."],
      ["hunyuan_estilo", "7 · estilo", "Photorealistic, cinematic, pixel art, ink wash…"],
      ["hunyuan_atmosfera", "8 · atmósfera", "Tono visual general, expresado con señales observables."],
      ["hunyuan_negativo", "prompt negativo", "Sale por la conexión negative; N/A se convierte en vacío."],
    ],
    secciones: {
      mode: "hunyuan_modo", subject: "hunyuan_sujeto", motion: "hunyuan_movimiento",
      scene: "hunyuan_escena", shot_type: "hunyuan_plano",
      camera_movement: "hunyuan_camara", lighting: "hunyuan_luz",
      style: "hunyuan_estilo", atmosphere: "hunyuan_atmosfera",
      negative_prompt: "hunyuan_negativo",
    },
    alias: { modo: "mode", sujeto: "subject", movimiento: "motion",
             escena: "scene", plano: "shot_type", camera: "camera_movement",
             camara: "camera_movement", cámara: "camera_movement",
             luz: "lighting", estilo: "style", atmosfera: "atmosphere",
             atmósfera: "atmosphere", negative: "negative_prompt", negativo: "negative_prompt" },
  },
  "CogVideoX 1.5": {
    grupo: "cog", instruccion: INSTRUCCION_COG, principal: "cog_accion_temporal",
    titulos: [
      ["cog_sujeto_escena", "sujeto y escena", "Quién, dónde y qué rasgos deben permanecer coherentes."],
      ["cog_accion_temporal", "acción en el tiempo", "Secuencia completa desde el estado inicial hasta el final."],
      ["cog_camara_composicion", "cámara y composición", "En I2V evita transiciones, cortes y cambios de perspectiva."],
      ["cog_luz_color", "luz y color", "Fuentes, contraste y paleta que se ven en el plano."],
      ["cog_estilo_atmosfera", "estilo y atmósfera", "Detalle concreto; el total no debe superar 224 tokens."],
      ["cog_negativo", "prompt negativo", "Sale por la conexión negative; N/A se convierte en vacío."],
    ],
    secciones: {
      mode: "cog_modo", subject_and_scene: "cog_sujeto_escena",
      temporal_action: "cog_accion_temporal",
      camera_and_composition: "cog_camara_composicion",
      lighting_and_color: "cog_luz_color",
      style_and_atmosphere: "cog_estilo_atmosfera",
      negative_prompt: "cog_negativo",
    },
    alias: { modo: "mode", subject: "subject_and_scene", scene: "subject_and_scene",
             sujeto: "subject_and_scene", accion: "temporal_action", acción: "temporal_action",
             camera: "camera_and_composition", camara: "camera_and_composition",
             cámara: "camera_and_composition", lighting: "lighting_and_color",
             luz: "lighting_and_color", style: "style_and_atmosphere",
             estilo: "style_and_atmosphere", negative: "negative_prompt",
             negativo: "negative_prompt" },
  },
  "Mochi 1": {
    grupo: "mochi", instruccion: INSTRUCCION_MOCHI, principal: "mochi_accion",
    titulos: [
      ["mochi_sujeto", "sujeto", "Descripción fotorealista del elemento principal."],
      ["mochi_accion", "acción", "Movimiento moderado, visible y físicamente claro."],
      ["mochi_entorno", "entorno", "Lugar y elementos con los que interactúa el sujeto."],
      ["mochi_camara", "cámara", "Encuadre y movimiento solo cuando aporten al plano."],
      ["mochi_luz_estilo", "luz y estilo", "Mochi 1 Preview está orientado a fotorealismo."],
      ["mochi_negativo", "prompt negativo", "Sale por la conexión negative; N/A se convierte en vacío."],
    ],
    secciones: {
      subject: "mochi_sujeto", action: "mochi_accion", environment: "mochi_entorno",
      camera: "mochi_camara", lighting_and_style: "mochi_luz_estilo",
      negative_prompt: "mochi_negativo",
    },
    alias: { sujeto: "subject", accion: "action", acción: "action",
             entorno: "environment", escena: "environment", camara: "camera",
             cámara: "camera", lighting: "lighting_and_style", luz: "lighting_and_style",
             style: "lighting_and_style", estilo: "lighting_and_style",
             negative: "negative_prompt", negativo: "negative_prompt" },
  },
};

function normalizarClavePerfil(txt) {
  return String(txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s-]+/g, "_").replace(/^_+|_+$/g, "");
}

function clavePerfil(perfil, txt) {
  const k = normalizarClavePerfil(txt);
  if (Object.hasOwn(perfil.secciones, k)) return k;
  for (const [alias, destino] of Object.entries(perfil.alias || {})) {
    if (normalizarClavePerfil(alias) === k) return destino;
  }
  return null;
}

function parsearPerfil(texto, perfil) {
  const r = {};
  if (!texto || !texto.trim()) return r;
  const limpio = texto.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();

  if (limpio.startsWith("{")) {
    try {
      const o = JSON.parse(limpio);
      for (const [k, v] of Object.entries(o)) {
        const c = clavePerfil(perfil, k);
        if (c && typeof v === "string") r[c] = v.trim();
      }
      if (Object.keys(r).length) return r;
    } catch (e) { /* seguimos por encabezados */ }
  }

  const nombres = [...Object.keys(perfil.secciones), ...Object.keys(perfil.alias || {})]
    .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[_\s-]+/g, "[_ -]+"));
  const rx = new RegExp(
    "^[ \\t>#*_\\-]{0,6}(?:\\d{1,2}[.)]\\s*)?\\**\\s*(" + nombres.join("|") +
    ")\\s*\\**\\s*[:：]?[ \\t]*$|^[ \\t>#*_\\-]{0,6}(?:\\d{1,2}[.)]\\s*)?\\**\\s*(" +
    nombres.join("|") + ")\\s*\\**\\s*[:：][ \\t]*\\**[ \\t]*", "gmi");
  const marcas = [];
  let m;
  while ((m = rx.exec(texto)) !== null) {
    const c = clavePerfil(perfil, m[1] || m[2]);
    if (c) marcas.push({ clave: c, ini: m.index, fin: m.index + m[0].length });
    if (rx.lastIndex === m.index) rx.lastIndex++;
  }
  if (!marcas.length) {
    const destino = Object.entries(perfil.secciones).find(([k]) => k !== "mode" && k !== "negative_prompt");
    if (destino) r[destino[0]] = texto.trim();
    return r;
  }
  for (let i = 0; i < marcas.length; i++) {
    const hasta = i + 1 < marcas.length ? marcas[i + 1].ini : texto.length;
    r[marcas[i].clave] = texto.slice(marcas[i].fin, hasta).trim();
  }
  return r;
}

function limpiarValorPerfil(clave, valor) {
  const t = String(valor || "").trim();
  if (/^(?:n\/?a|none|not applicable|sin especificar)$/i.test(t)) return "";
  if (clave === "mode") {
    const m = t.toLowerCase().replace(/_/g, "-");
    if (m.includes("image") || m === "i2v") return "image-to-video";
    if (m.includes("text") || m === "t2v") return "text-to-video";
  }
  return t;
}

// nombres alternativos que suelen devolver los asistentes
const ALIAS_P6 = {
  subject_definitions: ["subject definitions", "definiciones", "definiciones de sujetos", "sujetos"],
  summary: ["resumen"],
  retention_analysis: ["retention analysis", "analisis de retencion", "análisis de retención", "retencion", "retención"],
  detailed_description: ["detailed description", "descripcion detallada", "descripción detallada",
                         "descripcion", "descripción",
                         // plantilla multimodal integrada de H3: fusiona las 3 primeras
                         "integrated multimodal description", "integrated_multimodal_description",
                         "descripcion multimodal integrada", "descripción multimodal integrada"],
  overall_soundscape: ["overall soundscape", "soundscape", "ambiente sonoro", "sonido"],
  non_diegetic_music: ["non diegetic music", "non-diegetic music", "musica no diegetica", "música no diegética", "musica", "música"],
  camara: ["camera", "camara", "cámara", "camera block", "camera_block",
           "camera movement", "camera direction", "shot", "bloque de camara",
           "bloque de cámara", "movimiento de camara", "movimiento de cámara"],
};

function claveP6(txt) {
  const t = String(txt).toLowerCase().replace(/[_\s-]+/g, " ").trim();
  for (const k of SECCIONES_P6) {
    if (t === k.replace(/_/g, " ")) return k;
    if ((ALIAS_P6[k] || []).includes(t)) return k;
  }
  return null;
}

/** Devuelve {seccion: texto} a partir de lo que sea que haya pegado el usuario. */
function parsearPrompt(texto) {
  const r = {};
  if (!texto || !texto.trim()) return r;

  // 1) JSON, con o sin valla de codigo
  const limpio = texto.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
  if (limpio.startsWith("{")) {
    try {
      const o = JSON.parse(limpio);
      let n = 0;
      for (const [k, v] of Object.entries(o)) {
        const c = claveP6(k);
        if (c && typeof v === "string") { r[c] = v.trim(); n++; }
      }
      if (n) return r;
    } catch (e) { /* no era JSON, seguimos por encabezados */ }
  }

  // 2) encabezados de linea: "summary:", "**Summary**", "## 2. Summary"
  const nombres = [];
  for (const k of SECCIONES_P6) {
    nombres.push(k.replace(/_/g, "[_ ]"));
    for (const a of ALIAS_P6[k]) {
      nombres.push(a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[_ -]+"));
    }
  }
  const lista = nombres.join("|");
  const rx = new RegExp(
    "^[ \\t>#*_\\-]{0,6}(?:\\d{1,2}[.)]\\s*)?\\**\\s*(" + lista + ")\\s*\\**\\s*[:：]?[ \\t]*$|" +
    "^[ \\t>#*_\\-]{0,6}(?:\\d{1,2}[.)]\\s*)?\\**\\s*(" + lista + ")\\s*\\**\\s*[:：][ \\t]*\\**[ \\t]*",
    "gmi");

  const marcas = [];
  let m;
  while ((m = rx.exec(texto)) !== null) {
    const c = claveP6(m[1] || m[2]);
    if (c) marcas.push({ clave: c, ini: m.index, fin: m.index + m[0].length });
    if (rx.lastIndex === m.index) rx.lastIndex++;
  }

  if (!marcas.length) {
    // no reconocimos nada: todo al cuerpo, que es donde menos dano hace
    r.detailed_description = texto.trim();
    return r;
  }
  // lo que venga antes del primer encabezado no se tira: son las
  // declaraciones de referencias, que pertenecen a las definiciones
  const preambulo = texto.slice(0, marcas[0].ini).trim();
  if (preambulo) r.subject_definitions = preambulo;

  for (let i = 0; i < marcas.length; i++) {
    const hasta = i + 1 < marcas.length ? marcas[i + 1].ini : texto.length;
    const cuerpo = texto.slice(marcas[i].fin, hasta).trim();
    r[marcas[i].clave] = (r[marcas[i].clave] ? r[marcas[i].clave] + "\n\n" : "") + cuerpo;
  }
  return r;
}

/**
 * Escribe en un widget de texto. Las cajas multilinea del frontend nuevo son
 * <textarea> de HTML: cambiar w.value no basta, hay que tocar el elemento y
 * lanzar el evento para que el frontend se entere.
 */
function ponerTexto(w, valor) {
  if (!w) return false;
  try { w.value = valor; } catch (e) { /* algunos widgets son de solo lectura */ }

  const candidatos = [w.inputEl, w.element, w.domElement, w.el,
                      w.options && w.options.inputEl];
  for (const c of candidatos) {
    if (!c) continue;
    let campo = null;
    if (typeof c.value === "string" || c.tagName === "TEXTAREA" || c.tagName === "INPUT") {
      campo = c;
    } else if (c.querySelector) {
      campo = c.querySelector("textarea, input");
    }
    if (campo) {
      campo.value = valor;
      campo.dispatchEvent(new Event("input", { bubbles: true }));
      campo.dispatchEvent(new Event("change", { bubbles: true }));
      break;
    }
  }
  try { w.callback?.(valor); } catch (e) { /* sin callback, da igual */ }
  return true;
}

/** Ventana propia con un area de texto. Sin alert() ni prompt(), que bloquean. */
function ventanaPegar(alAceptar, op) {
  op = op || {};
  const fondo = document.createElement("div");
  fondo.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;" +
    "display:flex;align-items:center;justify-content:center;";
  const caja = document.createElement("div");
  caja.style.cssText = "background:#20282a;border:1px solid #3a4547;border-radius:10px;padding:18px;" +
    "width:min(760px,92vw);box-shadow:0 12px 48px rgba(0,0,0,.6);font-family:system-ui,sans-serif;color:#cfdadb;";
  const titulo = document.createElement("div");
  titulo.textContent = op.titulo || "Pegar el prompt y repartirlo en las seis secciones";
  titulo.style.cssText = "font-size:15px;font-weight:600;margin-bottom:4px;color:#e8eeee;";
  const ayuda = document.createElement("div");
  ayuda.textContent = op.ayuda || "Pega aquí lo que te devolvió tu asistente, tal cual. Acepta texto con encabezados, markdown o JSON.";
  ayuda.style.cssText = "font-size:12px;color:#8b9a9b;margin-bottom:12px;";
  const area = document.createElement("textarea");
  area.style.cssText = "width:100%;height:46vh;background:#161d1f;color:#dfe8e8;border:1px solid #3a4547;" +
    "border-radius:6px;padding:10px;font-family:Consolas,monospace;font-size:12px;resize:vertical;box-sizing:border-box;";
  const fila = document.createElement("label");
  fila.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;color:#a9b8b9;cursor:pointer;";
  const casilla = document.createElement("input");
  casilla.type = "checkbox";
  casilla.checked = true;
  casilla.style.cssText = "width:15px;height:15px;accent-color:" + ACCENT + ";cursor:pointer;";
  const txtCasilla = document.createElement("span");
  txtCasilla.textContent = "Vaciar las secciones que no vengan en el texto (evita mezclar con el prompt anterior)";
  fila.append(casilla, txtCasilla);

  const pie = document.createElement("div");
  pie.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:12px;";
  const btn = (txt, principal) => {
    const b = document.createElement("button");
    b.textContent = txt;
    b.style.cssText = "padding:8px 16px;border-radius:6px;border:1px solid #3a4547;cursor:pointer;font-size:13px;" +
      (principal ? "background:" + ACCENT + ";color:#12181a;font-weight:600;border-color:" + ACCENT + ";"
                 : "background:#2b3335;color:#cfdadb;");
    return b;
  };
  const cancelar = btn("Cancelar", false);
  const aceptar = btn(op.aceptar || "Ordenar", true);
  pie.append(cancelar, aceptar);
  if (op.sinCasilla) fila.style.display = "none";
  if (op.valor) area.value = op.valor;
  caja.append(titulo, ayuda, area, fila, pie);
  fondo.append(caja);
  document.body.append(fondo);
  area.focus();

  const cerrar = () => fondo.remove();
  cancelar.onclick = cerrar;
  fondo.onclick = (e) => { if (e.target === fondo) cerrar(); };
  fondo.onkeydown = (e) => { if (e.key === "Escape") cerrar(); e.stopPropagation(); };
  aceptar.onclick = () => {
    const t = area.value, vaciar = casilla.checked;
    cerrar();
    alAceptar(t, vaciar);
  };

  // si el portapapeles deja leerse, lo precargamos
  if (op.valor) { area.select?.(); }
  else {
    try {
      navigator.clipboard?.readText?.().then((t) => { if (t && !area.value) area.value = t; }).catch(() => {});
    } catch (e) { /* sin portapapeles, el usuario pega a mano */ }
  }
}

/** Confirmacion propia. Nada de confirm(), que bloquea el navegador. */
function ventanaConfirmar(titulo, detalle, etiqueta, alAceptar) {
  const fondo = document.createElement("div");
  fondo.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;" +
    "display:flex;align-items:center;justify-content:center;";
  const caja = document.createElement("div");
  caja.style.cssText = "background:#20282a;border:1px solid #3a4547;border-radius:10px;padding:20px;" +
    "width:min(440px,90vw);box-shadow:0 12px 48px rgba(0,0,0,.6);font-family:system-ui,sans-serif;color:#cfdadb;";
  const t = document.createElement("div");
  t.textContent = titulo;
  t.style.cssText = "font-size:15px;font-weight:600;color:#e8eeee;margin-bottom:6px;";
  const d = document.createElement("div");
  d.textContent = detalle;
  d.style.cssText = "font-size:12px;color:#8b9a9b;margin-bottom:16px;line-height:1.5;";
  const pie = document.createElement("div");
  pie.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";
  const mk = (txt, principal) => {
    const b = document.createElement("button");
    b.textContent = txt;
    b.style.cssText = "padding:8px 16px;border-radius:6px;border:1px solid #3a4547;cursor:pointer;font-size:13px;" +
      (principal ? "background:" + ACCENT + ";color:#12181a;font-weight:600;border-color:" + ACCENT + ";"
                 : "background:#2b3335;color:#cfdadb;");
    return b;
  };
  const no = mk("Cancelar", false), si = mk(etiqueta, true);
  pie.append(no, si);
  caja.append(t, d, pie);
  fondo.append(caja);
  document.body.append(fondo);
  si.focus();
  const cerrar = () => fondo.remove();
  no.onclick = cerrar;
  fondo.onclick = (e) => { if (e.target === fondo) cerrar(); };
  si.onclick = () => { cerrar(); alAceptar(); };
}

/** Si el portapapeles no deja escribir, mostramos la receta para copiarla a mano. */
function verInstruccion(texto) {
  ventanaPegar(() => {}, {
    titulo: "Instrucción para tu IA",
    ayuda: "Cópiala y pégala al inicio de la conversación con ChatGPT, Claude o la que uses.",
    valor: texto || instruccionConDuracion(),
    aceptar: "Cerrar",
    sinCasilla: true,
  });
}

async function consultarPrompt(node) {
  // Los valores conectados llegan al ejecutar el grafo; no se simulan aqui.
  const conectados = (node.inputs || []).filter((i) => i.link != null).map((i) => i.name);
  const campos = Object.fromEntries((node.widgets || [])
    .filter((w) => widgetSeGuarda(w) && !conectados.includes(w.name))
    .map((w) => [w.name, w.value]));
  const response = await api.fetchApi("/cineconia/prompt_preview", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(campos),
  });
  if (!response.ok) throw new Error("No se pudo preparar el prompt. Reinicia ComfyUI si acabas de actualizar.");
  return { ...(await response.json()), conectados };
}

function guiaInicialConectada(node) {
  const graph = node.graph;
  for (const id of node.outputs?.[0]?.links || []) {
    const link = graph?.links?.[id] || graph?.links?.get?.(id);
    const escena = graph?.getNodeById?.(link?.target_id);
    if ((escena?.comfyClass || escena?.type) !== "CineEscenaH3") continue;
    if (escena.inputs?.some((i) => i.name === "imagen_guia" && i.link != null)
        && Number(findWidget(escena, "fotograma_guia")?.value || 0) === 0) return true;
  }
  return false;
}

/**
 * Boton dibujado en el nodo. No se serializa.
 * La etiqueta puede ser texto fijo o una funcion(nodo) que la calcule en
 * cada repintado: asi el boton dice a que modelo pertenece la instruccion.
 * El widget que devuelve trae .avisar("texto"): pinta el boton en verde con
 * ese texto durante unos segundos y luego vuelve solo. Sirve para que se vea
 * que la accion ocurrio sin tener que ir a leer la linea de estado.
 */
const AVISO_MS = 2200;
const AVISO_BG = "#3f8e63";

function addBoton(node, etiqueta, fn) {
  const alto = 28;
  const state = { rect: null, sobre: false, aviso: null, hasta: 0 };
  const w = {
    type: "cineconia_boton",
    name: "__boton_" + Math.random().toString(36).slice(2, 7),
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) { return [width, alto + 8]; },
    draw(ctx, n, width, y) {
      const x = 10, ancho = width - 20;
      state.rect = { x, y: y + 4, w: ancho, h: alto };

      const queda = state.aviso ? state.hasta - Date.now() : 0;
      if (state.aviso && queda <= 0) state.aviso = null;
      const avisando = !!state.aviso;

      ctx.save();
      // el ultimo medio segundo se desvanece, para que no sea un salto seco
      ctx.globalAlpha = avisando && queda < 500 ? Math.max(0.35, queda / 500) : 1;
      ctx.fillStyle = avisando ? AVISO_BG : (state.sobre ? "#f0a154" : ACCENT);
      roundRect(ctx, x, y + 4, ancho, alto, 6);
      ctx.fill();
      ctx.fillStyle = CHIP_ON_FG;
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const puesta = typeof etiqueta === "function" ? (etiqueta(n) || "") : etiqueta;
      ctx.fillText(avisando ? state.aviso : puesta, x + ancho / 2, y + 4 + alto / 2 + 0.5);
      ctx.restore();
    },
    mouse(event, pos, n) {
      const r = state.rect;
      if (!r) return false;
      const dentro = pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.y && pos[1] <= r.y + r.h;
      if (event.type === "pointermove" || event.type === "mousemove") {
        if (state.sobre !== dentro) { state.sobre = dentro; n.setDirtyCanvas(true, true); }
        return false;
      }
      if ((event.type === "pointerdown" || event.type === "mousedown") && dentro) {
        const r = fn.call(n, n);
        // si la accion devuelve texto, se enseña en el propio boton
        if (typeof r === "string" && r) w.avisar(r, n);
        return true;
      }
      return false;
    },
  };

  w.avisar = function (texto, nodo) {
    state.aviso = texto;
    state.hasta = Date.now() + AVISO_MS;
    const n = nodo || node;
    n.setDirtyCanvas(true, true);
    // unos cuantos repintados para que el desvanecido se vea y el boton
    // vuelva solo aunque el usuario no mueva el raton
    for (const t of [AVISO_MS - 450, AVISO_MS - 250, AVISO_MS - 100, AVISO_MS + 60]) {
      setTimeout(() => n.setDirtyCanvas(true, true), t);
    }
  };

  node.widgets.push(w);
  return w;
}


// --- nodo Modelos: lista de descargas ------------------------------------

// Enlaces del pie. CANAL vacio = no se dibuja ese boton.
const CANAL = "";
const REPO = "https://github.com/chaLords/ComfyUI-Cine-con-IA";

const gb = (n) => (Number(n) || 0) >= 10 ? `${Math.round(n)} GB` : `${(Number(n) || 0).toFixed(2)} GB`;
const bytesGB = (n) => (Number(n) || 0) / 1e9;

async function pedirJSON(ruta, cuerpo) {
  const r = await api.fetchApi(ruta, cuerpo ? {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  } : { method: "GET" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

/**
 * La lista de archivos. Cada fila se puede marcar y desmarcar; las que ya
 * estan en disco salen apagadas y no se pueden marcar.
 */
function addListaModelos(node, estado) {
  const filaH = 34, pad = 10;
  const w = {
    type: "cineconia_modelos",
    name: "__modelos",
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) {
      const n = Math.max(1, estado.filas.length);
      return [width, 20 + n * filaH];
    },
    draw(ctx, n, width, y) {
      ctx.save();
      ctx.textBaseline = "middle";
      estado.rects = [];

      if (estado.cargando) {
        ctx.font = "11px 'IBM Plex Mono', Consolas, monospace";
        ctx.fillStyle = INFO_FG; ctx.textAlign = "left";
        ctx.fillText("consultando…", pad + 2, y + 18);
        ctx.restore(); return;
      }
      if (!estado.filas.length) {
        ctx.font = "11px 'IBM Plex Mono', Consolas, monospace";
        ctx.fillStyle = INFO_FG; ctx.textAlign = "left";
        ctx.fillText(estado.aviso || "sin archivos que mostrar", pad + 2, y + 18);
        ctx.restore(); return;
      }

      estado.filas.forEach((f, i) => {
        const fy = y + 10 + i * filaH;
        const tengo = f.tengo;
        const marcada = !tengo && estado.marcadas.has(f.familia + "#" + f.indice);
        const bajando = estado.enCurso === f.familia + "#" + f.indice;

        // fondo de la fila
        ctx.globalAlpha = tengo ? 0.34 : 1;
        ctx.fillStyle = marcada || bajando ? "#2b3a3c" : CHIP_BG;
        roundRect(ctx, pad, fy, width - pad * 2, filaH - 5, 5);
        ctx.fill();

        // barra de progreso dentro de la propia fila
        if (bajando && estado.progreso > 0) {
          ctx.fillStyle = ACCENT; ctx.globalAlpha = 0.28;
          roundRect(ctx, pad, fy, (width - pad * 2) * Math.min(1, estado.progreso), filaH - 5, 5);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // marca de estado
        ctx.textAlign = "center";
        ctx.font = "12px 'IBM Plex Mono', Consolas, monospace";
        ctx.fillStyle = tengo ? "#7fb08a" : (marcada || bajando ? ACCENT : "#5d6b6d");
        ctx.fillText(tengo ? "✓" : (bajando ? "↓" : (marcada ? "■" : "□")), pad + 14, fy + 14);

        // nombre y destino
        ctx.textAlign = "left";
        ctx.font = "11px 'IBM Plex Mono', Consolas, monospace";
        ctx.fillStyle = tengo ? "#8a9a9c" : CHIP_FG;
        const dcho = 76;
        let nom = f.nombre;
        const maxN = width - pad * 2 - 30 - dcho;
        if (ctx.measureText(nom).width > maxN) {
          while (nom.length > 6 && ctx.measureText(nom + "…").width > maxN) nom = nom.slice(0, -1);
          nom += "…";
        }
        ctx.fillText(nom, pad + 28, fy + 10);
        ctx.font = "9px 'IBM Plex Mono', Consolas, monospace";
        ctx.fillStyle = "#6f7d7e";
        ctx.fillText(`models/${f.carpeta}${f.esencial ? "" : "   ·   opcional"}`, pad + 28, fy + 22);

        // tamano
        ctx.textAlign = "right";
        ctx.font = "10px 'IBM Plex Mono', Consolas, monospace";
        ctx.fillStyle = tengo ? "#7a8a8c" : "#9fb0b2";
        ctx.fillText(bajando ? `${Math.round(estado.progreso * 100)}%` : gb(f.gb), width - pad - 10, fy + 14);

        ctx.globalAlpha = 1;
        estado.rects.push({ x: pad, y: fy, w: width - pad * 2, h: filaH - 5, fila: f });
      });
      ctx.restore();
    },
    mouse(event, pos, n) {
      if (event.type !== "pointerdown" && event.type !== "mousedown") return false;
      for (const r of estado.rects || []) {
        if (pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.y && pos[1] <= r.y + r.h) {
          if (r.fila.tengo || estado.trabajando) return true;
          const k = r.fila.familia + "#" + r.fila.indice;
          if (estado.marcadas.has(k)) estado.marcadas.delete(k); else estado.marcadas.add(k);
          n.setDirtyCanvas(true, true);
          return true;
        }
      }
      return false;
    },
  };
  node.widgets.push(w);
  return w;
}

/** Pie con el logo y los enlaces. */
function addPie(node) {
  const alto = 46, pad = 10;
  const state = { rects: [] };
  const w = {
    type: "cineconia_pie",
    name: "__pie",
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) { return [width, alto]; },
    draw(ctx, n, width, y) {
      ctx.save();
      ctx.strokeStyle = "#394446"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, y + 4.5); ctx.lineTo(width - pad, y + 4.5); ctx.stroke();

      if (LOGO_OK) {
        const h = 26, w2 = h * (LOGO.width / Math.max(1, LOGO.height));
        ctx.globalAlpha = 0.9;
        ctx.drawImage(LOGO, pad, y + 12, w2, h);
        ctx.globalAlpha = 1;
      }

      state.rects = [];
      ctx.textBaseline = "middle";
      ctx.font = "600 10px system-ui, sans-serif";
      let x = width - pad;
      const botones = [];
      if (CANAL) botones.push(["YouTube", CANAL]);
      botones.push(["GitHub", REPO]);
      for (const [etq, url] of botones.reverse()) {
        const bw = Math.ceil(ctx.measureText(etq).width) + 20;
        x -= bw;
        ctx.fillStyle = CHIP_BG;
        roundRect(ctx, x, y + 14, bw, 22, 4); ctx.fill();
        ctx.fillStyle = "#9fb0b2"; ctx.textAlign = "center";
        ctx.fillText(etq, x + bw / 2, y + 25.5);
        state.rects.push({ x, y: y + 14, w: bw, h: 22, url });
        x -= 6;
      }
      ctx.restore();
    },
    mouse(event, pos) {
      if (event.type !== "pointerdown" && event.type !== "mousedown") return false;
      for (const r of state.rects) {
        if (pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.y && pos[1] <= r.y + r.h) {
          window.open(r.url, "_blank", "noopener");
          return true;
        }
      }
      return false;
    },
  };
  node.widgets.push(w);
  return w;
}


app.registerExtension({
  name: "cineconia.ui",

  async beforeRegisterNodeDef(nodeType, nodeData) {
    const n = nodeData?.name;

    if (n === "CineRatioSize") {
      marcarNodo(nodeType);
      alCrear(nodeType, function () {
        etiquetar(this);
        addChips(this, "proporcion", RATIOS, "proporción");
        addChips(this, "tamano", TAM_MP, "megapíxeles", (nd) => esMP(findWidget(nd, "tamano")?.value));
        addChips(this, "tamano", TAM_LADO, "tamaño", (nd) => !esMP(findWidget(nd, "tamano")?.value));
        addInfo(this, (nd) => {
          const full = findWidget(nd, "proporcion")?.value;
          const short = RATIOS.find(([, f]) => f === full)?.[0] ?? "9:16";
          const ratio = RATIO_VAL[short] ?? 9 / 16;
          const tam = String(findWidget(nd, "tamano")?.value ?? "");
          const custom = findWidget(nd, "personalizado_mp")?.value ?? 0.3;
          const mult = findWidget(nd, "multiplo_de")?.value ?? 32;

          let w0, h0;
          if (!esMP(tam) && !tam.startsWith("personalizado")) {
            const lado = ultimoNumero(tam);
            if (ratio >= 1) { w0 = lado; h0 = lado / ratio; }
            else { h0 = lado; w0 = lado * ratio; }
          } else {
            const mp = tam.startsWith("personalizado") ? Number(custom) : (parseFloat(tam) || Number(custom));
            const total = Math.max(1, mp * 1e6);
            w0 = Math.sqrt(total * ratio);
            h0 = w0 / ratio;
          }
          const W = snap(w0, mult), H = snap(h0, mult);
          const rel = (W * H) / (416 * 736);
          return [
            `${W} x ${H} px  ·  ${((W * H) / 1e6).toFixed(2)} MP`,
            `x1.5: ${snap(W * 1.5, mult)} x ${snap(H * 1.5, mult)}   ·   x2: ${W * 2} x ${H * 2}`,
            `coste relativo a 416x736:  x${rel.toFixed(2)}`,
          ];
        });
      }, 340);
    }

    if (n === "CineDuracion") {
      marcarNodo(nodeType);
      alCrear(nodeType, function () {
        etiquetar(this);
        addChips(this, "segundos", SEGUNDOS.map((s) => [s + "s", s]), "duración");
        addChips(this, "fps", FPS_CHIPS, "fps");
        atarAvanzado(this, "avanzado", ["rejilla", "desfase", "minimo_fotogramas"]);
        addInfo(this, (nd) => {
          const s = findWidget(nd, "segundos")?.value ?? 0;
          const fpsRaw = String(findWidget(nd, "fps")?.value ?? "24");
          const fps = parseInt(fpsRaw, 10) || 24;
          const grid = findWidget(nd, "rejilla")?.value ?? 17;
          const off = findWidget(nd, "desfase")?.value ?? 5;
          const min = findWidget(nd, "minimo_fotogramas")?.value ?? 5;
          let f = Math.max(min, Math.round(s * fps));
          if (grid > 0) f = f + (((off - (f % grid)) % grid) + grid) % grid;
          const rango = f < 124 ? "⚠ bajo el rango de H3 (124-362): pierde calidad"
                      : f > 362 ? "⚠ sobre el rango de H3 (124-362)"
                      : fps === 24 ? "" : "nativo 24 fps · 48/60 interpolando";
          return [
            `${f} fotogramas  ·  ${fps} fps`,
            `duracion real ${(f / fps).toFixed(2)} s`,
            rango,
          ];
        });
      }, 330);
    }

    if (n === "CineModelos") {
      marcarNodo(nodeType);
      alCrear(nodeType, function () {
        etiquetar(this);
        const nodo = this;
        const estado = {
          filas: [], marcadas: new Set(), rects: [],
          cargando: true, trabajando: false, enCurso: null, progreso: 0,
          aviso: "", token: false,
        };

        const pestanas = addPestanas(this, "familia", ["Todas"].concat(MODELOS_CATALOGO));
        this.widgets.splice(this.widgets.indexOf(pestanas), 1);
        this.widgets.unshift(pestanas);

        const refrescar = async () => {
          estado.cargando = true;
          nodo.setDirtyCanvas(true, true);
          try {
            const familia = String(findWidget(nodo, "familia")?.value || "Todas");
            const extras = !!findWidget(nodo, "incluir_efectos")?.value;
            const opcionales = !!findWidget(nodo, "incluir_opcionales")?.value;
            const r = await pedirJSON("/cineconia/catalogo", { familia, extras });
            estado.token = !!r.token;
            estado.filas = (r.archivos || []).filter(
              (f) => opcionales || f.esencial || f.tengo);
            estado.aviso = "";
            // Viene marcado lo ESENCIAL que falta, que es lo que hace falta
            // para que la familia arranque. Lo opcional se ve pero no se
            // marca solo: nadie quiere empezar 60 GB sin haberlo pedido.
            estado.marcadas = new Set(
              estado.filas.filter((f) => !f.tengo && f.esencial)
                          .map((f) => f.familia + "#" + f.indice));
          } catch (e) {
            estado.filas = [];
            estado.aviso = "no se pudo consultar el catalogo (¿ComfyUI al dia?)";
          }
          estado.cargando = false;
          reajustar(nodo);
          nodo.setDirtyCanvas(true, true);
        };

        const lista = addListaModelos(this, estado);

        const marcadas = () => estado.filas.filter(
          (f) => !f.tengo && estado.marcadas.has(f.familia + "#" + f.indice));

        const etiquetaBoton = () => {
          if (estado.trabajando) return "Cancelar la descarga";
          const q = marcadas();
          if (!q.length) {
            return estado.filas.some((f) => !f.tengo)
              ? "Marca lo que quieras bajar" : "No falta nada";
          }
          return `Descargar ${q.length}  ·  ${gb(q.reduce((a, f) => a + f.gb, 0))}`;
        };

        addBoton(this, etiquetaBoton, async () => {
          if (estado.trabajando) {
            await pedirJSON("/cineconia/cancelar", {});
            return;
          }
          const quiero = marcadas();
          if (!quiero.length) return;
          const total = quiero.reduce((a, f) => a + f.gb, 0);
          const ok = window.confirm(
            `Se van a descargar ${quiero.length} archivos, ${gb(total)} en total.\n\n` +
            quiero.slice(0, 10).map((f) => `  ${f.nombre}\n     -> models/${f.carpeta}`).join("\n") +
            (quiero.length > 10 ? `\n  …y ${quiero.length - 10} mas` : "") +
            `\n\nSe guardan solos en su carpeta. Puedes seguir usando ComfyUI.`);
          if (!ok) return;
          try {
            await pedirJSON("/cineconia/descargar", {
              archivos: quiero.map((f) => ({ familia: f.familia, indice: f.indice })),
            });
            estado.trabajando = true;
            vigilar();
          } catch (e) {
            estado.aviso = "no se pudo empezar: " + e.message;
            nodo.setDirtyCanvas(true, true);
          }
        });

        let reloj = null;
        const vigilar = () => {
          if (reloj) return;
          reloj = setInterval(async () => {
            let p;
            try { p = await pedirJSON("/cineconia/progreso"); }
            catch (e) { return; }
            estado.trabajando = !!p.trabajando;
            if (p.actual) {
              estado.enCurso = p.actual.familia + "#" + p.actual.indice;
              estado.progreso = p.actual.total ? p.actual.hechos / p.actual.total : 0;
            } else {
              estado.enCurso = null; estado.progreso = 0;
            }
            if (p.error) estado.aviso = p.error;
            if (!p.trabajando) {
              clearInterval(reloj); reloj = null;
              estado.enCurso = null; estado.progreso = 0;
              await refrescar();
            }
            nodo.setDirtyCanvas(true, true);
          }, 1000);
        };

        addInfo(this, () => {
          if (estado.aviso) return ["", estado.aviso, ""];
          const faltan = estado.filas.filter((f) => !f.tengo);
          if (estado.trabajando) return ["descargando…", "se guardan solos en su carpeta", ""];
          if (!faltan.length) return ["todo listo", "no falta ningun archivo de esta familia", ""];
          return [
            `faltan ${faltan.length} archivos  ·  ${gb(faltan.reduce((a, f) => a + f.gb, 0))}`,
            "cada uno se guarda en la carpeta que le toca",
            estado.token ? "" : "LTX-2.5 pide aceptar su licencia y un token de Hugging Face",
          ];
        });

        addPie(this);

        for (const nm of ["familia", "incluir_opcionales", "incluir_efectos"]) {
          const w = findWidget(this, nm);
          if (!w) continue;
          const antes = w.callback;
          w.callback = function () { const r = antes?.apply(this, arguments); refrescar(); return r; };
        }
        setTimeout(refrescar, 50);
      }, 470);
    }

    if (n === "CineCargarH3") {
      marcarNodo(nodeType);
      alCrear(nodeType, function () {
        etiquetar(this);
        const nodo = this;

        // --- perfil de modelo -------------------------------------------
        // El control de verdad es el ultimo widget del nodo, porque los
        // valores se guardan por posicion y meterlo arriba dejaria ilegible
        // cualquier workflow ya guardado. Asi que se esconde y lo que se ve
        // arriba son estas pestanas, que no se guardan y solo escriben en el.
        const perfil = findWidget(this, "perfil");
        if (perfil) {
          if (!PERFILES_UI.includes(String(perfil.value))) {
            perfil.value = PERFIL_POR_DEFECTO_UI;
          }
          verWidget(perfil, false);

          const pest = addPestanas(this, "perfil", PERFILES_UI);
          const ficha = addInfo(this, (nd) => {
            const nombre = String(findWidget(nd, "perfil")?.value || PERFIL_POR_DEFECTO_UI);
            const p = PERFILES_CARGA_UI[nombre];
            if (!p) {
              return [
                "perfil: Personalizado",
                "no toca nada de lo de abajo",
                "la familia se deduce por el nombre de los archivos",
              ];
            }
            const flojos = CAMPOS_ARCHIVO.filter((c) => {
              if (c === "vae_audio" && nombre !== "MiniMax H3") return false;
              return !archivoYaEncaja(c, findWidget(nd, c)?.value, nombre);
            });
            return [
              "perfil: " + nombre,
              p.resumen,
              flojos.length
                ? "⚠ no parece de este perfil: " + flojos.map((c) => ETIQUETAS[c] || c).join(", ")
                : "",
            ];
          });
          ficha.name = "__info_perfil";   // el otro __info es el de la cadena de LoRA

          // las pestanas y su ficha van arriba del todo, delante de "Modelo"
          for (const w of [pest, ficha]) {
            const i = this.widgets.indexOf(w);
            if (i >= 0) this.widgets.splice(i, 1);
          }
          this.widgets.unshift(pest, ficha);

          // Al elegir perfil se proponen los archivos y los numeros de esa
          // familia. Lo que ya encajaba con el perfil nuevo no se toca: si
          // alguien eligio a mano un modelo raro de Wan, sigue siendo suyo.
          const aplicarPerfil = () => {
            const nombre = String(perfil.value);
            const p = PERFILES_CARGA_UI[nombre];
            if (p) {
              for (const campo of CAMPOS_ARCHIVO) {
                const w = findWidget(nodo, campo);
                if (!w || archivoYaEncaja(campo, w.value, nombre)) continue;
                const elegido = archivoQueEncaja(campo, w.options?.values, nombre);
                if (elegido) w.value = elegido;
              }
              for (const campo of Object.keys(p.valores)) {
                const w = findWidget(nodo, campo);
                if (w) w.value = p.valores[campo];
              }
            }
            reajustar(nodo);
            nodo.setDirtyCanvas(true, true);
          };
          const antesPerfil = perfil.callback;
          perfil.callback = function () {
            const r = antesPerfil?.apply(this, arguments);
            aplicarPerfil();
            return r;
          };
          // Al abrir un workflow guardado NO se rellena nada: los valores que
          // trae el workflow mandan sobre lo que propondria el perfil.
          const confPerfil = this.onConfigure;
          this.onConfigure = function () {
            const r = confPerfil?.apply(this, arguments);
            setTimeout(() => { verWidget(findWidget(nodo, "perfil"), false); reajustar(nodo); }, 0);
            return r;
          };
        }

        addChips(this, "trocear_atencion", [1, 4, 8, 16, 32].map((v) => [String(v), v]), "attention");
        addChips(this, "trocear_ffn", [1, 4, 8, 16, 32].map((v) => [String(v), v]), "ffn");

        // --- cadena de LoRA: solo se ven las ranuras usadas, mas una vacia
        // OJO: aqui NO se reordenan los widgets de verdad. Los valores se
        // guardan por posicion, y moverlos dejaria ilegibles los workflows
        // que ya estan guardados. Por eso "Vista previa" queda en medio de
        // la cadena: es feo y es a proposito.
        addTitulo(this, "lora", "loRA  ·  se aplican en orden",
                  "Cada uno sobre el resultado del anterior. Suman VRAM.");
        const cadena = addInfo(this, (nd) => {
          const usados = [];
          for (let i = 1; i <= 4; i++) {
            const v = String(findWidget(nd, i === 1 ? "lora" : "lora_" + i)?.value || "ninguno");
            if (v === "ninguno") continue;
            const f = findWidget(nd, i === 1 ? "lora_fuerza" : "lora_fuerza_" + i)?.value ?? 0;
            usados.push(v.split("\\").pop().split("/").pop().replace(".safetensors", "") + " x" + f);
          }
          if (!usados.length) return ["sin LoRA", "el modelo va tal cual viene", ""];
          const aviso = usados.length > 1
            ? "⚠ cada LoRA suma VRAM: vigila el s/it del refinado" : "";
          return ["cadena de " + usados.length + " LoRA:", cortar(usados.join("  →  "), 58), aviso];
        });


        // la ranura N+1 solo aparece cuando la N esta usada
        const verCadena = () => {
          normalizarLoras(this);
          let previo = true;
          for (let i = 1; i <= 4; i++) {
            const n1 = i === 1 ? "lora" : "lora_" + i;
            const n2 = i === 1 ? "lora_fuerza" : "lora_fuerza_" + i;
            const w1 = findWidget(this, n1), w2 = findWidget(this, n2);
            const usado = String(w1?.value || "ninguno") !== "ninguno";
            if (w1) w1.__cineLoraAnterior = String(w1.value || "ninguno");
            verWidget(w1, previo);            // se ve si la anterior esta puesta
            // La fuerza de la ranura 1 NO se esconde nunca: es la unica que
            // sigue siendo obligatoria en Python, y un obligatorio escondido
            // es lo que provoco el "Entrada invalida". Las demas son
            // opcionales y se pueden esconder sin riesgo.
            verWidget(w2, i === 1 ? true : (previo && usado));
            previo = previo && usado;
          }
          reajustar(this);
        };
        for (let i = 1; i <= 4; i++) {
          const w = findWidget(this, i === 1 ? "lora" : "lora_" + i);
          if (!w) continue;
          w.__cineLoraAnterior = String(w.value || "ninguno");
          const antes = w.callback;
          w.callback = function () {
            const r = antes?.apply(this, arguments);
            const anterior = w.__cineLoraAnterior;
            const actual = String(w.value || "ninguno");
            const fuerza = findWidget(
              nodo,
              i === 1 ? "lora_fuerza" : "lora_fuerza_" + i,
            );
            if (fuerza) {
              if (loraVacia(actual)) fuerza.value = 0;
              else if (loraVacia(anterior) && Number(fuerza.value) === 0) fuerza.value = 0.75;
            }
            w.__cineLoraAnterior = actual;
            verCadena();
            return r;
          };
        }
        const conf = this.onConfigure;
        this.onConfigure = function () {
          const r = conf?.apply(this, arguments);
          setTimeout(verCadena, 0);
          return r;
        };
        verCadena();
      }, 420);
    }

    if (n === "CineEscenaH3") {
      marcarNodo(nodeType);
      alCrear(nodeType, function () {
        etiquetar(this);
        // dos condicionamientos: uno por pase
        const et = ["positive · render", "positive · escalar"];
        (this.outputs || []).forEach((o, i) => { if (et[i]) o.label = et[i]; });
        addChips(this, "tamano_referencia", [
          ["identidad", "max  ·  mas identidad"],
          ["rapidez", "match  ·  mas rapido"],
        ], "calidad de las referencias");
        addInfo(this, (nd) => {
          const w = Number(findWidget(nd, "width")?.value ?? 0);
          const h = Number(findWidget(nd, "height")?.value ?? 0);
          const l = Number(findWidget(nd, "length")?.value ?? 0);
          return [
            `${w} x ${h} px  ·  ${l} fotogramas`,
            `${(l / 24).toFixed(2)} s a 24 fps`,
            l < 124 ? "⚠ bajo el rango de H3 (124-362): pierde calidad" : "",
          ];
        });
      }, 420);
    }

    if (n === "CineRenderH3") {
      marcarNodo(nodeType);
      alCrear(nodeType, function () {
        etiquetar(this);
        // en este nodo "pasos" son los del primer pase, no los del refinado
        const wp = findWidget(this, "pasos");
        if (wp) wp.label = "Pasos";
        addChips(this, "pasos", [4, 6, 8, 10, 12].map((v) => [String(v), v]), "pasos");
        addProgreso(this, "primer pase", (nd) =>
          Number(findWidget(nd, "pasos")?.value ?? 0));
      }, 420);
    }

    if (n === "CineEscalarRefinar") {
      marcarNodo(nodeType);
      alCrear(nodeType, function () {
        etiquetar(this);
        addChips(this, "escala", ESCALAS, "escala",
          (nd) => !!findWidget(nd, "activar")?.value);
        addInfo(this, (nd) => {
          if (!findWidget(nd, "activar")?.value) return ["escalado apagado", "el latente pasa de largo"];
          const e = Number(findWidget(nd, "escala")?.value ?? 2);
          const p = String(findWidget(nd, "pasos")?.value ?? "").split("·")[0].trim();
          return [
            `escala x${e}  ·  ${p}`,
            `coste del refinado:  x${(e * e).toFixed(2)} respecto al primer pase`,
            e >= 1.9 ? "⚠ con 16 GB, x1.9 o más puede colgar el equipo" : "",
          ];
        });
        addProgreso(this, "refinado", (nd) =>
          Number.parseInt(String(findWidget(nd, "pasos")?.value ?? "0"), 10) || 0);
      }, 420);
    }

    if (n === "CineSalida") {
      marcarNodo(nodeType);
      alCrear(nodeType, function () {
        etiquetar(this);
        addInfo(this, (nd) => {
          const i = String(findWidget(nd, "interpolar")?.value ?? "no");
          const base = Number(findWidget(nd, "fps_base")?.value ?? 24);
          const m = i.startsWith("x") ? parseInt(i[1], 10) : 1;
          return [
            `${base} fps  ->  ${base * m} fps`,
            m > 1 ? `interpolación x${m}` : "sin interpolación",
            "conecta 'video' a Guardar Video",
          ];
        });
      }, 420);
    }

    if (n === "CinePrompt6") {
      marcarNodo(nodeType);
      alCrear(nodeType, function () {
        etiquetar(this);
        this.__cargaP6 = null;

        // a que pestana pertenece cada campo declarado en Python
        grupoPorNombre(this, SECCIONES_H3.concat(["omitir_vacias", "reglas_de_oficio"]), "h3");
        // ltx_negativo queda declarado pero fuera de la pestana: LTX no usa
        // prompt negativo. Se guarda por si algun modelo futuro lo necesita.
        grupoPorNombre(this, ["ltx_prompt", "ltx_audio"], "ltx");
        grupoPorNombre(this, ["ltx_negativo"], "sin_uso");
        grupoPorNombre(this, ["libre_prompt", "libre_extra", "libre_separador",
                              "libre_instruccion"], "libre");
        for (const perfil of Object.values(PERFILES_PROMPT)) {
          grupoPorNombre(this, Object.values(perfil.secciones), perfil.grupo);
        }
        grupoPorNombre(this, ["plano", "angulo", "movimiento", "camara"], "camara");
        grupoPorNombre(this, ["intensidad"], "h3");   // amplitud y velocidad son de MiniMax

        // un titulo encima de cada caja, para saber que va en cada una
        for (const [sec, tit, ayuda] of TITULOS_P6) grupo(addTitulo(this, sec, tit, ayuda), "h3");
        grupo(addTitulo(this, "ltx_prompt", "prompt  ·  un párrafo continuo, 4-8 frases",
                        "Orden: plano, escena, acción, personajes, cámara, sonido."), "ltx");
        grupo(addTitulo(this, "ltx_audio", "sonido y diálogo",
                        "Se añade al final del mismo párrafo. El diálogo, entre comillas."), "ltx");
        grupo(addTitulo(this, "libre_prompt", "libre  ·  para cualquier modelo",
                        "Aquí no se toca nada: sale tal cual lo escribes."), "libre");
        grupo(addTitulo(this, "libre_instruccion", "tu receta para la ia",
                        "El botón de copiar copia esto, no la guía de MiniMax."), "libre");
        for (const perfil of Object.values(PERFILES_PROMPT)) {
          for (const [sec, tit, ayuda] of perfil.titulos) {
            grupo(addTitulo(this, sec, tit, ayuda), perfil.grupo);
          }
        }

        // el bloque de camara: listas visibles a modo de guia de tomas
        grupo(addTitulo(this, "plano", "cámara", "Elige la toma. Se escribe sola, en inglés."), "camara");
        grupo(reubicar(this, addChips(this, "plano", PLANOS_CHIPS, null, null,
          (nd, v) => tomaUsada(nd, "plano", v)), "plano"), "camara");
        grupo(reubicar(this, addChips(this, "angulo", ANGULOS_CHIPS, null, null,
          (nd, v) => tomaUsada(nd, "angulo", v)), "angulo"), "camara");
        grupo(reubicar(this, addChips(this, "movimiento", MOVIMIENTOS_CHIPS, null, null,
          (nd, v) => tomaUsada(nd, "movimiento", v)), "movimiento"), "camara");
        grupo(reubicar(this, addBoton(this, "🎥  Cambiar la toma en el texto", function (nd) {
          const frase = fraseCamara(nd).trim();
          if (!frase) return "⚠ Elige al menos un plano, ángulo o movimiento";
          ponerTexto(findWidget(nd, "camara"), frase);
          const n = apuntarToma(nd);
          nd.__camara = { hechos: ["caja de cámara"], frase };
          nd.setDirtyCanvas(true, true);
          return `✓ Toma ${n} escrita en Cámara`;
        }), "camara"), "h3");


        grupo(reubicar(this, addInfo(this, (nd) => {
          const r = nd.__camara;
          const hechas = tomasDe(nd).length;
          const cuenta = hechas ? `   ·   ${hechas} toma${hechas > 1 ? "s" : ""} rodada${hechas > 1 ? "s" : ""}` : "";
          if (r) {
            nd.__camara = null;
            if (r.error) return ["⚠ " + r.error, "", ""];
            return ["✓ texto reescrito: " + r.hechos.join(", ") + cuenta,
                    cortar(r.frase || camaraEnTexto(nd), 58),
                    "se aplicará al construir el prompt final"];
          }
          const enTexto = camaraEnTexto(nd);
          const mano = String(findWidget(nd, "camara")?.value || "").trim();
          const chips = fraseCamara(nd);

          if (guiaInicialConectada(nd)) return [
            "⚠ imagen guía fija la composición del fotograma 0",
            "otro ángulo inicial requiere una guía con esa vista",
            "puedes pedir un movimiento hacia el nuevo ángulo",
          ];

          // La caja ya NO anula las listas: al construir el prompt, el plano,
          // el angulo y el movimiento se sustituyen dentro de ella y el resto
          // de lo que escribio se respeta. Decir aqui "manda sobre las listas"
          // era mentira, y esa mentira costo un render frontal y quieto.
          if (mano) return ["caja de cámara  +  las listas se aplican encima",
                            cortar(mano, 58),
                            "plano, ángulo y movimiento salen de los chips"];
          if (enTexto && chips) {
            return ["las listas se aplican al generar el prompt",
                    "usa Ver prompt final para revisar el resultado",
                    "🎥 también actualiza el texto editable"];
          }
          if (enTexto) return ["✓ cámara leída de la sección 4" + cuenta,
                               cortar(enTexto, 58),
                               hechas ? "los chips atenuados ya los usaste"
                                      : "cambia una lista y pulsa 🎥 para otra toma"];
          if (chips) return ["se añadirá a la sección 4:"].concat(partir(chips, 58)).slice(0, 3);
          return ["sin instrucción de cámara en ninguna parte",
                  "el modelo la decide por su cuenta", ""];
        }), "camara"), "camara");

        const bCopiar = addBoton(this, (nd) => {
          const cual = String(findWidget(nd, "modelo")?.value || "MiniMax H3");
          if (cual === "Libre") return "📄  Copiar TU instrucción para tu IA";
          return "📄  Copiar instrucción para tu IA  ·  " + cual;
        }, function (nd) {
          const ok = () => {
            nd.__cargaP6 = { copiado: true, puestas: [], fallidas: [], vaciadas: [] };
            bCopiar.avisar("✓   Copiado  ·  pégalo en tu IA", nd);
          };
          // el portapapeles es asincrono: el aviso se da cuando de verdad
          // se copio, no cuando se pulsa. Si falla, se abre la ventana para
          // copiar a mano y no se miente diciendo que se copio.
          const cual = String(findWidget(nd, "modelo")?.value || "MiniMax H3");
          let texto = instruccionConDuracion();
          if (cual === "LTX-2.5") texto = INSTRUCCION_LTX;
          if (PERFILES_PROMPT[cual]) texto = PERFILES_PROMPT[cual].instruccion;
          if (cual === "Libre") {
            texto = String(findWidget(nd, "libre_instruccion")?.value || "").trim();
            if (!texto) return "⚠   Escribe tu receta en 'Tu instrucción para la IA'";
          }
          try {
            navigator.clipboard.writeText(texto).then(ok).catch(() => verInstruccion(texto));
          } catch (e) { verInstruccion(texto); }
        });
        const bPegar = addBoton(this, (nd) => {
          const cual = String(findWidget(nd, "modelo")?.value || "MiniMax H3");
          return cual === "MiniMax H3" ? "📋  Pegar prompt y repartir en los apartados"
                                       : "📋  Pegar prompt  ·  " + cual;
        }, function (nd) {
          const cual = String(findWidget(nd, "modelo")?.value || "MiniMax H3");
          // LTX y Libre reciben un párrafo ya terminado. Los perfiles con
          // receta propia se reparten más abajo en sus campos revisables.
          if (cual === "LTX-2.5" || cual === "Libre") {
            const destino = cual === "LTX-2.5" ? "ltx_prompt" : "libre_prompt";
            ventanaPegar((texto) => {
              if (!texto || !texto.trim()) return;
              ponerTexto(findWidget(nd, destino), texto.trim());
              nd.__cargaP6 = { puestas: [destino], fallidas: [], vaciadas: [], leidos: 0 };
              bPegar.avisar("✓   Pegado en " + (ETIQUETAS[destino] || destino), nd);
            }, { sinCasilla: true });
            return;
          }
          const perfil = PERFILES_PROMPT[cual];
          if (perfil) {
            ventanaPegar((texto, vaciar) => {
              if (!texto || !texto.trim()) return;
              const partes = parsearPerfil(texto, perfil);
              const puestas = [], fallidas = [], vaciadas = [];
              const hubo = Object.keys(partes).length > 0;
              for (const [sec, nombreWidget] of Object.entries(perfil.secciones)) {
                const w = findWidget(nd, nombreWidget);
                if (partes[sec] === undefined) {
                  // El modo conserva su valor predeterminado si la IA lo
                  // omite; los campos de texto sí pueden vaciarse al pedirlo.
                  if (vaciar && hubo && sec !== "mode" && w && String(w.value || "").trim()) {
                    ponerTexto(w, "");
                    vaciadas.push(nombreWidget);
                  }
                  continue;
                }
                if (!w) { fallidas.push(nombreWidget); continue; }
                ponerTexto(w, limpiarValorPerfil(sec, partes[sec]));
                puestas.push(nombreWidget);
              }
              nd.__cargaP6 = {
                puestas, fallidas, vaciadas, leidos: 0,
                esperadas: Object.keys(perfil.secciones).length,
                modelo: cual, total: texto.length,
              };
              bPegar.avisar(puestas.length
                ? `✓   ${puestas.length} de ${Object.keys(perfil.secciones).length} apartados rellenados`
                : "⚠   No se reconoció ningún apartado", nd);
              console.log("[CineConIA] perfil", cual, "| rellenadas:", puestas,
                          "| vaciadas:", vaciadas, "| fallidas:", fallidas);
            });
            return;
          }
          ventanaPegar((texto, vaciar) => {
            if (!texto || !texto.trim()) return;
            const partes = parsearPrompt(texto);
            const puestas = [], fallidas = [], vaciadas = [];
            const hubo = SECCIONES_P6.some((x) => partes[x] !== undefined);
            for (const sec of SECCIONES_P6) {
              const w = findWidget(nd, sec);
              if (partes[sec] === undefined) {
                if (vaciar && hubo && w && String(w.value || "").trim()) {
                  ponerTexto(w, "");
                  vaciadas.push(sec);
                }
                continue;
              }
              if (!w) { fallidas.push(sec); continue; }
              ponerTexto(w, partes[sec]);
              puestas.push(sec);
            }
            // los chips pasan a reflejar la camara que eligio la IA
            const leidos = chipsDesdeTexto(nd);
            // prompt nuevo = escena nueva: las tomas de la anterior ya no valen
            if (nd.properties) nd.properties.tomasUsadas = [];
            nd.__cargaP6 = { puestas, fallidas, vaciadas, leidos, total: texto.length };
            bPegar.avisar(puestas.length
              ? `✓   ${puestas.length} de ${SECCIONES_P6.length} apartados rellenados`
              : "⚠   No se reconoció ningún apartado", nd);
            console.log("[CineConIA] rellenadas:", puestas, "| vaciadas:", vaciadas, "| fallidas:", fallidas);
          });
        });
        const bPreview = addBoton(this, "🔎  Ver prompt final · sin generar video", function (nd) {
          consultarPrompt(nd).then((result) => {
            const aviso = result.conectados.length
              ? "Vista parcial: faltan los valores conectados de " + result.conectados.join(", ") + "."
              : "Texto construido por el mismo código que se usa al ejecutar este nodo.";
            ventanaPegar(() => {}, {
              titulo: "Prompt final",
              ayuda: aviso + (guiaInicialConectada(nd)
                ? " La imagen guía fija la composición inicial; el texto no garantiza un cambio de ángulo." : ""),
              valor: result.prompt + (result.negative ? "\n\nNEGATIVE:\n" + result.negative : ""),
              aceptar: "Cerrar", sinCasilla: true,
            });
          }).catch((error) => ventanaPegar(() => {}, {
            titulo: "Vista previa no disponible", ayuda: error.message,
            valor: "", aceptar: "Cerrar", sinCasilla: true,
          }));
          return "Preparando vista previa…";
        });
        const bVaciar = addBoton(this, "🧹  Vaciar todos los apartados", function (nd) {
          const cual = String(findWidget(nd, "modelo")?.value || "MiniMax H3");
          const perfil = PERFILES_PROMPT[cual];
          const campos = perfil
            ? Object.entries(perfil.secciones).filter(([sec]) => sec !== "mode").map(([, w]) => w)
            : cual === "MiniMax H3" ? SECCIONES_P6
            : cual === "LTX-2.5" ? ["ltx_prompt", "ltx_audio", "camara"]
            : ["libre_prompt", "libre_extra"];
          const llenas = campos.filter((sec) => {
            const w = findWidget(nd, sec);
            return w && String(w.value || "").trim();
          });
          if (!llenas.length) {
            nd.__cargaP6 = { vacio: true, puestas: [], fallidas: [], vaciadas: [] };
            return "·   Ya estaba todo vacío";
          }
          ventanaConfirmar(
            "¿Vaciar todos los apartados?",
            "Se borrará el texto de " + llenas.length + " apartado(s), la caja de cámara incluida. " +
            "No se puede deshacer.",
            "Vaciar",
            () => {
              for (const sec of llenas) ponerTexto(findWidget(nd, sec), "");
              if (nd.properties) nd.properties.tomasUsadas = [];
              nd.__cargaP6 = { vaciadoManual: llenas.length, puestas: [], fallidas: [], vaciadas: [] };
              bVaciar.avisar(`✓   ${llenas.length} apartados vaciados`, nd);
              console.log("[CineConIA] vaciadas a mano:", llenas);
            });
        });
        const infoCarga = addInfo(this, (nd) => {
          const c = nd.__cargaP6;
          const extraCon = (nd.inputs || []).some((i) => i.name === "extra" && i.link != null);
          const avisoExtra = extraCon
            ? "⚠ 'extra' conectado: ese texto va a TODOS tus prompts" : "";
          if (!c) return ["", "1) copia la instrucción   2) pega aquí la respuesta", avisoExtra];
          if (c.vacio) return ["ya estaba todo vacío", "", avisoExtra];
          if (c.vaciadoManual) return [`vaciados ${c.vaciadoManual} apartados`,
                                       "listo para un llenado nuevo", avisoExtra];
          if (c.copiado) {
            const cual = String(findWidget(nd, "modelo")?.value || "MiniMax H3");
            if (cual !== "MiniMax H3") {
              return ["instrucción de " + cual + " copiada al portapapeles",
                      PERFILES_PROMPT[cual]
                        ? "basada en su guía oficial y preparada para separar campos"
                        : "pégala al inicio de tu conversación con la IA",
                      "cuando termine, pega aquí su respuesta"];
            }
            const d = duracionDelGrafo();
            return ["instrucción copiada al portapapeles",
                    d ? `incluye la duración: ${d.segundos.toFixed(2)} s (${d.fotogramas} fotogramas)`
                      : "sin nodo Duración en el workflow: no incluye la duración",
                    "pégala al inicio de tu conversación con la IA"];
          }
          if (!c.puestas.length) {
            return ["⚠ no se reconoció ninguna sección",
                    "revisa los encabezados del texto pegado", ""];
          }
          const vac = c.vaciadas && c.vaciadas.length;
          return [
            `última carga: ${c.puestas.length}/${c.esperadas || SECCIONES_P6.length} apartados` + (vac ? `  ·  ${vac} vaciadas` : ""),
            c.puestas.join(", ").slice(0, 46),
            c.fallidas.length ? "no se pudo escribir en: " + c.fallidas.join(", ") : avisoExtra,
          ];
        });

        // El orden en que se usa el nodo: primero se copia la instruccion,
        // luego se pega lo que devuelve la IA, y solo entonces hay algo que
        // mirar en los apartados. Por eso esos dos suben arriba del todo.
        // Vaciar se queda abajo a proposito: borra y no tiene vuelta atras.
        alPrincipio(this, infoCarga);
        alPrincipio(this, bPreview);
        alPrincipio(this, bPegar);
        alPrincipio(this, bCopiar);

        // --- la fila de pestanas, lo primero de todo ---------------------
        const sel = findWidget(this, "modelo");
        if (sel) {
          verWidget(sel, false);                       // el combo sobra: mandan las pestanas
          alPrincipio(this, addPestanas(this, "modelo", MODELOS_UI));
          // sin titulos por pestana: la pestana encendida ya dice el modelo,
          // y repetirlo en el titulo ataba el nodo a un modelo concreto
          atarPestanas(this, "modelo", {
            "MiniMax H3": ["h3", "camara"],
            "LTX-2.5": ["ltx", "camara"],
            "Wan 2.2": ["wan"],
            "Hunyuan 1.5": ["hunyuan"],
            "CogVideoX 1.5": ["cog"],
            "Mochi 1": ["mochi"],
            "Libre": ["libre"],
          });
        }
      }, 820);
    }
  },
});
