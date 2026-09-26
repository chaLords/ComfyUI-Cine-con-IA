import { app } from "../../scripts/app.js";
import { pintarCabecera, COLOR_BASE, anchoFijoAlNodo, esLienzoPrincipal } from "./cineconia_cabecera.js";

/**
 * Cine con IA · Selector
 *
 * Nodo solo de interfaz (no va al servidor). Filas de botones independientes,
 * por ejemplo MODELO y PASOS: cada botón pone a la vez varios valores en otros
 * nodos del workflow (el modelo del Cargar H3, el modo y los pasos del
 * Optimizador...) o enciende/apaga un nodo. Así se combinan opciones sin
 * duplicar ramas: "Singularity con 8 pasos" es un clic en cada fila.
 *
 * Qué hace cada botón se guarda en properties.filas (lo arma el workflow).
 * El botón encendido se decide mirando los nodos: si alguien cambia el modelo a
 * mano, la fila queda en "personalizado". Con properties.salida el nombre del
 * video se arma solo, por ejemplo CineConIA/048_singularity_20p_...
 */

export const TIPO = "CineSelector";

const MONO = "'IBM Plex Mono', Consolas, monospace";
const PAD = 10;
const CAB = 18;
const FILA = 30;
const HUECO = 8;
const COL = 96;
const PIE = 34;
const AMBAR = "#f0a154";
const TENUE = "#8b9a9b";
const TEXTO = "#e3edec";
const ETQ = "#6f7d7e";
const LINEA = "#394446";
const ROJO = "#ed6976";
const VERDE = "#3f8e63";
const FONDO_CHIP = "#20282a";
const FONDO_ON = "#2b2419";

// --- lógica (sin DOM: se prueba en tests/test_selector.cjs) -------------------

const nodoDe = (graph, id) => graph?.getNodeById?.(id)
  ?? (graph?._nodes || graph?.nodes || []).find((n) => String(n.id) === String(id));
const widgetDe = (node, name) => node?.widgets?.find((w) => w.name === name);
const base = (s) => String(s ?? "").split(/[\\/]/).pop().toLowerCase();

/**
 * El valor que de verdad se puede poner en ese widget. Para listas (modelos),
 * si el archivo está en otra subcarpeta se busca por su nombre.
 * Devuelve {ok, valor} o {ok:false, motivo}.
 */
export function valorPara(widget, valor) {
  const lista = widget?.options?.values;
  if (!Array.isArray(lista) || !lista.length || lista.includes(valor)) return { ok: true, valor };
  const mismo = lista.find((v) => base(v) === base(valor));
  if (mismo !== undefined) return { ok: true, valor: mismo };
  return { ok: false, motivo: `no está en la lista: ${base(valor)}` };
}

/** Problemas de una opción antes de aplicarla: nodos o widgets que no existen. */
export function problemas(graph, opcion) {
  const out = [];
  for (const v of opcion?.valores || []) {
    const n = nodoDe(graph, v.nodo);
    if (!n) { out.push(`falta el nodo ${v.nodo}`); continue; }
    if (v.widget !== undefined) {
      const w = widgetDe(n, v.widget);
      if (!w) { out.push(`${n.title || n.type}: no tiene "${v.widget}"`); continue; }
      const r = valorPara(w, v.valor);
      if (!r.ok) out.push(`${n.title || n.type}: ${r.motivo}`);
    }
  }
  return out;
}

/** true si los nodos ya tienen los valores de esta opción. */
export function coincide(graph, opcion) {
  const valores = opcion?.valores || [];
  if (!valores.length) return false;
  return valores.every((v) => {
    const n = nodoDe(graph, v.nodo);
    if (!n) return false;
    if (v.modo !== undefined) return (n.mode ?? 0) === v.modo;
    const w = widgetDe(n, v.widget);
    if (!w) return false;
    const r = valorPara(w, v.valor);
    if (!r.ok) return false;
    if (w.value === r.valor) return true;
    // un workflow guardado en Windows trae "minimax\\x.safetensors" y la lista
    // de otra máquina dice "minimax/x.safetensors": es el mismo archivo
    return Array.isArray(w.options?.values) && typeof w.value === "string" && base(w.value) === base(r.valor);
  });
}

/** Índice de la opción que está puesta en cada fila (-1: personalizado). */
export function estado(graph, filas) {
  return (filas || []).map((f) => (f.opciones || []).findIndex((o) => coincide(graph, o)));
}

/** El nombre del video según lo elegido: {modelo} -> clave de la opción. */
export function nombreSalida(plantilla, filas, elegidas) {
  let s = String(plantilla || "");
  (filas || []).forEach((f, i) => {
    const o = f.opciones?.[elegidas[i]];
    s = s.split(`{${f.clave}}`).join(o ? o.clave : "personalizado");
  });
  return s;
}

