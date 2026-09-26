import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { pintarCabecera, COLOR_BASE, anchoFijoAlNodo, esLienzoPrincipal } from "./cineconia_cabecera.js";

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
 *
 * Cada corrida del historial guarda también con qué se hizo (modelo, pasos,
 * sampler, resolución final, duración, rama del Interruptor o del Selector) y
 * su desglose por nodo: un clic en la corrida lo vuelve a mostrar. "Copiar
 * tabla" deja todo el historial listo para pegar en una planilla.
 */

export const TIPO = "CineCronometro";
const MAX_HISTORIAL = 20;
const HISTORIAL_VISIBLE = 10;
const MAX_TRAMOS = 7;

const MONO = "'IBM Plex Mono', Consolas, monospace";
const PAD = 10;
const CAB = 17;
const ALTO = 470;
const FILA_HIST = 14;
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

/**
 * Una corrida del historial: total, el muestreo de cada Render optimizado, con
 * qué se hizo (detalle) y el desglose por nodo (tramos).
 */
export function entradaHistorial(resumen, renders = [], fecha = new Date(), detalle = null) {
  const dd = String(fecha.getDate()).padStart(2, "0"), mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const hh = String(fecha.getHours()).padStart(2, "0"), mi = String(fecha.getMinutes()).padStart(2, "0");
  const e = {
    cuando: `${dd}/${mm} ${hh}:${mi}`,
    estado: resumen.estado,
    total: Math.round(resumen.total),
    renders: renders.map((r) => ({ modo: r.modo, ms: Math.round(r.ms) })),
  };
  if (detalle) e.detalle = { ...detalle };
  if (Array.isArray(resumen.tramos) && resumen.tramos.length) {
    e.tramos = resumen.tramos.map((x) => ({ titulo: x.titulo, ms: Math.round(x.ms) }));
    if (resumen.enCache) e.enCache = resumen.enCache;
  }
  return e;
}

export function textoHistorial(e) {
  const d = e.detalle;
  if (d) {
    const partes = [e.cuando];
    if (d.modelo) partes.push(d.modelo);
    if (d.pasos) partes.push(`${d.pasos}p`);
    if (d.resolucion) partes.push(d.resolucion);
    partes.push(formatoCorto(e.total));
    if (e.estado && e.estado !== "listo") partes.push(e.estado);
    return partes.join(" · ");
  }
  const partes = [`${e.cuando}`, `total ${formatoCorto(e.total)}`];
  for (const r of e.renders || []) partes.push(`${r.modo} ${formatoCorto(r.ms)}`);
  if (e.estado && e.estado !== "listo") partes.push(e.estado);
  return partes.join(" · ");
}

/** "minimax\\Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors" -> "Singularity v1.3". */
export function nombreModelo(archivo) {
  const base = String(archivo || "").split(/[\\/]/).pop().replace(/\.(safetensors|gguf|ckpt|pt|pth|bin)$/i, "");
  if (!base) return "";
  if (/singularity/i.test(base)) {
    const v = base.match(/v(\d+(?:\.\d+)*)/i);
    return "Singularity" + (v ? " v" + v[1] : "");
  }
  if (/minimax_h3_ref2va/i.test(base)) return "H3 oficial";
  return base.length > 22 ? base.slice(0, 21) + "…" : base;
}

/** El redondeo de MinimaxH3LatentUpscaler3D (align 32, VAE 16). */
export function ladoEscalado(px, escala) {
  return Math.round(Math.round((px * escala) / 32) * 32 / 16) * 16;
}

const activo = (n) => (n?.mode ?? 0) === 0;
const claseDe = (n) => n?.comfyClass || n?.type;
const valorWidget = (n, name) => n?.widgets?.find((w) => w.name === name)?.value;

/**
 * Con qué se va a hacer esta corrida, leído del grafo al empezar: el modelo
 * del Cargar H3 encendido, pasos/sampler/resolución del Optimizador (o del
 * Render H3 si no hay Optimizador) y la rama del Interruptor o del Selector.
 * config: la del servidor si ya llegó ("executed" del Optimizador).
 */
