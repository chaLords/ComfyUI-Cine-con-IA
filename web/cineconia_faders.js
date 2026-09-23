import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { TOMAS_H3, conjugarTomaH3, PRONOMBRES_H3, huecosH3 } from "./cineconia.js";

/**
 * Interfaz de los nodos H3 nuevos: logo, chips, faders y barra de carga.
 *
 * ComfyUI registra esta extension desde WEB_DIRECTORY. Comparte las recetas
 * con el Prompt completo; los perfiles y el calculo de memoria viven solo
 * en Python. Los widgets visuales nunca se guardan como valores del nodo.
 */

const ACCENT = "#e08a3c";
const ACCENT_CLARO = "#f0a154";
const CHIP_BG = "#2b3335";
const CHIP_FG = "#9fb0b0";
const CHIP_ON_FG = "#12181a";
const INFO_FG = "#8fb9b3";
const ETQ_FG = "#6f7d7e";
const LINEA = "#394446";
const POMO = "#e8eeee";
const BORDE_POMO = "#12181a";
const BARRA_BG = "#20282a";
const VERDE = "#3f8e63";
const TEXTO_TENUE = "#8b9a9b";

const MONO = "'IBM Plex Mono', Consolas, monospace";

const PAD = 10;
const CHIP_H = 22;
const GAP = 5;
const CAB = 17;
const FADER_H = 26;
const ANCHO_ETQ = 82;
const ANCHO_LEC = 112;
const RIEL_H = 4;
const POMO_R = 5;
const ANIM_MS = 200;
const LOGO_H = 38;

const NODOS_H3 = [
  "CineH3Optimizer",
  "CineH3OptimizedSampler",
  "CineScenePromptH3",
  "CineSimplePromptH3",
  "CineCameraDirectorH3",
];

const ORDEN_PERFILES = ["AUTO", "8 GB", "12 GB", "16 GB", "24 GB", "32 GB"];
const MODOS = [["guiado", "Auto"], ["avanzado", "Advanced"]];

const findWidget = (node, name) => node?.widgets?.find((w) => w.name === name);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const valor = (node, name, porDefecto = 0) => Number(findWidget(node, name)?.value ?? porDefecto);

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Oculta un widget nativo conservando su valor.
 *
 * Mismo mecanismo que verWidget() de cineconia.js: hay que apagarlo en tres
 * sitios porque el frontend dibuja cada clase de widget por un camino
 * distinto -- el tipo, el metodo draw y la marca hidden -- y ademas el
 * elemento del DOM si es una caja de texto. Tocar solo uno deja widgets
 * fantasma pisandose.
 */
function ocultar(w) {
  if (!w || w.__tipo !== undefined) return;
  const el = w.inputEl || w.element || w.domElement || null;
  if (el && el.style) {
    if (w.__display === undefined) w.__display = el.style.display;
    el.style.display = "none";
  }
  w.hidden = true;
  w.__tipo = w.type;
  w.__computeSize = w.computeSize;
  w.__draw = w.draw;
  w.type = "cineconia_oculto";
  w.computeSize = () => [0, 0];
  w.draw = () => {};
}

/** Los widgets puramente visuales nunca deben ocupar una posicion guardada. */
function widgetSeGuarda(w) {
  return Boolean(w) && w.serialize !== false && w.options?.serialize !== false;
}

function cabecera(ctx, titulo, width, y) {
  ctx.font = "9px " + MONO;
  ctx.textAlign = "left";
  ctx.fillStyle = ETQ_FG;
  const etq = titulo.toUpperCase();
  ctx.fillText(etq, PAD, y);
  const tw = ctx.measureText(etq).width;
  ctx.strokeStyle = LINEA;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD + tw + 8, y + 0.5);
  ctx.lineTo(width - PAD, y + 0.5);
  ctx.stroke();
}

// --- logo -----------------------------------------------------------------

const LOGO = new Image();
let LOGO_OK = false;
LOGO.onload = () => { LOGO_OK = true; app.graph?.setDirtyCanvas(true, true); };
LOGO.src = new URL("./logo.png", import.meta.url).href;
const LOGO_RATIO = 213 / 132;

