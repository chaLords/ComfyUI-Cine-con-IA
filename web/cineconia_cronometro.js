import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { pintarCabecera, COLOR_BASE } from "./cineconia_cabecera.js";

/**
 * Cine con IA · Cronómetro
 *
 * Nodo solo de interfaz (no va al servidor ni cambia el render). Mide cada
 * ejecución: reloj en vivo, el paso del muestreo, cuánto tardó cada nodo y un
 * historial de las últimas corridas para comparar, por ejemplo, el render normal
 * contra el progresivo. El historial se guarda con el workflow.
 *
 * El total sale de las marcas de tiempo del servidor (inicio y fin de la
 * ejecución); el desglose por nodo, de los avisos "executing" que ComfyUI manda
 * al pasar de un nodo al siguiente. Los nodos en caché no cuentan: no corrieron.
 */

export const TIPO = "CineCronometro";
const MAX_HISTORIAL = 6;
const MAX_TRAMOS = 7;

const MONO = "'IBM Plex Mono', Consolas, monospace";
const PAD = 10;
const CAB = 17;
const ALTO = 356;
const AMBAR = "#f0a154";
const VERDE = "#3f8e63";
const ROJO = "#ed6976";
const TENUE = "#8b9a9b";
const TEXTO = "#e3edec";
const INFO = "#8fb9b3";
const ETQ = "#6f7d7e";
const LINEA = "#394446";
const BARRA_BG = "#20282a";