export function detalleCorrida(graph, config = null) {
  const nodos = (graph?._nodes || graph?.nodes || []).filter(activo);
  const deClase = (c) => nodos.find((n) => claseDe(n) === c);
  const d = {};
  const cargar = deClase("CineCargarH3");
  if (cargar) {
    const archivo = valorWidget(cargar, "modelo");
    d.modelo = nombreModelo(archivo);
    d.archivo = String(archivo || "").split(/[\\/]/).pop();
  }
  const c = config || deClase("CineH3Optimizer")?.__h3Preview?.config;
  const render = deClase("CineRenderH3");
  if (c) {
    d.pasos = c.steps; d.sampler = c.sampler; d.scheduler = c.scheduler;
    if (c.width && c.height) {
      const e = c.refine ? Number(c.refine_scale) || 1 : 1;
      d.resolucion = e > 1 ? `${ladoEscalado(c.width, e)}×${ladoEscalado(c.height, e)}` : `${c.width}×${c.height}`;
    }
    if (c.frames) d.segundos = Math.round((c.frames / 24) * 10) / 10;
  } else if (render) {
    d.pasos = valorWidget(render, "pasos"); d.sampler = valorWidget(render, "sampler");
    d.scheduler = valorWidget(render, "scheduler");
  }
  const ramas = nodos.filter((n) => ["CineInterruptor", "CineSelector"].includes(claseDe(n)))
    .map((n) => n.__cabeceraDato?.texto).filter(Boolean);
  if (ramas.length) d.rama = ramas.join(" · ");
  return d;
}

const COLUMNAS = ["fecha", "estado", "total", "modelo", "pasos", "sampler", "scheduler",
  "resolucion", "segundos", "rama", "archivo", "nodos"];

