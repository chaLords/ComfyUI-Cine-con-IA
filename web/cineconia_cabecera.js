import { app } from "../../scripts/app.js";

/**
 * Cabecera "tungsteno" de los nodos Cine con IA.
 *
 * Grafito que se enciende en ámbar hacia la derecha, título en blanco y, en el
 * extremo claro, una cápsula oscura con un dato vivo del nodo. Donde la cabecera
 * ya lleva el logo, cineconia.js lo pone en su versión oscura, sin placa. Idea
 * tomada de la cabecera en degradé del nodo SOYLAB Comfy Router; el código es
 * propio.
 *
 * Es la estética de todos los nodos del paquete, también los que se creen
 * después: basta con que el nombre empiece por "Cine". Va siempre, en bypass,
 * silenciado o con un color elegido a mano; el color elegido queda en el cuerpo y
 * el bypass se sigue viendo en el cuerpo morado y en la cápsula.
 *
 * Archivo aparte: cineconia.js y cineconia_faders.js no se tocan. Solo dibuja:
 * no cambia ningún valor de los nodos ni lo que se guarda en el workflow.
 *
 * Modo clásico: onDrawTitleBar, que el frontend llama en lugar del fondo por
 * defecto de la cabecera; el título y el botón de plegar se siguen dibujando
 * encima. Nodes 2.0: la cabecera es HTML y se pinta con CSS.
 */

export const TUNGSTENO = [[0, "#172123"], [0.55, "#283436"], [0.84, "#8f5526"], [1, "#e08a3c"]];
export const COLOR_BASE = "#283436";   // el color de cabecera que ya usan los nodos del paquete
const CUERPO = "#172123";
const TITULO = "#f3f6f5";
const CAPSULA_BG = "rgba(8, 12, 13, 0.80)";
const CAPSULA_FG = "#eef3f2";
const FUENTE_CAPSULA = "600 11px Inter, sans-serif";
const AMBAR = "#f0a154";
const TEAL = "#8fb9b3";
const ROJO = "#ed6976";
const ESTADOS = {
  SAFE: ["MARGEN", "#3f8e63"],
  TIGHT: ["JUSTO", "#e4ba55"],
  RISKY: ["RIESGO", ROJO],
};

// Nodos de cineconia.js que cuelgan su logo en la cabecera cuando tienen
// entradas reales (marcarNodo). Ahí el logo ya ocupa el sitio de la cápsula.
const LOGO_EN_TITULO = new Set([
  "CineRatioSize", "CineDuracion", "CineModelos", "CineCargarH3", "CineEscenaH3",
  "CineRenderH3", "CineEscalarRefinar", "CineSalida", "CinePrompt6",
]);

/** Solo nodos de este paquete, aunque otro paquete use el prefijo "Cine". */
export function esCine(nodeData) {
  return String(nodeData?.name || "").startsWith("Cine")
    && String(nodeData?.python_module || "").toLowerCase().includes("cine");
}

const esNodoCine = (node) => Boolean(node?.constructor?.__cineCabecera);
const MODOS = { 2: ["SILENCIADO", "#8b9a9b"], 4: ["BYPASS", "#c85bd6"] };
const findWidget = (node, name) => node?.widgets?.find((w) => w.name === name);