function addLogo(node) {
  const w = {
    type: "cineconia_logo",
    name: "__logo",
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) { return [width, LOGO_H + 6]; },
    draw(ctx, n, width, y) {
      if (!LOGO_OK) return;
      const ratio = LOGO.width && LOGO.height ? LOGO.width / LOGO.height : LOGO_RATIO;
      ctx.save();
      ctx.drawImage(LOGO, PAD + 1, y + 2, LOGO_H * ratio, LOGO_H);
      ctx.restore();
    },
  };
  node.widgets.push(w);
  return w;
}

// --- chips ----------------------------------------------------------------

/**
 * Fila de chips atada a un widget nativo.
 * items: [[etiqueta, valor], ...]   alCambiar: (node, valor) => void
 */
function addChipsSimple(node, objetivo, titulo, items, alCambiar) {
  const estado = { rects: [], filas: 1, y: 0 };
  const w = {
    type: "cineconia_chips2",
    name: "__chips_" + objetivo,
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) { return [width, CAB + estado.filas * (CHIP_H + GAP) + GAP]; },
    draw(ctx, n, width, y) {
      const target = findWidget(n, objetivo);
      if (!target) return;
      estado.y = y;
      ctx.save();
      ctx.textBaseline = "middle";
      cabecera(ctx, titulo, width, y + 8);

      ctx.font = "11px " + MONO;
      estado.rects = [];
      let x = PAD, fila = 0;
      const yTop = y + CAB;
      for (const [etq, val] of items) {
        const tw = Math.ceil(ctx.measureText(etq).width) + 16;
        if (x + tw > width - PAD && x > PAD) { x = PAD; fila++; }
        const cy = yTop + GAP + fila * (CHIP_H + GAP);
        const on = String(target.value) === String(val) || (objetivo === "modo" && target.value === "Manual" && val === "Auto");
        ctx.fillStyle = on ? ACCENT : CHIP_BG;
        roundRect(ctx, x, cy, tw, CHIP_H, 5);
        ctx.fill();
        ctx.fillStyle = on ? CHIP_ON_FG : CHIP_FG;
        ctx.textAlign = "center";
        ctx.fillText(etq, x + tw / 2, cy + CHIP_H / 2 + 0.5);
        estado.rects.push({ x, y: cy, w: tw, h: CHIP_H, val });
        x += tw + GAP;
      }
      estado.filas = fila + 1;
      ctx.restore();
    },
    mouse(event, pos, n) {
      if (event.type !== "pointerdown" && event.type !== "mousedown") return false;
      for (const r of estado.rects) {
        if (pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.y && pos[1] <= r.y + r.h) {
          const target = findWidget(n, objetivo);
          if (target) {
            target.value = r.val;
            target.callback?.(r.val);
          }
          alCambiar?.(n, r.val);
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

// --- fader ----------------------------------------------------------------

function addFader(node, objetivo, etiqueta, lectura) {
  const estado = { x0: 0, x1: 0, y: 0, arrastrando: false, desde: 0, hacia: null, t0: 0 };
  const leer = () => valor(node, objetivo);

  const escribir = (v) => {
    const w = findWidget(node, objetivo);
    if (!w) return;
    const nuevo = clamp(Math.round(v), 0, 100);
    if (nuevo === Number(w.value)) return;
    w.value = nuevo;
    w.callback?.(nuevo);
    node.setDirtyCanvas(true, true);
  };

  const w = {
    type: "cineconia_fader",
    name: "__fader_" + objetivo,
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) { return [width, FADER_H]; },

    draw(ctx, n, width, y) {
      const real = leer();
      let v = real;
      if (estado.hacia !== null) {
        const k = Math.min(1, (performance.now() - estado.t0) / ANIM_MS);
        v = estado.desde + (estado.hacia - estado.desde) * (k * k * (3 - 2 * k));
        if (k < 1) n.setDirtyCanvas(true, true); else estado.hacia = null;
      }

      const x0 = PAD + ANCHO_ETQ;
      const x1 = Math.max(x0 + 40, width - PAD - ANCHO_LEC);
      const cy = y + FADER_H / 2;
      estado.x0 = x0; estado.x1 = x1; estado.y = y;

      ctx.save();
      ctx.textBaseline = "middle";
      ctx.font = "9px " + MONO;
      ctx.textAlign = "left";
      ctx.fillStyle = ETQ_FG;
      ctx.fillText(etiqueta.toUpperCase(), PAD, cy);

      ctx.strokeStyle = LINEA;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const mx = Math.round(x0 + (x1 - x0) * (i / 4)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(mx, cy - 7);
        ctx.lineTo(mx, cy - 4);
        ctx.stroke();
      }

      ctx.fillStyle = CHIP_BG;
      roundRect(ctx, x0, cy - RIEL_H / 2, x1 - x0, RIEL_H, RIEL_H / 2);
      ctx.fill();

      const px = x0 + (x1 - x0) * (clamp(v, 0, 100) / 100);
      if (px > x0 + 1) {
        ctx.fillStyle = ACCENT;
        roundRect(ctx, x0, cy - RIEL_H / 2, px - x0, RIEL_H, RIEL_H / 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(px, cy, POMO_R, 0, Math.PI * 2);
      ctx.fillStyle = POMO;
      ctx.fill();
      ctx.strokeStyle = BORDE_POMO;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = "11px " + MONO;
      ctx.textAlign = "right";
      ctx.fillStyle = INFO_FG;
      ctx.fillText(lectura ? lectura(n, real) : String(real), width - PAD, cy);
      ctx.restore();
    },

    mouse(event, pos, n) {
      const dentro = pos[1] >= estado.y && pos[1] <= estado.y + FADER_H;
      const t = event.type;
      const aplicar = (x) => {
        const bruto = clamp(((x - estado.x0) / (estado.x1 - estado.x0)) * 100, 0, 100);
        escribir(event.shiftKey ? leer() + (bruto - leer()) / 4 : bruto);
        n.__cineCustom?.();
      };
      if ((t === "pointerdown" || t === "mousedown") && dentro) {
        estado.arrastrando = true; estado.hacia = null; aplicar(pos[0]); return true;
      }
      if (estado.arrastrando && (t === "pointermove" || t === "mousemove")) { aplicar(pos[0]); return true; }
      if (estado.arrastrando && (t === "pointerup" || t === "mouseup")) { estado.arrastrando = false; return true; }
      return false;
    },

    animarHacia(v) {
      estado.desde = leer();
      estado.hacia = clamp(v, 0, 100);
      estado.t0 = performance.now();
      escribir(v);
    },
  };
  node.widgets.push(w);
  return w;
}

// --- lecturas: lo que de verdad hace cada control en la v1 -----------------

// The server is the only source of profile, steps and memory estimates.
const configDe = (node) => node.__h3Preview?.config;
const leerCalidad = (n) => configDe(n) ? configDe(n).steps + " pasos" : "calculando…";
const leerDetalle = (n) => configDe(n)?.refine ? configDe(n).refine_steps.split("·")[0].trim() : "sin refinado";
const leerResolucion = (n) => configDe(n)?.refine ? "x" + configDe(n).refine_scale.toFixed(2) : "sin refinado";
const leerAhorro = (n) => configDe(n) ? configDe(n).attention_chunks + " / " + configDe(n).ffn_chunks : "calculando…";

function campos(node) {
  return Object.fromEntries((node.widgets || []).filter(widgetSeGuarda)
    .filter(w => !String(w.name).startsWith("__"))
    .map(w => [w.name, w.value]));
}

function fuente(node, input, seen = new Set()) {
  if (input?.link == null) return null;
  const graph = node.graph || app.graph;
  const link = graph?.links?.[input.link];
  if (!link || seen.has(link.origin_id)) throw new Error("conexion sin resolver");
  seen.add(link.origin_id);
  const origin = graph.getNodeById(link.origin_id);
  const type = origin?.comfyClass || origin?.type;
  if (type === "Reroute") return fuente(origin, origin.inputs?.[0], seen);
  if (["PrimitiveNode", "PrimitiveInt", "PrimitiveFloat"].includes(type)) {
    const value = origin.widgets?.find(widgetSeGuarda)?.value;
    if (typeof value !== "number") throw new Error("valor conectado pendiente");
    return {value};
  }
  if (!["CineRatioSize", "CineDuracion"].includes(type)
      || origin.inputs?.some(i => i.link != null)) throw new Error("conexion requiere ejecutar");
  return {type, fields: campos(origin), output: origin.outputs?.[link.origin_slot]?.name};
}

function payloadDe(node) {
  const fields = campos(node), sources = {};
  for (const name of ["width", "height", "frames"]) {
    const source = fuente(node, node.inputs?.find(i => i.name === name));
    if (source?.value !== undefined) fields[name] = source.value;
    else if (source) sources[name] = source;
  }
  // Other linked controls cannot be inferred safely from stale local widgets.
  if (node.inputs?.some(i => i.link != null && !["width", "height", "frames"].includes(i.name))) {
    throw new Error("control conectado: consulta el resultado al ejecutar");
  }
  return {fields, sources};
}

function actualizarPreview(node) {
  let payload;
  try { payload = payloadDe(node); }
  catch (e) {
    node.__h3Key = null;
    node.__h3Preview = null;
    node.__h3Error = e.message;
    clearTimeout(node.__h3Timer);
    return;
  }
  const key = JSON.stringify(payload);
  if (key === node.__h3Key) return;
  node.__h3Key = key;
  node.__h3Preview = null;
  node.__h3Error = "Calculando en el servidor…";
  clearTimeout(node.__h3Timer);
  node.__h3Timer = setTimeout(async () => {
    try {
      const response = await api.fetchApi("/cineconia/h3/preview", {
        method: "POST", headers: {"Content-Type": "application/json"}, body: key,
      });
      if (!response.ok) throw new Error("Vista previa no disponible; reinicia ComfyUI");
      const result = await response.json();
      if (node.__h3Key !== key || node.__h3Removed) return;
      node.__h3Preview = result;
      node.__h3Error = null;
    } catch (e) {
      if (node.__h3Key !== key || node.__h3Removed) return;
      node.__h3Error = e.message;
    }
    node.setDirtyCanvas(true, true);
  }, 180);
}

function planificar(node) {
  const p = configDe(node)?.planner;
  const labels = {SAFE: "MARGEN", TIGHT: "JUSTO", RISKY: "RIESGO", UNKNOWN: "SIN DATOS"};
  return {estado: labels[p?.status] || "SIN DATOS",
    color: p?.status === "SAFE" ? VERDE : p?.status === "TIGHT" ? "#e4ba55" : p?.status === "RISKY" ? "#ed6976" : TEXTO_TENUE,
    ratio: p?.status === "UNKNOWN" ? 0 : p?.capacity_ratio || 0,
    consejo: p?.recommendations?.join(" · ") || node.__h3Error || "Calculando…"};
}

function textoAjustado(ctx, text, x, y, width, maxLines = 2) {
  const words = String(text).split(/\s+/);
  let line = "", lines = 0;
  for (const word of words) {
    if (ctx.measureText(line + word).width > width && line) {
      ctx.fillText(line.trim(), x, y + lines * 15);
      if (++lines >= maxLines) return;
      line = "";
    }
    line += word + " ";
  }
  ctx.fillText(line.trim(), x, y + lines * 15);
}

function addBarra(node) {
  const ALTO = 142;
  const w = {
    type: "cineconia_barra",
    name: "__barra",
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) { return [width, ALTO]; },
    draw(ctx, n, width, y) {
      actualizarPreview(n);
      const p = planificar(n);
      ctx.save();
      ctx.textBaseline = "middle";
      cabecera(ctx, "riesgo estimado · experimental", width, y + 8);

      const by = y + CAB + 4;
      const bw = width - PAD * 2 - 64;
      ctx.fillStyle = BARRA_BG;
      roundRect(ctx, PAD, by, bw, 8, 4);
      ctx.fill();

      const llenado = clamp(p.ratio / 1.3, 0, 1) * bw;
      if (llenado > 2) {
        ctx.fillStyle = p.color;
        roundRect(ctx, PAD, by, llenado, 8, 4);
        ctx.fill();
      }

      // marcas de los dos umbrales: se ve por que cambia de color
      ctx.strokeStyle = LINEA;
      ctx.lineWidth = 1;
      for (const u of [0.76, 1.0]) {
        const mx = Math.round(PAD + (u / 1.3) * bw) + 0.5;
        ctx.beginPath();
        ctx.moveTo(mx, by - 3);
        ctx.lineTo(mx, by + 11);
        ctx.stroke();
      }

      ctx.font = "11px " + MONO;
      ctx.textAlign = "right";
      ctx.fillStyle = p.color;
      ctx.fillText(p.estado, width - PAD, by + 4);

      ctx.font = "11px " + MONO;
      ctx.textAlign = "left";
      ctx.fillStyle = TEXTO_TENUE;
      textoAjustado(ctx, p.consejo, PAD, by + 25, width - PAD * 2);
      const c = configDe(n);
      if (c) {
        ctx.fillStyle = INFO_FG;
        textoAjustado(ctx, `${c.profile} · ${c.width}×${c.height} · ${c.frames} fotogramas`, PAD, by + 62, width - PAD * 2, 1);
        ctx.fillStyle = TEXTO_TENUE;
        const gpu = c.hardware?.total_gb;
        textoAjustado(ctx, gpu ? `GPU: ${gpu} GB · política ${c.profile} · capacidad ${c.planner.capacity_profile}` : c.planner.basis,
          PAD, by + 80, width - PAD * 2, 1);
      }
      ctx.font = "10px " + MONO;
      ctx.fillText("No mide uso de VRAM ni garantiza que el render quepa.", PAD, by + 104, width - PAD * 2);
      ctx.restore();
    },
  };
  node.widgets.push(w);
  return w;
}

// --- montaje del Optimizador ----------------------------------------------

function montarOptimizador(node) {
  const faders = {};
  for (const [name, label] of Object.entries({width: "Ancho", height: "Alto", frames: "Fotogramas", refinar: "Solicitar segundo pase"})) {
    const w = findWidget(node, name); if (w) w.label = label;
  }

  addLogo(node);

  const chipPerfil = addChipsSimple(
    node, "perfil", "perfil de vram",
    ORDEN_PERFILES.map((p) => [p, p]),
    (n) => actualizarPreview(n),
  );

  addChipsSimple(node, "modo", "controles", MODOS.map(([label, v]) => [label, v]), (n) => visibilidad(n));

  faders.calidad = addFader(node, "calidad", "calidad", leerCalidad);
  faders.detalle = addFader(node, "detalle", "refinado", leerDetalle);
  faders.resolucion = addFader(node, "resolucion", "escala", leerResolucion);
  faders.ahorro_vram = addFader(node, "ahorro_vram", "ahorro", leerAhorro);

  addBarra(node);
  const refresh = node.addWidget("button", "__refresh", null, () => {
    node.__h3Key = null;
    actualizarPreview(node);
    node.setDirtyCanvas(true, true);
  }, {serialize: false});
  refresh.label = "Actualizar detección de GPU";
  refresh.serialize = false;


  // los nativos que reemplazan los faders y los chips se ocultan; el valor
  // sigue en su sitio, asi que los workflows guardados no se enteran
  for (const nombre of ["calidad", "detalle", "resolucion", "ahorro_vram", "perfil", "modo", "movimiento"]) {
    ocultar(findWidget(node, nombre));
  }

  // los nuestros van arriba, en el orden de la maqueta
  const mios = node.widgets.filter((w) => String(w.name || "").startsWith("__"));
  node.widgets = node.widgets.filter((w) => !mios.includes(w));
  node.widgets.push(...mios);

  for (const widget of node.widgets.filter(widgetSeGuarda)) {
    const previous = widget.callback;
    widget.callback = function () {
      const result = previous?.apply(this, arguments);
      visibilidad(node);
      actualizarPreview(node);
      return result;
    };
  }
  const beforeDraw = node.onDrawForeground;
  node.onDrawForeground = function () {
    beforeDraw?.apply(this, arguments);
    visibilidad(this);
    actualizarPreview(this);
  };
  const beforeExecuted = node.onExecuted;
  node.onExecuted = function (message) {
    beforeExecuted?.apply(this, arguments);
    if (message.h3_config?.[0]) {
      this.__h3Preview = {config: message.h3_config[0]};
      this.setDirtyCanvas(true, true);
    }
  };
  const beforeRemoved = node.onRemoved;
  node.onRemoved = function () {
    this.__h3Removed = true;
    clearTimeout(this.__h3Timer);
    return beforeRemoved?.apply(this, arguments);
  };
  node.__cineCustom = () => { visibilidad(node); actualizarPreview(node); };
  visibilidad(node);
  actualizarPreview(node);

}

function mostrar(w) {
  if (!w || w.__tipo === undefined) return;
  w.type = w.__tipo;
  w.computeSize = w.__computeSize;
  w.draw = w.__draw;
  w.hidden = false;
  const el = w.inputEl || w.element || w.domElement;
  if (el?.style) el.style.display = w.__display || "";
  delete w.__tipo;
}

function visibilidad(node) {
  const advanced = findWidget(node, "modo")?.value === "Advanced";
  if (node.__h3Advanced === advanced) return;
  node.__h3Advanced = advanced;
  for (const w of node.widgets) {
    if (w.name?.endsWith("_advanced")) (advanced ? mostrar : ocultar)(w);
    if (w.name?.startsWith("__fader_")) (advanced ? ocultar : mostrar)(w);
  }
  node.setSize?.([Math.max(node.size?.[0] || 0, 460), node.computeSize()[1]]);
  node.setDirtyCanvas(true, true);
}

function montarSimple(node) {
  const w = findWidget(node, "texto");
  if (w) {
    w.label = "Tu escena · pega aquí el prompt completo";
    const el = w.inputEl || w.element;
    if (el) {
      el.placeholder = "Describe la escena en inglés o pega un prompt H3 completo.\nLa cámara se elige en el Director.";
      el.style.minHeight = "220px";
      el.style.lineHeight = "1.6";
    }
  }
  const copy = node.addWidget("button", "Copiar texto", null, async () => {
    try { await navigator.clipboard.writeText(String(w?.value || "")); copy.label = "Texto copiado"; }
    catch { copy.label = "Selecciona el texto y usa Ctrl+C"; }
    node.setDirtyCanvas(true, true);
  });
  copy.serialize = false;
  copy.options = {...copy.options, serialize: false};
}

const ENCUADRES = [
  ["Libre", "sin especificar", 0.5],
  ["Detalle", "primerisimo primer plano", 2.8],
  ["Rostro", "primer plano", 1.8],
  ["Medio corto", "plano medio corto", 1.2],
  ["Medio", "plano medio", 0.95],
  ["Americano", "plano americano", 0.7],
  ["General", "plano general", 0.47],
  ["Gran general", "gran plano general", 0.25],
];
const ANGULOS_VISUALES = [
  ["Libre", "sin especificar", null],
  ["Frontal", "frontal", 90],
  ["Tres cuartos · 3/4", "tres cuartos", 135],
  ["Perfil", "perfil", 180],
];
const CAMINOS = [
  ["Fija", "fijo", "·"], ["Acercar", "acercarse", "↓"],
  ["Alejar", "alejarse", "↑"], ["Órbita", "orbita", "↻"],
  ["Seguir", "seguimiento", "→"], ["En mano", "camara en mano", "≈"],
];

function addTarjetas(node, targetName, title, cards, shots) {
  let rects = [];
  const columns = shots ? 4 : 3;
  const height = shots ? 88 : 66;
  const widget = {
    name: "__cards_" + targetName, type: "cineconia_cards", value: null,
    serialize: false, options: {serialize: false},
    computeSize(width) { return [width, CAB + Math.ceil(cards.length / columns) * (height + GAP) + GAP]; },
    draw(ctx, n, width, y) {
      ctx.save(); ctx.textBaseline = "middle";
      cabecera(ctx, title, width, y + 8);
      rects = [];
      const cw = (width - PAD * 2 - GAP * (columns - 1)) / columns;
      for (let i = 0; i < cards.length; i++) {
        const [label, value, scale] = cards[i];
        const x = PAD + (i % columns) * (cw + GAP), top = y + CAB + Math.floor(i / columns) * (height + GAP);
        const selected = findWidget(n, targetName)?.value === value;
        ctx.fillStyle = selected ? "#42352a" : CHIP_BG;
        roundRect(ctx, x, top, cw, height, 7); ctx.fill();
        ctx.strokeStyle = selected ? ACCENT : LINEA; ctx.lineWidth = 1; ctx.stroke();
        ctx.save();
        ctx.beginPath(); ctx.rect(x + 5, top + 5, cw - 10, height - 27); ctx.clip();
        const cx = x + cw / 2, cy = top + (height - 24) / 2;
        if (shots === "angles") {
          ctx.fillStyle = selected ? ACCENT_CLARO : "#9badad";
          // Top view: the small triangle is the subject's face, the square is the camera.
          const sy = top + 23;
          ctx.beginPath(); ctx.arc(cx, sy, 7, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx - 4, sy + 7); ctx.lineTo(cx + 4, sy + 7); ctx.lineTo(cx, sy + 13); ctx.closePath(); ctx.fill();
          if (scale !== null) {
            const angle = scale * Math.PI / 180;
            const px = cx + Math.cos(angle) * 29, py = sy + Math.sin(angle) * 29;
            ctx.strokeStyle = selected ? ACCENT_CLARO : INFO_FG; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, sy); ctx.stroke();
            ctx.fillRect(px - 5, py - 4, 10, 8);
          }
        } else if (shots) {
          ctx.strokeStyle = "#657779"; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(x + 8, cy + 10); ctx.lineTo(x + cw - 8, cy + 10); ctx.stroke();
          if (value === "sin especificar") {
            ctx.font = "24px sans-serif"; ctx.fillStyle = INFO_FG; ctx.textAlign = "center"; ctx.fillText("◇", cx, cy);
          } else {
            const r = 7 * scale, headY = top + 8 + r;
            ctx.fillStyle = selected ? ACCENT_CLARO : "#9badad";
            ctx.beginPath(); ctx.arc(cx, headY, r, 0, Math.PI * 2); ctx.fill();
            roundRect(ctx, cx - 12 * scale, headY + r + 3, 24 * scale, 30 * scale, 7 * scale); ctx.fill();
            ctx.fillRect(cx - 10 * scale, headY + r + 28 * scale, 8 * scale, 25 * scale);
            ctx.fillRect(cx + 2 * scale, headY + r + 28 * scale, 8 * scale, 25 * scale);
          }
        } else {
          ctx.fillStyle = selected ? ACCENT_CLARO : INFO_FG;
          ctx.textAlign = "center"; ctx.font = "28px sans-serif"; ctx.fillText(scale, cx, cy);
        }
        ctx.restore();
        ctx.font = (shots === "angles" ? "10px " : "11px ") + MONO; ctx.textAlign = "center";
        ctx.fillStyle = selected ? ACCENT_CLARO : CHIP_FG;
        ctx.fillText(label, cx, top + height - 12, cw - 8);
        rects.push({x, y: top, w: cw, h: height, value});
      }
      ctx.restore();
    },
    mouse(event, pos, n) {
      if (!["pointerdown", "mousedown"].includes(event.type)) return false;
      const r = rects.find(r => pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.y && pos[1] <= r.y + r.h);
      if (!r) return false;
      const target = findWidget(n, targetName);
      if (target) { target.value = r.value; target.callback?.(r.value); }
      n.setDirtyCanvas(true, true);
      return true;
    },
  };
  node.widgets.push(widget);
}

function montarDirector(node) {
  ocultar(findWidget(node, "plano"));
  addTarjetas(node, "plano", "01 · encuadre", ENCUADRES, true);
  addTarjetas(node, "angulo", "02 · ángulo · desde dónde miras", ANGULOS_VISUALES, "angles");
  addTarjetas(node, "movimiento", "03 · movimientos frecuentes", CAMINOS, false);
  const labels = {movimiento: "Movimiento · lista completa", angulo: "Ángulo", intensidad: "Intensidad / velocidad",
    lente: "Lente", profundidad_campo: "Fondo / profundidad", instruccion_camara: "Receta o instrucciones de cámara", reglas_continuidad: "Mantener continuidad"};
  for (const w of node.widgets) if (labels[w.name]) w.label = labels[w.name];
  const recipe = node.addWidget("combo", "Recetas H3 · elegir", "libre", () => {},
    {values: TOMAS_H3.map(r => r[1]), serialize: false});
  recipe.serialize = false;
  const apply = node.addWidget("button", "Aplicar receta a la cámara", null, () => {
    const selected = TOMAS_H3.find(r => r[1] === recipe.value);
    if (!selected || selected[1] === "libre") return;
    const w = findWidget(node, "instruccion_camara");
    if (!w) return;
    // Neutral grammar avoids guessing a subject's gender from the artwork.
    w.value = conjugarTomaH3(selected[2], PRONOMBRES_H3.neutro);
    if (w.inputEl) w.inputEl.value = w.value;
    w.callback?.(w.value);
    for (const name of ["plano", "angulo", "movimiento", "lente", "profundidad_campo"]) {
      const control = findWidget(node, name);
      if (control) { control.value = "sin especificar"; control.callback?.(control.value); }
    }
    const holes = huecosH3(w.value);
    apply.label = holes.length ? "Completa los {CAMPOS} de la receta" : "Receta aplicada · revisa tu escena";
    node.setDirtyCanvas(true, true);
  });
  apply.serialize = false;
  apply.options = {...apply.options, serialize: false};

}

app.registerExtension({
  name: "cineconia.faders",

  async nodeCreated(node) {
    const clase = node?.comfyClass;
    if (!NODOS_H3.includes(clase) || !node.widgets) return;
    if (node.widgets.some((w) => String(w.name || "").startsWith("__"))) return;

    const originalWidgets = node.widgets.filter(widgetSeGuarda).slice();
    const serialize = node.serialize;
    node.serialize = function () {
      const info = serialize?.apply(this, arguments) || {};
      info.widgets_values = originalWidgets.map(w => w.value);
      info.widgets_values_named = Object.fromEntries(originalWidgets.map(w => [w.name, w.value]));
      return info;
    };
    const onConfigure = node.onConfigure;
    node.onConfigure = function (info) {
      const result = onConfigure?.apply(this, arguments);
      const named = info?.widgets_values_named;
      const values = info?.widgets_values;
      // Older prototypes put decorative holes before the real fields.
      // Named values are authoritative when available; new saves have no holes.
      originalWidgets.forEach((w, i) => {
        const value = named && Object.hasOwn(named, w.name) ? named[w.name] : values?.[i];
        if (value !== undefined) {
          w.value = value;
          if (w.inputEl) w.inputEl.value = value;
        }
      });
      this.__cineCustom?.();
      this.setDirtyCanvas(true, true);
      return result;
    };
    node.color = "#283436";
    node.bgcolor = "#172123";
    if (clase === "CineCameraDirectorH3") montarDirector(node);
    if (clase === "CineSimplePromptH3") montarSimple(node);
    if (clase === "CineH3Optimizer") {
      montarOptimizador(node);
      const visual = node.widgets.filter(w => !widgetSeGuarda(w));
      node.widgets = [...visual, ...node.widgets.filter(widgetSeGuarda)];
      node.setSize([Math.max(node.size?.[0] || 0, 460), node.computeSize()[1]]);
    } else {
      // Marca comun y tarjetas intercaladas sin cambiar el orden de datos.
      addLogo(node);
      const logo = node.widgets.pop();
      node.widgets.unshift(logo);
      if (clase === "CineCameraDirectorH3") {
        for (const name of ["plano", "angulo", "movimiento"]) {
          const cards = findWidget(node, "__cards_" + name);
          node.widgets = node.widgets.filter(w => w !== cards);
          node.widgets.splice(node.widgets.indexOf(findWidget(node, name)) + 1, 0, cards);
        }
      }
      node.setSize([Math.max(node.size?.[0] || 0, 440), node.computeSize()[1]]);
    }
  },
});