/**
 * Pone los valores de una opción. Lo que no se puede poner se salta y se
 * informa. Devuelve la lista de problemas.
 */
export function aplicar(graph, opcion) {
  const fallos = [];
  for (const v of opcion?.valores || []) {
    const n = nodoDe(graph, v.nodo);
    if (!n) { fallos.push(`falta el nodo ${v.nodo}`); continue; }
    if (v.modo !== undefined) { n.mode = v.modo; continue; }
    const w = widgetDe(n, v.widget);
    if (!w) { fallos.push(`${n.title || n.type}: no tiene "${v.widget}"`); continue; }
    const r = valorPara(w, v.valor);
    if (!r.ok) { fallos.push(`${n.title || n.type}: ${r.motivo}`); continue; }
    w.value = r.valor;
    try { w.callback?.(w.value, app?.canvas, n); } catch { /* el valor ya quedó puesto */ }
  }
  return fallos;
}

/** Actualiza el nombre del video (properties.salida) con lo que está puesto. */
export function actualizarSalida(graph, props) {
  const s = props?.salida;
  if (!s) return null;
  const n = nodoDe(graph, s.nodo);
  const w = widgetDe(n, s.widget);
  if (!w) return null;
  const nombre = nombreSalida(s.plantilla, props.filas, estado(graph, props.filas));
  if (w.value !== nombre) {
    w.value = nombre;
    try { w.callback?.(w.value); } catch { /* ya quedó */ }
  }
  return nombre;
}

export function altoPara(numFilas) {
  return CAB + Math.max(1, numFilas) * (FILA + HUECO) + PIE;
}

/** Dato de la cabecera: lo elegido en cada fila. */
export function cabeceraDe(filas, elegidas) {
  if (!filas?.length) return null;
  const partes = filas.map((f, i) => f.opciones?.[elegidas[i]]?.etiqueta || "personalizado");
  const todas = elegidas.every((e) => e >= 0);
  return { texto: partes.join(" · "), corto: partes[0], punto: todas ? VERDE : AMBAR };
}

// --- dibujo -------------------------------------------------------------------

function recortar(ctx, texto, ancho) {
  let s = String(texto);
  if (ctx.measureText(s).width <= ancho) return s;
  while (s.length > 1 && ctx.measureText(s + "…").width > ancho) s = s.slice(0, -1);
  return s + "…";
}

function dibujar(ctx, graph, width, y, props, rects, avisos) {
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.font = "9px " + MONO;
  ctx.textAlign = "left";
  ctx.fillStyle = ETQ;
  const etq = "CLIC PARA ELEGIR · UNA OPCIÓN POR FILA";
  ctx.fillText(etq, PAD, y + 8);
  const tw = ctx.measureText(etq).width;
  ctx.strokeStyle = LINEA; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD + tw + 8, y + 8.5); ctx.lineTo(width - PAD, y + 8.5); ctx.stroke();

  const filas = props?.filas || [];
  const elegidas = estado(graph, filas);
  let yy = y + CAB;
  filas.forEach((f, i) => {
    const cy = yy + FILA / 2;
    ctx.font = "600 10px " + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = TENUE;
    ctx.fillText(recortar(ctx, f.nombre, COL - 8), PAD, cy);
    let x = PAD + COL;
    const disponible = width - PAD - x;
    const n = Math.max(1, f.opciones?.length || 1);
    const ancho = (disponible - (n - 1) * 6) / n;
    (f.opciones || []).forEach((o, j) => {
      const on = elegidas[i] === j;
      const mal = problemas(graph, o);
      ctx.fillStyle = on ? FONDO_ON : FONDO_CHIP;
      ctx.beginPath(); ctx.roundRect(x, yy, ancho, FILA, 6); ctx.fill();
      ctx.strokeStyle = mal.length ? ROJO : on ? AMBAR : LINEA; ctx.lineWidth = on || mal.length ? 1.5 : 1;
      ctx.beginPath(); ctx.roundRect(x + 0.75, yy + 0.75, ancho - 1.5, FILA - 1.5, 6); ctx.stroke();
      ctx.font = (on ? "600 " : "") + "11px " + MONO;
      ctx.textAlign = "center";
      ctx.fillStyle = mal.length ? ROJO : on ? TEXTO : "#b9c4c3";
      ctx.fillText(recortar(ctx, (on ? "● " : "") + o.etiqueta, ancho - 12), x + ancho / 2, cy + 0.5);
      rects.push({ x, y: yy, w: ancho, h: FILA, fila: i, opcion: j });
      if (mal.length) avisos.push(`${o.etiqueta}: ${mal[0]}`);
      x += ancho + 6;
    });
    yy += FILA + HUECO;
  });

  ctx.font = "10px " + MONO;
  ctx.textAlign = "left";
  if (avisos.length) {
    ctx.fillStyle = ROJO;
    ctx.fillText(recortar(ctx, "⚠ " + avisos[0], width - PAD * 2), PAD, yy + 7);
  } else {
    ctx.fillStyle = TENUE;
    // el nombre que de verdad tiene el video (por si alguien lo cambió a mano)
    const s = props?.salida;
    const real = s ? widgetDe(nodoDe(graph, s.nodo), s.widget)?.value : undefined;
    const nombre = s ? String(real ?? nombreSalida(s.plantilla, filas, elegidas)) : "";
    const vid = nombre.split("%")[0].replace(/_+$/, "");
    ctx.fillText(recortar(ctx, vid ? `video: ${vid}…` : "", width - PAD * 2), PAD, yy + 7);
    if (elegidas.some((e) => e < 0)) {
      ctx.fillText(recortar(ctx, "una fila está en \"personalizado\": se cambió a mano", width - PAD * 2), PAD, yy + 21);
    }
  }
  ctx.restore();
}

