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
 * Qué hace cada botón se guarda en properties.filas. Se arma desde el
 * workflow o desde la interfaz: «+» al final de una fila guarda como botón lo
 * que está puesto ahora en sus controles, y con clic derecho se crean filas
 * con los controles de los nodos seleccionados, se renombra, se colorea, se
 * actualiza o se borra cada botón. La clave de un botón no cambia al
 * renombrarlo, así el nombre del video sigue igual.
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
const CHIP_ON_FG = "#12181a";
const MAS = 28;

// Los mismos colores que el Interruptor; ámbar es el de siempre.
export const PALETA = {
  ambar: ["ámbar", AMBAR],
  verde: ["verde", "#5fb487"],
  turquesa: ["turquesa", "#8fb9b3"],
  amarillo: ["amarillo", "#e4ba55"],
  rojo: ["rojo", ROJO],
  gris: ["gris", "#b9c4c3"],
};

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

/**
 * Índice de la opción que está puesta en cada fila (-1: personalizado). Si
 * coinciden varias, gana la que fija más valores: un botón recién guardado con
 * «+» se enciende aunque otro más corto también encaje.
 */
export function estado(graph, filas) {
  return (filas || []).map((f) => {
    let mejor = -1;
    (f.opciones || []).forEach((o, j) => {
      const largo = (x) => x?.valores?.length || 0;
      if (coincide(graph, o) && (mejor < 0 || largo(o) > largo(f.opciones[mejor]))) mejor = j;
    });
    return mejor;
  });
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

// --- botones hechos desde la interfaz -------------------------------------------

/** "Singularity v1.3" -> "singularity-v1-3", sin repetir las que ya hay. */
export function claveNueva(texto, usadas) {
  const base = String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "op";
  let clave = base, i = 2;
  while (usadas.includes(clave)) clave = `${base}-${i++}`;
  return clave;
}

const mismoControl = (a, b) => String(a.nodo) === String(b.nodo)
  && (a.widget !== undefined ? a.widget === b.widget : b.widget === undefined);

/** Lo que controla una fila: lo que declaró, o lo que tocan sus botones. */
export function controlesDe(fila) {
  const lista = [];
  const fuente = fila?.controles?.length ? fila.controles : (fila?.opciones || []).flatMap((o) => o.valores || []);
  for (const v of fuente) {
    const c = v.widget !== undefined ? { nodo: v.nodo, widget: v.widget } : { nodo: v.nodo, modo: true };
    if (!lista.some((x) => mismoControl(x, c))) lista.push(c);
  }
  return lista;
}

/** Los valores que tienen ahora esos controles, listos para un botón. */
export function capturar(graph, controles) {
  const valores = [];
  for (const c of controles) {
    const n = nodoDe(graph, c.nodo);
    if (!n) continue;
    if (c.widget === undefined) { valores.push({ nodo: c.nodo, modo: n.mode ?? 0 }); continue; }
    const w = widgetDe(n, c.widget);
    if (w) valores.push({ nodo: c.nodo, widget: c.widget, valor: w.value });
  }
  return valores;
}

/** «+»: lo puesto ahora pasa a ser un botón nuevo de la fila. Devuelve su índice. */
export function guardarComoBoton(graph, fila, etiqueta) {
  const opciones = fila.opciones = fila.opciones || [];
  const texto = String(etiqueta ?? "").trim() || `opción ${opciones.length + 1}`;
  opciones.push({ etiqueta: texto, clave: claveNueva(texto, opciones.map((o) => o.clave)),
    valores: capturar(graph, controlesDe(fila)) });
  return opciones.length - 1;
}

export function actualizarBoton(graph, fila, j) {
  const o = fila?.opciones?.[j];
  if (o) o.valores = capturar(graph, controlesDe(fila));
}

/** Fila nueva con los controles elegidos; la clave sirve para el nombre del video. */
export function nuevaFila(props, nombre, controles = []) {
  const filas = props.filas = props.filas || [];
  const texto = String(nombre ?? "").trim().toUpperCase() || `FILA ${filas.length + 1}`;
  filas.push({ nombre: texto, clave: claveNueva(texto, filas.map((f) => f.clave)), controles: [...controles], opciones: [] });
  return filas.length - 1;
}

/** Añade un control a la fila; si ya tenía botones, guarda también ese valor actual en cada uno. */
export function anadirControl(graph, fila, control) {
  const actuales = controlesDe(fila);
  if (actuales.some((x) => mismoControl(x, control))) return false;
  fila.controles = [...actuales, control];
  const valor = capturar(graph, [control])[0];
  if (valor) for (const o of fila.opciones || []) o.valores = [...(o.valores || []), { ...valor }];
  return true;
}

export function quitarControl(fila, control) {
  fila.controles = controlesDe(fila).filter((x) => !mismoControl(x, control));
  for (const o of fila.opciones || []) o.valores = (o.valores || []).filter((v) => !mismoControl(v, control));
}

export function moverBoton(fila, j, delta) {
  const o = fila?.opciones || [], k = j + delta;
  if (j < 0 || k < 0 || j >= o.length || k >= o.length) return false;
  [o[j], o[k]] = [o[k], o[j]];
  return true;
}

/** Dato de la cabecera: lo elegido en cada fila. */
export function cabeceraDe(filas, elegidas) {
  if (!filas?.length) return null;
  const partes = filas.map((f, i) => f.opciones?.[elegidas[i]]?.etiqueta || "personalizado");
  const todas = elegidas.every((e) => e >= 0);
  return { texto: partes.join(" · "), corto: partes[0], punto: todas ? VERDE : AMBAR };
}

// --- dibujo -------------------------------------------------------------------

function tinte(hex, alfa) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}

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
    const disponible = width - PAD - x - MAS - 6;
    const n = Math.max(1, f.opciones?.length || 1);
    const ancho = (disponible - (n - 1) * 6) / n;
    if (!f.opciones?.length) {
      ctx.font = "10px " + MONO;
      ctx.fillStyle = TENUE;
      ctx.fillText(recortar(ctx, "pon los valores y pulsa + para guardarlos", disponible), x, cy);
    }
    (f.opciones || []).forEach((o, j) => {
      const on = elegidas[i] === j;
      const mal = problemas(graph, o);
      const color = PALETA[o.color]?.[1] || AMBAR;
      ctx.fillStyle = on ? (o.color ? tinte(color, 0.14) : FONDO_ON) : FONDO_CHIP;
      ctx.beginPath(); ctx.roundRect(x, yy, ancho, FILA, 6); ctx.fill();
      ctx.strokeStyle = mal.length ? ROJO : on ? color : LINEA; ctx.lineWidth = on || mal.length ? 1.5 : 1;
      ctx.beginPath(); ctx.roundRect(x + 0.75, yy + 0.75, ancho - 1.5, FILA - 1.5, 6); ctx.stroke();
      if (o.color && !on && !mal.length) {
        ctx.fillStyle = tinte(color, 0.85);
        ctx.beginPath(); ctx.roundRect(x + 1, yy + 6, 3, FILA - 12, 1.5); ctx.fill();
      }
      ctx.font = (on ? "600 " : "") + "11px " + MONO;
      ctx.textAlign = "center";
      ctx.fillStyle = mal.length ? ROJO : on ? TEXTO : "#b9c4c3";
      ctx.fillText(recortar(ctx, (on ? "● " : "") + o.etiqueta, ancho - 12), x + ancho / 2, cy + 0.5);
      rects.push({ x, y: yy, w: ancho, h: FILA, fila: i, opcion: j });
      if (mal.length) avisos.push(`${o.etiqueta}: ${mal[0]}`);
      x += ancho + 6;
    });
    // «+»: guarda lo puesto ahora como un botón nuevo de esta fila
    const xm = width - PAD - MAS;
    ctx.strokeStyle = LINEA; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(xm + 0.5, yy + 0.5, MAS - 1, FILA - 1, 6); ctx.stroke();
    ctx.font = "600 15px " + MONO;
    ctx.textAlign = "center";
    ctx.fillStyle = controlesDe(f).length ? AMBAR : TENUE;
    ctx.fillText("+", xm + MAS / 2, cy + 0.5);
    rects.push({ x: xm, y: yy, w: MAS, h: FILA, fila: i, mas: true });
    yy += FILA + HUECO;
  });

  ctx.font = "10px " + MONO;
  ctx.textAlign = "left";
  if (!filas.length) {
    ctx.fillStyle = TENUE;
    ctx.fillText(recortar(ctx, "Clic derecho › Selector · nueva fila", width - PAD * 2), PAD, yy + FILA / 2);
    yy += FILA + HUECO;
  }
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