/** 754.3 s -> "12:34.3"; más de una hora -> "1:02:03". */
export function formatoReloj(ms, decimas = true) {
  const t = Math.max(0, Number(ms) || 0) / 1000;
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}`;
  const seg = decimas ? s.toFixed(1).padStart(4, "0") : String(Math.floor(s)).padStart(2, "0");
  return `${m}:${seg}`;
}

/** 212400 ms -> "3:32" (para listas). */
export const formatoCorto = (ms) => formatoReloj(ms, false);

/**
 * Máquina de estados de una ejecución. No sabe nada del DOM: recibe los avisos
 * de ComfyUI con la hora de llegada y arma los tramos.
 */
export class Medidor {
  constructor(tituloDe) {
    this.tituloDe = tituloDe;
    this.reiniciar();
  }

  reiniciar() {
    this.estado = "espera";       // espera | corriendo | listo | error | interrumpido
    this.inicio = 0;
    this.fin = 0;
    this.inicioServidor = null;
    this.finServidor = null;
    this.actual = null;           // {id, titulo, desde}
    this.tramos = [];             // [{id, titulo, ms}]
    this.paso = null;             // {value, max}
    this.enCache = 0;
  }

  empezar(t, detalle = {}) {
    this.reiniciar();
    this.estado = "corriendo";
    this.inicio = t;
    this.inicioServidor = Number.isFinite(detalle.timestamp) ? detalle.timestamp : null;
  }

  cache(detalle = {}) {
    this.enCache = Array.isArray(detalle.nodes) ? detalle.nodes.length : 0;
  }

  cerrarTramo(t) {
    if (!this.actual) return;
    this.tramos.push({ id: this.actual.id, titulo: this.actual.titulo, ms: Math.max(0, t - this.actual.desde) });
    this.actual = null;
  }

  ejecutando(t, id) {
    if (id == null) {                       // fin de la cola, en el protocolo viejo
      if (this.estado === "corriendo") this.terminar(t, "listo");
      return;
    }
    if (this.estado !== "corriendo") this.empezar(t);   // la página se abrió a mitad de una ejecución
    this.cerrarTramo(t);
    this.actual = { id: String(id), titulo: this.tituloDe(String(id)), desde: t };
    this.paso = null;
  }

  progreso(detalle = {}) {
    if (this.estado !== "corriendo") return;
    const value = Number(detalle.value), max = Number(detalle.max);
    if (Number.isFinite(value) && Number.isFinite(max) && max > 1) this.paso = { value, max };
  }

  terminar(t, estado, detalle = {}) {
    if (this.estado !== "corriendo") return null;
    this.cerrarTramo(t);
    this.estado = estado;
    this.fin = t;
    this.finServidor = Number.isFinite(detalle.timestamp) ? detalle.timestamp : null;
    this.paso = null;
    return this.resumen();
  }

  /** Tiempo de la corrida: el del servidor si mandó las dos marcas. */
  total(t = this.fin) {
    if (this.estado === "corriendo") return Math.max(0, t - this.inicio);
    if (this.inicioServidor != null && this.finServidor != null) return Math.max(0, this.finServidor - this.inicioServidor);
    return Math.max(0, this.fin - this.inicio);
  }

  /** Tramos para mostrar: los que más tardaron, en el orden en que corrieron. */
  tramosVisibles(t, max = MAX_TRAMOS) {
    const lista = this.tramos.slice();
    if (this.actual) lista.push({ id: this.actual.id, titulo: this.actual.titulo, ms: Math.max(0, t - this.actual.desde), vivo: true });
    if (lista.length <= max) return lista;
    const top = new Set(lista.slice().sort((a, b) => b.ms - a.ms).slice(0, max - 1));
    const visibles = lista.filter((x) => top.has(x) || x.vivo);
    const resto = lista.filter((x) => !visibles.includes(x));
    visibles.push({ id: "otros", titulo: `otros ${resto.length} nodos`, ms: resto.reduce((s, x) => s + x.ms, 0) });
    return visibles;
  }

  resumen() {
    return { estado: this.estado, total: this.total(), tramos: this.tramos.map((x) => ({ ...x })), enCache: this.enCache };
  }
}

/** Una línea de historial: total y el muestreo de cada Render optimizado. */
export function entradaHistorial(resumen, renders = [], fecha = new Date()) {
  const dd = String(fecha.getDate()).padStart(2, "0"), mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const hh = String(fecha.getHours()).padStart(2, "0"), mi = String(fecha.getMinutes()).padStart(2, "0");
  return {
    cuando: `${dd}/${mm} ${hh}:${mi}`,
    estado: resumen.estado,
    total: Math.round(resumen.total),
    renders: renders.map((r) => ({ modo: r.modo, ms: Math.round(r.ms) })),
  };
}

export function textoHistorial(e) {
  const partes = [`${e.cuando}`, `total ${formatoCorto(e.total)}`];
  for (const r of e.renders || []) partes.push(`${r.modo} ${formatoCorto(r.ms)}`);
  if (e.estado && e.estado !== "listo") partes.push(e.estado);
  return partes.join(" · ");
}

/** Lo que el Render optimizado midió de su propio muestreo (cineconia_faders.js). */
function rendersDelGrafo(graph) {
  const out = [];
  for (const n of graph?._nodes || graph?.nodes || []) {
    const r = n?.__h3Ultimo;
    if ((n?.comfyClass || n?.type) === "CineH3OptimizedSampler" && r?.seconds != null && n.__cronoCorrida === r) {
      out.push({ modo: r.mode, ms: r.seconds * 1000 });
    }
  }
  return out;
}

// --- dibujo -------------------------------------------------------------------

function cabecera(ctx, titulo, width, y) {
  ctx.font = "9px " + MONO;
  ctx.textAlign = "left";
  ctx.fillStyle = ETQ;
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

function recortar(ctx, texto, ancho) {
  let s = String(texto);
  if (ctx.measureText(s).width <= ancho) return s;
  while (s.length > 1 && ctx.measureText(s + "…").width > ancho) s = s.slice(0, -1);
  return s + "…";
}

const COLOR_ESTADO = { corriendo: AMBAR, listo: VERDE, error: ROJO, interrumpido: TENUE, espera: TENUE };
const NOMBRE_ESTADO = { corriendo: "EN CURSO", listo: "LISTO", error: "ERROR", interrumpido: "INTERRUMPIDO", espera: "EN ESPERA" };

export function datoCabecera(medidor, ahora) {
  const e = medidor.estado;
  if (e === "espera") return null;
  const texto = e === "corriendo" ? `EN CURSO · ${formatoCorto(medidor.total(ahora))}` : `${NOMBRE_ESTADO[e]} · ${formatoCorto(medidor.total())}`;
  return { texto, corto: NOMBRE_ESTADO[e], punto: COLOR_ESTADO[e] };
}

function dibujar(ctx, node, width, y, medidor, ahora) {
  ctx.save();
  ctx.textBaseline = "middle";
  cabecera(ctx, medidor.estado === "corriendo" ? "renderizando" : "última corrida", width, y + 8);

  // reloj grande
  const total = medidor.estado === "espera" ? 0 : medidor.total(ahora);
  ctx.font = "600 38px " + MONO;
  ctx.textAlign = "left";
  ctx.fillStyle = medidor.estado === "corriendo" ? AMBAR : TEXTO;
  ctx.fillText(formatoReloj(total), PAD, y + CAB + 26);

  ctx.font = "11px " + MONO;
  ctx.textAlign = "right";
  ctx.fillStyle = COLOR_ESTADO[medidor.estado];
  ctx.fillText(NOMBRE_ESTADO[medidor.estado], width - PAD, y + CAB + 18);
  ctx.fillStyle = TENUE;
  const sub = medidor.estado === "corriendo"
    ? (medidor.paso ? `paso ${medidor.paso.value}/${medidor.paso.max}` : "")
    : (medidor.enCache ? `${medidor.enCache} ${medidor.enCache === 1 ? "nodo" : "nodos"} en caché` : "");
  if (sub) ctx.fillText(sub, width - PAD, y + CAB + 34);

  // nodo en curso
  ctx.textAlign = "left";
  let yy = y + CAB + 58;
  ctx.font = "11px " + MONO;
  ctx.fillStyle = INFO;
  const ahoraTxt = medidor.estado === "corriendo" && medidor.actual ? "ahora: " + medidor.actual.titulo
    : medidor.estado === "espera" ? "Ejecuta el workflow y aquí aparece cuánto tarda cada paso." : "";
  if (ahoraTxt) ctx.fillText(recortar(ctx, ahoraTxt, width - PAD * 2), PAD, yy);

  // desglose por nodo
  yy += 22;
  cabecera(ctx, "tiempo por nodo", width, yy);
  yy += 16;
  const tramos = medidor.tramosVisibles(ahora);
  const maxMs = Math.max(1, ...tramos.map((x) => x.ms));
  const anchoTitulo = width * 0.46, x0 = PAD + anchoTitulo + 8, anchoBarra = width - x0 - PAD - 58;
  for (const tr of tramos.slice(0, MAX_TRAMOS)) {
    ctx.font = "11px " + MONO;
    ctx.fillStyle = tr.vivo ? AMBAR : TEXTO;
    ctx.textAlign = "left";
    ctx.fillText(recortar(ctx, tr.titulo, anchoTitulo), PAD, yy);
    ctx.fillStyle = BARRA_BG;
    ctx.beginPath(); ctx.roundRect(x0, yy - 3, anchoBarra, 6, 3); ctx.fill();
    ctx.fillStyle = tr.vivo ? AMBAR : "#a86a31";
    const w = Math.max(2, (tr.ms / maxMs) * anchoBarra);
    ctx.beginPath(); ctx.roundRect(x0, yy - 3, w, 6, 3); ctx.fill();
    ctx.fillStyle = TEXTO;
    ctx.textAlign = "right";
    ctx.fillText(formatoCorto(tr.ms), width - PAD, yy);
    yy += 17;
  }
  if (!tramos.length) {
    ctx.fillStyle = TENUE; ctx.textAlign = "left";
    ctx.fillText("—", PAD, yy); yy += 17;
  }

  // historial
  const historial = node.properties?.historial || [];
  yy = Math.max(yy + 6, y + CAB + 58 + 22 + 16 + MAX_TRAMOS * 17 + 6);
  cabecera(ctx, "corridas anteriores", width, yy);
  yy += 16;
  ctx.font = "10px " + MONO;
  ctx.textAlign = "left";
  if (!historial.length) {
    ctx.fillStyle = TENUE;
    ctx.fillText("todavía ninguna", PAD, yy);
  }
  for (const e of historial.slice(0, MAX_HISTORIAL - 1)) {
    ctx.fillStyle = e.estado === "listo" ? INFO : TENUE;
    ctx.fillText(recortar(ctx, textoHistorial(e), width - PAD * 2), PAD, yy);
    yy += 14;
  }
  ctx.restore();
}

// --- el nodo --------------------------------------------------------------------

const medidor = new Medidor((id) => {
  const graph = app.canvas?.graph || app.graph;
  const n = graph?.getNodeById?.(id) || app.graph?.getNodeById?.(id);
  return n ? (n.title || n.type) : `nodo ${id}`;
});

function cronometros() {
  const graph = app.graph;
  return (graph?._nodes || graph?.nodes || []).filter((n) => n?.type === TIPO);
}

function refrescar() {
  for (const n of cronometros()) n.setDirtyCanvas?.(true, false);
  app.graph?.setDirtyCanvas?.(true, false);
}

let latido = null;
function latir(on) {
  if (on && !latido) latido = setInterval(refrescar, 200);
  if (!on && latido) { clearInterval(latido); latido = null; }
}

function alTerminar(resumen) {
  if (!resumen) return;
  // lo que midió cada Render optimizado en esta misma corrida
  const renders = rendersDelGrafo(app.graph);
  const entrada = entradaHistorial(resumen, renders);
  for (const n of cronometros()) {
    n.properties = n.properties || {};
    n.properties.historial = [entrada, ...(n.properties.historial || [])].slice(0, MAX_HISTORIAL);
  }
  latir(false);
  refrescar();
}

function escuchar() {
  const ahora = () => performance.now();
  api.addEventListener("execution_start", (e) => {
    medidor.empezar(ahora(), e.detail || {});
    // marca qué resúmenes del Render optimizado son de esta corrida
    for (const n of app.graph?._nodes || []) if (n?.comfyClass === "CineH3OptimizedSampler") n.__cronoCorrida = null;
    latir(true);
    refrescar();
  });
  api.addEventListener("execution_cached", (e) => medidor.cache(e.detail || {}));
  api.addEventListener("executing", (e) => {
    const d = e.detail;
    const id = d && typeof d === "object" ? d.node : d;
    const antes = medidor.estado;
    medidor.ejecutando(ahora(), id);
    if (antes !== "corriendo" && medidor.estado === "corriendo") latir(true);
    if (antes === "corriendo" && medidor.estado !== "corriendo") alTerminar(medidor.resumen());
    refrescar();
  });
  api.addEventListener("executed", (e) => {
    const d = e.detail || {};
    const n = app.graph?.getNodeById?.(d.node);
    if (n?.comfyClass === "CineH3OptimizedSampler" && d.output?.h3_render?.[0]) n.__cronoCorrida = n.__h3Ultimo = d.output.h3_render[0];
  });
  api.addEventListener("progress", (e) => medidor.progreso(e.detail || {}));
  api.addEventListener("execution_success", (e) => alTerminar(medidor.terminar(ahora(), "listo", e.detail || {})));
  api.addEventListener("execution_error", (e) => alTerminar(medidor.terminar(ahora(), "error", e.detail || {})));
  api.addEventListener("execution_interrupted", (e) => alTerminar(medidor.terminar(ahora(), "interrumpido", e.detail || {})));
}

function crearClase() {
  const Base = globalThis.LGraphNode || globalThis.LiteGraph?.LGraphNode;
  class Cronometro extends Base {
    constructor(title) {
      super(title);
      this.comfyClass = TIPO;
      this.isVirtualNode = true;
      this.serialize_widgets = false;
      this.color = COLOR_BASE;
      this.bgcolor = "#172123";
      this.properties = this.properties || {};
      this.properties.historial = this.properties.historial || [];
      const nodo = this;
      this.addCustomWidget({
        type: "cineconia_cronometro",
        name: "__cronometro",
        value: null,
        options: { serialize: false },
        serialize: false,
        computeSize(width) { return [width, ALTO]; },
        draw(ctx, n, width, y) {
          n.__cabeceraDato = datoCabecera(medidor, performance.now());
          dibujar(ctx, n, width, y, medidor, performance.now());
        },
      });
      const boton = this.addWidget("button", "__borrar", null, () => {
        nodo.properties.historial = [];
        nodo.setDirtyCanvas(true, true);
      }, { serialize: false });
      boton.label = "Borrar historial";
      boton.serialize = false;
      this.size = [460, this.computeSize()[1]];
    }
  }
  Cronometro.title = "Cine con IA · Cronómetro";
  Cronometro.category = "Cine con IA";
  Cronometro.collapsable = true;
  Cronometro.__cineCabecera = true;
  Cronometro.title_text_color = "#f3f6f5";
  Object.defineProperty(Cronometro.prototype, "titleFontStyle", {
    configurable: true,
    get() {
      const L = globalThis.LiteGraph;
      return `600 ${L?.NODE_TEXT_SIZE ?? 14}px ${L?.NODE_FONT ?? "Inter"}`;
    },
  });
  Cronometro.prototype.onDrawTitleBar = pintarCabecera;
  return Cronometro;
}

app.registerExtension({
  name: "cineconia.cronometro",
  registerCustomNodes() {
    const Cronometro = crearClase();
    globalThis.LiteGraph.registerNodeType(TIPO, Cronometro);
  },
  setup() {
    escuchar();
  },
});