function mmss(segundos) {
  const s = Math.round(Number(segundos) || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function entradasReales(node) {
  return (node.inputs || []).filter((i) => !i.widget).length;
}

/** Config del Optimizador conectado a la entrada config, sin ejecutar nada. */
function configConectada(node) {
  const input = node.inputs?.find((i) => i.name === "config");
  const graph = node.graph || app.graph;
  const link = input?.link != null ? graph?.links?.[input.link] : null;
  const origen = link ? graph?.getNodeById?.(link.origin_id) : null;
  return origen?.__h3Preview?.config || null;
}

/**
 * El dato vivo de cada nodo: {texto, corto, punto} o null.
 * enCabeceraHtml: en Nodes 2.0 la cabecera no lleva logo, así que la Escena
 * muestra su tamaño.
 */
export function datoVivo(node, enCabeceraHtml = false) {
  const modo = MODOS[node?.mode];
  if (modo) return { texto: modo[0], corto: modo[0], punto: modo[1] };
  // un nodo puede traer su propio dato (el Cronómetro lo usa)
  if (node && "__cabeceraDato" in node) return node.__cabeceraDato;
  switch (node?.comfyClass) {
    case "CineH3Optimizer": {
      const c = node.__h3Preview?.config;
      if (!c) return null;
      const estado = ESTADOS[c.planner?.status];
      if (!estado) return { texto: "SIN DATOS", corto: "SIN DATOS", punto: "#8b9a9b" };
      const perfil = c.planner?.capacity_profile || c.profile;
      return { texto: `${perfil} · ${estado[0]}`, corto: estado[0], punto: estado[1] };
    }
    case "CineH3OptimizedSampler": {
      const c = configConectada(node);
      if (!c) return null;
      const p = c.progressive;
      const ultimo = node.__h3Ultimo;
      let dato;
      if (p?.enabled) {
        const falta = { FALTA_SELFLIFT: "falta SelfLift", FALTA_ESCALADOR: "falta escalador" }[p.status];
        dato = falta
          ? { texto: `PROGRESIVO · ${falta}`, corto: "PROGRESIVO", punto: ROJO }
          : { texto: `PROGRESIVO · ${p.transition_step}/${p.steps}`, corto: "PROGRESIVO", punto: AMBAR, modo: "progresivo" };
      } else {
        dato = { texto: `NORMAL · ${c.steps} pasos`, corto: "NORMAL", punto: TEAL, modo: "normal" };
      }
      // el tiempo del último render, si fue en este mismo modo
      if (ultimo?.seconds != null && ultimo.mode === dato.modo) dato.texto += ` · ${mmss(ultimo.seconds)}`;
      return dato;
    }
    case "CineEscenaH3": {
      if (!enCabeceraHtml) return null;
      const w = Number(findWidget(node, "width")?.value ?? 0);
      const h = Number(findWidget(node, "height")?.value ?? 0);
      const l = Number(findWidget(node, "length")?.value ?? 0);
      if (!w || !h || !l) return null;
      return { texto: `${w}×${h} · ${(l / 24).toFixed(1)} s`, corto: `${w}×${h}`, punto: null };
    }
    default:
      return null;
  }
}

// --- modo clásico -----------------------------------------------------------

function capsula(ctx, x, y, w, h) {
  ctx.fillStyle = CAPSULA_BG;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
}

/** Ancho de la cápsula para un texto, con el punto si lo lleva. */
function anchoCapsula(ctx, texto, punto) {
  ctx.font = FUENTE_CAPSULA;
  return Math.ceil(ctx.measureText(texto).width) + 20 + (punto ? 12 : 0);
}

function dibujarCapsula(ctx, node, h, w) {
  // cineconia.js dibuja aquí su logo, en la versión oscura que se lee sobre el ámbar
  if (LOGO_EN_TITULO.has(node.comfyClass) && entradasReales(node) > 0) return;
  const dato = datoVivo(node);
  if (!dato) return;
  ctx.save();
  // no pisar el título: si no cabe entero, la versión corta; si tampoco, nada
  ctx.font = node.titleFontStyle;
  const finTitulo = h + ctx.measureText(String(node.getTitle?.() ?? node.title ?? "")).width + 12;
  let texto = dato.texto;
  let pw = anchoCapsula(ctx, texto, dato.punto);
  if (w - pw - 8 < finTitulo) {
    texto = dato.corto;
    pw = anchoCapsula(ctx, texto, dato.punto);
  }
  if (w - pw - 8 < finTitulo) { ctx.restore(); return; }
  const ph = 20;
  const x = w - pw - 8;
  const y = -h + (h - ph) / 2;
  capsula(ctx, x, y, pw, ph);
  let tx = x + 10;
  if (dato.punto) {
    ctx.fillStyle = dato.punto;
    ctx.beginPath();
    ctx.arc(tx + 3, y + ph / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    tx += 12;
  }
  ctx.font = FUENTE_CAPSULA;
  ctx.fillStyle = CAPSULA_FG;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, tx, y + ph / 2 + 0.5);
  ctx.restore();
}

/** Reemplaza el fondo de la cabecera. Firma de onDrawTitleBar del frontend. */
export function pintarCabecera(ctx, h, size, scale, color) {
  const w = size[0];
  const r = globalThis.LiteGraph?.ROUND_RADIUS ?? 8;
  const plegado = Boolean(this.collapsed);
  // de muy lejos el frontend simplifica el dibujo: ahí basta un color liso
  const degradado = scale >= 0.5;
  ctx.save();
  ctx.beginPath();
  if (!degradado || this.renderingShape === globalThis.LiteGraph?.BOX_SHAPE) ctx.rect(0, -h, w, h);
  else ctx.roundRect(0, -h, w, h, plegado ? [r] : [r, r, 0, 0]);
  if (degradado) {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    for (const [o, c] of TUNGSTENO) g.addColorStop(o, c);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = TUNGSTENO[1][1];
  }
  if (plegado) ctx.shadowColor = globalThis.LiteGraph?.DEFAULT_SHADOW_COLOR || "rgba(0,0,0,0.5)";
  ctx.fill();
  ctx.restore();
  if (degradado && !plegado) dibujarCapsula(ctx, this, h, w);
}

// --- Nodes 2.0 ----------------------------------------------------------------

const CSS = `
.lg-node[data-cineconia] .lg-node-header {
  background: linear-gradient(90deg, ${TUNGSTENO.map(([o, c]) => `${c} ${o * 100}%`).join(", ")});
  color: ${TITULO};
}
.lg-node[data-cineconia] .lg-node-header[data-cine-dato] {
  position: relative;
  padding-right: var(--cine-dato-ancho, 0px);
}
.lg-node[data-cineconia] .lg-node-header[data-cine-dato]::after {
  content: attr(data-cine-dato);
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  padding: 3px 10px; border-radius: 999px; white-space: nowrap;
  font: ${FUENTE_CAPSULA}; color: ${CAPSULA_FG};
  background: ${CAPSULA_BG};
}
.lg-node[data-cineconia] .lg-node-header[data-cine-punto]::after {
  padding-left: 22px;
  background: radial-gradient(circle at 12px 50%, var(--cine-punto) 3.5px, transparent 4.5px), ${CAPSULA_BG};
}
.lg-node[data-cineconia][data-collapsed] .lg-node-header::after { display: none; }
`;

function instalarCss() {
  if (document.getElementById("cineconia-cabecera")) return;
  const style = document.createElement("style");
  style.id = "cineconia-cabecera";
  style.textContent = CSS;
  document.head.append(style);
}

function fijar(el, nombre, valor) {
  if (valor == null) { if (el.hasAttribute(nombre)) el.removeAttribute(nombre); }
  else if (el.getAttribute(nombre) !== valor) el.setAttribute(nombre, valor);
}

/** Marca los nodos HTML de Nodes 2.0. Vue no toca atributos que no maneja. */
export function actualizarNodosHtml(doc = document) {
  const elementos = doc.querySelectorAll(".lg-node[data-node-id]");
  if (!elementos.length) return 0;   // modo clásico: nada que hacer
  const graph = app.canvas?.graph || app.graph;
  let marcados = 0;
  for (const el of elementos) {
    const node = graph?.getNodeById?.(el.dataset.nodeId);
    if (!esNodoCine(node)) { fijar(el, "data-cineconia", null); continue; }
    marcados++;
    fijar(el, "data-cineconia", "");
    const header = el.querySelector(".lg-node-header");
    if (!header) continue;
    const dato = datoVivo(node, true);
    fijar(header, "data-cine-dato", dato ? dato.texto : null);
    fijar(header, "data-cine-punto", dato?.punto ? "" : null);
    if (dato?.punto) header.style.setProperty("--cine-punto", dato.punto);
    // reserva el sitio de la cápsula para que el título no pase por debajo
    const ancho = dato ? `${Math.ceil(dato.texto.length * 6.6) + 40 + (dato.punto ? 12 : 0)}px` : "";
    if (header.style.getPropertyValue("--cine-dato-ancho") !== ancho) header.style.setProperty("--cine-dato-ancho", ancho);
  }
  return marcados;
}

// --- registro -----------------------------------------------------------------

app.registerExtension({
  name: "cineconia.cabecera",

  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (!esCine(nodeData)) return;
    nodeType.__cineCabecera = true;
    nodeType.title_text_color = TITULO;
    Object.defineProperty(nodeType.prototype, "titleFontStyle", {
      configurable: true,
      get() {
        const L = globalThis.LiteGraph;
        return `600 ${L?.NODE_TEXT_SIZE ?? 14}px ${L?.NODE_FONT ?? "Inter"}`;
      },
    });
    nodeType.prototype.onDrawTitleBar = pintarCabecera;
  },

  nodeCreated(node) {
    if (!esNodoCine(node)) return;
    // Los nodos recién sacados del menú venían grises. Los de un workflow
    // guardado recuperan después su color, así que esto no les cambia nada.
    if (!node.color) node.color = COLOR_BASE;
    if (!node.bgcolor) node.bgcolor = CUERPO;
  },

  setup() {
    instalarCss();
    setInterval(() => { try { actualizarNodosHtml(); } catch { /* solo es pintura */ } }, 500);
  },
});