/** Nodos seleccionados en el lienzo, sin selectores. */
function seleccionados() {
  const sel = app.canvas?.selected_nodes;
  const lista = sel instanceof Map ? [...sel.values()] : Object.values(sel || {});
  return lista.filter((n) => n && n.type !== TIPO && n.comfyClass !== TIPO);
}

async function pedirTexto(titulo, valor, mensaje) {
  const dialogo = app.extensionManager?.dialog;
  if (dialogo?.prompt) return dialogo.prompt({ title: titulo, message: mensaje, defaultValue: valor });
  return globalThis.prompt?.(titulo, valor) ?? null;
}

const nombreNodo = (n) => n?.title || n?.type || `nodo ${n?.id}`;

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
      const estadoW = { rects: [], filas: 0, seleccion: [] };
      this.__estado = estadoW;
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
          // pulsar el Selector lo selecciona: se recuerda lo que había antes
          const sel = seleccionados();
          if (sel.length) estadoW.seleccion = sel;
          else if (!n.selected) estadoW.seleccion = [];
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
          if (r.mas) { n.guardarBoton(r.fila); return true; }
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

    refrescar() {
      const graph = grafoDe(this);
      actualizarSalida(graph, this.properties);
      graph?.setDirtyCanvas?.(true, true);
      app.canvas?.setDirty?.(true, true);
      graph?.change?.();
    }

    async guardarBoton(i) {
      const fila = this.properties.filas?.[i];
      if (!fila) return;
      if (!controlesDe(fila).length) {
        app.extensionManager?.toast?.add?.({ severity: "info", summary: "Selector",
          detail: "Esta fila aún no controla nada: clic derecho › Fila › Añadir control.", life: 6000 });
        return;
      }
      const etiqueta = await pedirTexto(`Nuevo botón en ${fila.nombre}`, `opción ${(fila.opciones || []).length + 1}`,
        "Guarda lo que está puesto ahora en los controles de esta fila");
      if (etiqueta === null || etiqueta === undefined) return;
      guardarComoBoton(grafoDe(this), fila, etiqueta);
      this.refrescar();
    }

    async renombrarFila(fila) {
      const nombre = await pedirTexto("Renombrar fila", fila.nombre, "Nombre de la fila");
      if (nombre === null || nombre === undefined || !String(nombre).trim()) return;
      fila.nombre = String(nombre).trim().toUpperCase();
      this.refrescar();
    }

    async renombrarBoton(o) {
      const nombre = await pedirTexto("Renombrar botón", o.etiqueta, "La clave del video no cambia");
      if (nombre === null || nombre === undefined || !String(nombre).trim()) return;
      o.etiqueta = String(nombre).trim();
      this.refrescar();
    }

    async crearFila() {
      const nombre = await pedirTexto("Nueva fila del Selector", `FILA ${(this.properties.filas || []).length + 1}`,
        "Luego añade sus controles con clic derecho › Fila › Añadir control");
      if (nombre === null || nombre === undefined) return;
      nuevaFila(this.properties, nombre);
      this.refrescar();
    }

    getExtraMenuOptions(canvas, options) {
      const props = this.properties;
      const graph = grafoDe(this);
      const sel = this.__estado?.seleccion || [];
      const hecho = (fn) => () => { fn(); this.refrescar(); };
      const marca = (si, txt) => (si ? "✓ " : "   ") + txt;
      const menu = [{ content: "Selector · nueva fila…", callback: () => this.crearFila() }];
      (props.filas || []).forEach((fila, i) => {
        const controles = controlesDe(fila);
        const nombreControl = (c) => `${nombreNodo(nodoDe(graph, c.nodo))} · ${c.widget ?? "encendido/apagado"}`;
        const anadir = sel.length
          ? sel.map((n) => ({ content: nombreNodo(n), has_submenu: true, submenu: { options: [
            ...(n.widgets || []).filter((w) => w.name && !String(w.name).startsWith("__") && w.serialize !== false
              && w.options?.serialize !== false && w.type !== "button")
              .map((w) => ({ content: w.label || w.name, callback: hecho(() => anadirControl(graph, fila, { nodo: n.id, widget: w.name })) })),
            { content: "encendido / apagado del nodo", callback: hecho(() => anadirControl(graph, fila, { nodo: n.id, modo: true })) },
          ] } }))
          : [{ content: "Selecciona nodos en el lienzo primero", disabled: true }];
        menu.push({ content: `Fila · ${fila.nombre}`, has_submenu: true, submenu: { options: [
          { content: "Guardar lo puesto como botón…", disabled: !controles.length, callback: () => this.guardarBoton(i) },
          { content: "Añadir control", has_submenu: true, submenu: { options: anadir } },
          { content: "Quitar control", has_submenu: true, disabled: !controles.length, submenu: { options:
            controles.map((c) => ({ content: nombreControl(c), callback: hecho(() => quitarControl(fila, c)) })) } },
          { content: "Renombrar fila…", callback: () => this.renombrarFila(fila) },
          { content: "Borrar fila", callback: hecho(() => props.filas.splice(i, 1)) },
        ] } });
        (fila.opciones || []).forEach((o, j) => {
          menu.push({ content: `Botón · ${fila.nombre} · ${o.etiqueta}`, has_submenu: true, submenu: { options: [
            { content: "Renombrar…", callback: () => this.renombrarBoton(o) },
            { content: "Actualizar con lo puesto ahora", callback: hecho(() => actualizarBoton(graph, fila, j)) },
            { content: "Color", has_submenu: true, submenu: { options: Object.entries(PALETA).map(([v, [txt]]) => ({
              content: marca((o.color || "ambar") === v, txt), callback: hecho(() => { if (v === "ambar") delete o.color; else o.color = v; }) })) } },
            { content: "Mover a la izquierda", callback: hecho(() => moverBoton(fila, j, -1)) },
            { content: "Mover a la derecha", callback: hecho(() => moverBoton(fila, j, +1)) },
            { content: "Borrar botón", callback: hecho(() => fila.opciones.splice(j, 1)) },
          ] } });
        });
      });
      options.push(null, ...menu);
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