/** El historial como tabla (separada por tabuladores) para pegar en una planilla. */
export function tablaHistorial(historial) {
  const filas = [COLUMNAS.join("\t")];
  for (const e of historial || []) {
    const d = e.detalle || {};
    const nodos = (e.tramos || []).map((x) => `${x.titulo} ${formatoCorto(x.ms)}`).join(" | ");
    filas.push([e.cuando, e.estado || "", formatoCorto(e.total), d.modelo || "", d.pasos ?? "",
      d.sampler || "", d.scheduler || "", d.resolucion || "", d.segundos ?? "", d.rama || "",
      d.archivo || "", nodos].map((v) => String(v).replace(/[\t\n]/g, " ")).join("\t"));
  }
  return filas.join("\n");
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

function dibujar(ctx, node, width, y, medidor, ahora, zonas) {
  ctx.save();
  ctx.textBaseline = "middle";
  const historial = node.properties?.historial || [];
  const elegida = medidor.estado !== "corriendo" ? historial[node.__cronoElegida] : null;
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

  // desglose por nodo: el de la corrida elegida en el historial, o el de ahora
  yy += 22;
  cabecera(ctx, elegida ? `tiempo por nodo · ${elegida.cuando}` : "tiempo por nodo", width, yy);
  yy += 16;
  const tramos = elegida ? (elegida.tramos || []).slice(0, MAX_TRAMOS) : medidor.tramosVisibles(ahora);
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

  // historial: clic en una corrida para ver su desglose
  yy = Math.max(yy + 6, y + CAB + 58 + 22 + 16 + MAX_TRAMOS * 17 + 6);
  const extra = historial.length > HISTORIAL_VISIBLE ? ` (${HISTORIAL_VISIBLE} de ${historial.length})` : "";
  cabecera(ctx, `corridas anteriores${extra} · clic para ver su detalle`, width, yy);
  yy += 16;
  ctx.font = "10px " + MONO;
  ctx.textAlign = "left";
  if (!historial.length) {
    ctx.fillStyle = TENUE;
    ctx.fillText("todavía ninguna", PAD, yy);
  }
  historial.slice(0, HISTORIAL_VISIBLE).forEach((e, i) => {
    const sel = i === node.__cronoElegida;
    if (sel) {
      ctx.fillStyle = "#2b2419";
      ctx.beginPath(); ctx.roundRect(PAD - 4, yy - FILA_HIST / 2, width - PAD * 2 + 8, FILA_HIST, 3); ctx.fill();
    }
    ctx.fillStyle = sel ? AMBAR : e.estado === "listo" ? INFO : TENUE;
    ctx.fillText(recortar(ctx, textoHistorial(e), width - PAD * 2), PAD, yy);
    zonas.push({ y: yy - FILA_HIST / 2, h: FILA_HIST, i });
    yy += FILA_HIST;
  });
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

// Con qué se hizo la corrida en curso: se toma al empezar y se completa con la
// config real del Optimizador si el servidor la manda.
let corrida = { detalle: null };

function alTerminar(resumen) {
  if (!resumen) return;
  // lo que midió cada Render optimizado en esta misma corrida
  const renders = rendersDelGrafo(app.graph);
  const entrada = entradaHistorial(resumen, renders, new Date(), corrida.detalle);
  for (const n of cronometros()) {
    n.properties = n.properties || {};
    n.properties.historial = [entrada, ...(n.properties.historial || [])].slice(0, MAX_HISTORIAL);
    n.__cronoElegida = null;
  }
  latir(false);
  refrescar();
}

function escuchar() {
  const ahora = () => performance.now();
  api.addEventListener("execution_start", (e) => {
    medidor.empezar(ahora(), e.detail || {});
    try { corrida = { detalle: detalleCorrida(app.graph) }; } catch { corrida = { detalle: null }; }
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
    // la config que de verdad usó el Optimizador (la vista previa puede ir atrasada)
    if (n?.comfyClass === "CineH3Optimizer" && d.output?.h3_config?.[0]) {
      try { corrida.detalle = detalleCorrida(app.graph, d.output.h3_config[0]); } catch { /* se queda la del inicio */ }
    }
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
      this.__cronoElegida = null;
      let zonas = [];
      // La cápsula de la cabecera se lee al pintar el título, que va antes que
      // el cuerpo: con un getter nunca queda una corrida atrasada ("EN CURSO"
      // cuando ya terminó).
      Object.defineProperty(this, "__cabeceraDato", {
        configurable: true,
        enumerable: false,
        get() { return datoCabecera(medidor, performance.now()); },
      });
      const widget = this.addCustomWidget({
        type: "cineconia_cronometro",
        name: "__cronometro",
        value: null,
        options: { serialize: false },
        serialize: false,
        computeSize(width) { return [width, ALTO]; },
        draw(ctx, n, width, y) {
          const nuevas = [];
          dibujar(ctx, n, width, y, medidor, performance.now(), nuevas);
          // las zonas de clic, solo del lienzo del grafo (no del panel lateral)
          if (!esLienzoPrincipal(ctx)) return;
          zonas = nuevas;
          // un workflow guardado con el Cronómetro viejo (más bajo) crece solo
          // para que el historial y los botones no se salgan del nodo
          if (!n.__cronoAjustado) {
            n.__cronoAjustado = true;
            const alto = n.computeSize?.()[1];
            if (alto && n.size?.[1] < alto - 1) n.setSize?.([n.size[0], alto]);
          }
        },
        mouse(event, pos, n) {
          if (event.type !== "pointerdown" && event.type !== "mousedown") return false;
          const z = zonas.find((q) => pos[1] >= q.y && pos[1] <= q.y + q.h);
          if (!z) return false;
          n.__cronoElegida = n.__cronoElegida === z.i ? null : z.i;
          n.setDirtyCanvas(true, true);
          return true;
        },
      });
      const copiar = this.addWidget("button", "__copiar", null, () => {
        const texto = tablaHistorial(nodo.properties.historial);
        const listo = () => { copiar.label = "Tabla copiada"; nodo.setDirtyCanvas(true, true);
          setTimeout(() => { copiar.label = "Copiar tabla"; nodo.setDirtyCanvas(true, true); }, 2000); };
        navigator.clipboard?.writeText(texto).then(listo).catch(() => {});
      }, { serialize: false });
      copiar.label = "Copiar tabla";
      copiar.serialize = false;
      const boton = this.addWidget("button", "__borrar", null, () => {
        nodo.properties.historial = [];
        nodo.__cronoElegida = null;
        nodo.setDirtyCanvas(true, true);
      }, { serialize: false });
      boton.label = "Borrar historial";
      boton.serialize = false;
      anchoFijoAlNodo(widget);
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