// --- el nodo --------------------------------------------------------------------

function grafoDe(node) {
  return node?.graph || app.canvas?.graph || app.graph;
}

function crearClase() {
  const Base = globalThis.LGraphNode || globalThis.LiteGraph?.LGraphNode;
  class Selector extends Base {
    constructor(title) {
      super(title);
      this.comfyClass = TIPO;
      this.isVirtualNode = true;
      this.serialize_widgets = false;
      this.color = COLOR_BASE;
      this.bgcolor = "#172123";
      this.properties = this.properties || {};
      if (!Array.isArray(this.properties.filas)) this.properties.filas = [];
      const nodo = this;
      const estadoW = { rects: [], filas: 0 };
      const widget = this.addCustomWidget({
        type: "cineconia_selector",
        name: "__selector",
        value: null,
        options: { serialize: false },
        serialize: false,
        computeSize(width) { return [width, altoPara(estadoW.filas)]; },
        draw(ctx, n, width, y) {
          const rects = [];
          const filas = n.properties?.filas || [];
          dibujar(ctx, grafoDe(n), width, y, n.properties, rects, []);
          if (!esLienzoPrincipal(ctx)) return;
          estadoW.rects = rects;
          if (filas.length !== estadoW.filas) {
            estadoW.filas = filas.length;
            const alto = n.computeSize()[1];
            if (Math.abs(n.size[1] - alto) > 1) n.setSize?.([n.size[0], alto]);
          }
        },
        mouse(event, pos, n) {
          if (event.type !== "pointerdown" && event.type !== "mousedown") return false;
          const r = estadoW.rects.find((q) => pos[0] >= q.x && pos[0] <= q.x + q.w && pos[1] >= q.y && pos[1] <= q.y + q.h);
          if (!r) return false;
          const graph = grafoDe(n);
          const fila = n.properties.filas[r.fila];
          aplicar(graph, fila.opciones[r.opcion]);
          actualizarSalida(graph, n.properties);
          graph?.setDirtyCanvas?.(true, true);
          app.canvas?.setDirty?.(true, true);
          return true;
        },
      });
      anchoFijoAlNodo(widget);
      this.size = [460, this.computeSize()[1]];
      // La cápsula de la cabecera: lo que está puesto en cada fila.
      Object.defineProperty(this, "__cabeceraDato", {
        configurable: true,
        enumerable: false,
        get() {
          const filas = nodo.properties?.filas || [];
          return cabeceraDe(filas, estado(grafoDe(nodo), filas));
        },
      });
    }
  }
  Selector.title = "Cine con IA · Selector";
  Selector.category = "Cine con IA";
  Selector.collapsable = true;
  Selector.__cineCabecera = true;
  Selector.title_text_color = "#f3f6f5";
  Object.defineProperty(Selector.prototype, "titleFontStyle", {
    configurable: true,
    get() {
      const L = globalThis.LiteGraph;
      return `600 ${L?.NODE_TEXT_SIZE ?? 14}px ${L?.NODE_FONT ?? "Inter"}`;
    },
  });
  Selector.prototype.onDrawTitleBar = pintarCabecera;
  return Selector;
}

app.registerExtension({
  name: "cineconia.selector",
  registerCustomNodes() {
    globalThis.LiteGraph.registerNodeType(TIPO, crearClase());
  },
});
