import { app } from "../../scripts/app.js";
import { pintarCabecera, COLOR_BASE, anchoFijoAlNodo, esLienzoPrincipal } from "./cineconia_cabecera.js";

/**
 * Cine con IA · Interruptor
 *
 * Nodo solo de interfaz (no va al servidor). Cada botón enciende un conjunto
 * de nodos y apaga los de los demás botones; lo demás del workflow no se toca.
 * Los botones salen de dos sitios:
 *   - los grupos cuyo título empieza por un prefijo ("RAMA" por defecto), como
 *     siempre: un nodo es de un grupo si su centro cae dentro;
 *   - botones propios: se seleccionan nodos en el lienzo y se pulsa
 *     «+ botón con la selección».
 * Con clic derecho cada botón se renombra, cambia de color, se mueve o se
 * oculta, y el interruptor elige su modo (una siempre, una o ninguna, varias) y
 * cómo apaga (bypass o silenciar).
 *
 * El estado que se ve sale siempre de los nodos (su modo real), así que un
 * bypass puesto a mano también se refleja. Todo se guarda en properties; un
 * workflow que solo trae properties.prefijo se ve y funciona como antes.
 */

export const TIPO = "CineInterruptor";
export const PREFIJO = "RAMA";
export const MODO_NORMAL = 0;
export const MODO_SILENCIO = 2;
export const MODO_BYPASS = 4;

const MONO = "'IBM Plex Mono', Consolas, monospace";
const PAD = 10;
const CAB = 18;
const FILA = 34;
const HUECO = 6;
const PIE = 46;
const AMBAR = "#f0a154";
const VERDE = "#3f8e63";
const VIOLETA = "#c85bd6";
const TENUE = "#8b9a9b";
const TEXTO = "#e3edec";
const ETQ = "#6f7d7e";
const LINEA = "#394446";
const FONDO_FILA = "#20282a";
const FONDO_ON = "#2b2419";
const CHIP_ON_FG = "#12181a";

// Los colores del paquete; ámbar es el de siempre. Sin violeta: es el del bypass.
export const PALETA = {
  ambar: ["ámbar", AMBAR],
  verde: ["verde", "#5fb487"],
  turquesa: ["turquesa", "#8fb9b3"],
  amarillo: ["amarillo", "#e4ba55"],
  rojo: ["rojo", "#ed6976"],
  gris: ["gris", "#b9c4c3"],
};

export const MODOS = {
  una: "una siempre encendida",
  una_o_ninguna: "una o ninguna",
  varias: "varias a la vez",
};

export const APAGADOS = {
  bypass: ["bypass · los datos pasan de largo", MODO_BYPASS, "BYPASS", VIOLETA],
  silenciar: ["silenciar · no se ejecutan", MODO_SILENCIO, "SILENCIADA", TENUE],
};

// --- geometría y ramas (sin DOM: se prueba en tests/test_interruptor.cjs) -----

const normal = (s) => String(s ?? "").trim().toLowerCase();

/** [x, y, ancho, alto] del grupo, en las distintas versiones de LiteGraph. */
export function rectGrupo(g) {
  const b = g?._bounding ?? g?.bounding
    ?? (g?.pos && g?.size ? [g.pos[0], g.pos[1], g.size[0], g.size[1]] : null);
  if (!b) return null;
  const r = [0, 1, 2, 3].map((i) => Number(b[i]));
  return r.every(Number.isFinite) ? r : null;
}

export function centroNodo(n) {
  const p = n?.pos || [0, 0], s = n?.size || [0, 0];
  return [Number(p[0]) + Number(s[0]) / 2, Number(p[1]) + Number(s[1]) / 2];
}

export function dentro(p, r) {
  return p[0] >= r[0] && p[0] <= r[0] + r[2] && p[1] >= r[1] && p[1] <= r[1] + r[3];
}

/** Grupos del interruptor, de arriba abajo y de izquierda a derecha. */
export function gruposDe(graph, prefijo) {
  const pre = normal(prefijo);
  if (!pre) return [];
  const todos = graph?._groups || graph?.groups || [];
  return todos
    .filter((g) => normal(g?.title).startsWith(pre) && rectGrupo(g))
    .sort((a, b) => {
      const ra = rectGrupo(a), rb = rectGrupo(b);
      return ra[1] - rb[1] || ra[0] - rb[0];
    });
}

const nodosGrafo = (graph) => graph?._nodes || graph?.nodes || [];

/** Nodos cuyo centro cae en el grupo. Los interruptores nunca se apagan a sí mismos. */
export function nodosDe(graph, grupo) {
  const r = rectGrupo(grupo);
  if (!r) return [];
  return nodosGrafo(graph).filter((n) => n && n.type !== TIPO && dentro(centroNodo(n), r));
}

/** encendida | apagada | mixta | vacia, según el modo real de sus nodos. */
export function estadoRama(nodos) {
  if (!nodos.length) return "vacia";
  const on = nodos.filter((n) => (n.mode ?? MODO_NORMAL) === MODO_NORMAL).length;
  if (on === nodos.length) return "encendida";
  return on === 0 ? "apagada" : "mixta";
}

/** "RAMA · 8 pasos · borrador" -> "8 pasos · borrador". */
export function etiqueta(titulo, prefijo) {
  const t = String(titulo ?? "").trim();
  const pre = String(prefijo ?? "").trim();
  let resto = pre && normal(t).startsWith(normal(pre)) ? t.slice(pre.length) : t;
  resto = resto.replace(/^[\s·:|\-–—]+/, "").trim();
  return resto || t;
}

/**
 * Enciende `suyos` y apaga `resto` (salvo lo que también sea suyo). Se asigna
 * el modo directo, como el Ctrl+B de ComfyUI: changeMode() de LiteGraph no
 * acepta el 4 (bypass). Devuelve cuántos nodos cambiaron de modo.
 */
function aplicarModos(suyos, resto, apagado) {
  let cambios = 0;
  const poner = (n, modo) => {
    if ((n.mode ?? MODO_NORMAL) === modo) return;
    n.mode = modo;
    cambios++;
  };
  for (const n of suyos) poner(n, MODO_NORMAL);
  for (const n of resto) if (!suyos.has(n)) poner(n, apagado);
  return cambios;
}

/**
 * Enciende una rama y pasa a bypass las demás. Un nodo que cae en la elegida y
 * también en otra queda encendido. Devuelve cuántos nodos cambiaron de modo.
 */
export function encender(graph, grupos, elegido) {
  const suyos = new Set(nodosDe(graph, elegido));
  const resto = new Set(grupos.filter((g) => g !== elegido).flatMap((g) => nodosDe(graph, g)));
  return aplicarModos(suyos, resto, MODO_BYPASS);
}

// --- botones: grupos + propios, con lo que el usuario personalizó -------------

const claveGrupo = (g) => "g:" + String(g.title ?? "").trim();

/**
 * Todos los botones, en el orden en que se ven (también los ocultos):
 * {clave, titulo, color, origen: "grupo"|"propio", grupo?, nodos, oculto}.
 */
export function botonesDe(graph, props = {}) {
  const prefijo = props.prefijo || PREFIJO;
  const ajustes = props.ajustes || {};
  const porId = new Map(nodosGrafo(graph).map((n) => [String(n.id), n]));
  const lista = [
    ...gruposDe(graph, prefijo).map((g) => {
      const clave = claveGrupo(g), a = ajustes[clave] || {};
      return { clave, titulo: a.nombre || etiqueta(g.title, prefijo), color: a.color || null,
        origen: "grupo", grupo: g, nodos: nodosDe(graph, g), oculto: Boolean(a.oculto) };
    }),
    ...(props.botones || []).map((b) => ({
      clave: "b:" + b.id, titulo: b.nombre || "botón", color: b.color || null, origen: "propio",
      nodos: (b.nodos || []).map((id) => porId.get(String(id))).filter((n) => n && n.type !== TIPO),
      oculto: false,
    })),
  ];
  const orden = props.orden || [];
  const puesto = (b) => {
    const i = orden.indexOf(b.clave);
    return i < 0 ? orden.length + lista.indexOf(b) : i;
  };
  return lista.sort((a, b) => puesto(a) - puesto(b));
}

const apagadoDe = (props) => APAGADOS[props?.apagar] || APAGADOS.bypass;

/**
 * Lo que hace un clic en un botón según el modo del interruptor. Solo se tocan
 * los nodos de los botones visibles. Devuelve cuántos nodos cambiaron.
 */
export function pulsar(graph, props, clave) {
  const botones = botonesDe(graph, props).filter((b) => !b.oculto);
  const elegido = botones.find((b) => b.clave === clave);
  if (!elegido) return 0;
  const apagado = apagadoDe(props)[1];
  const modo = props?.modo in MODOS ? props.modo : "una";
  const otros = botones.filter((b) => b !== elegido);
  const encendido = estadoRama(elegido.nodos) === "encendida";
  if (modo === "varias") {
    if (!encendido) return aplicarModos(new Set(elegido.nodos), new Set(), apagado);
    // al apagar uno, lo que comparte con otro encendido se queda como está
    const ajenos = new Set(otros.filter((b) => estadoRama(b.nodos) === "encendida").flatMap((b) => b.nodos));
    return aplicarModos(ajenos, new Set(elegido.nodos), apagado);
  }
  if (modo === "una_o_ninguna" && encendido) {
    return aplicarModos(new Set(), new Set(elegido.nodos), apagado);
  }
  return aplicarModos(new Set(elegido.nodos), new Set(otros.flatMap((b) => b.nodos)), apagado);
}

/** Crea un botón propio con esos nodos. Devuelve su clave. */
export function crearBoton(props, nodos, nombre) {
  const botones = props.botones = props.botones || [];
  const ids = botones.map((b) => Number(String(b.id).replace(/\D/g, "")) || 0);
  const id = "b" + (Math.max(0, ...ids) + 1);
  const usados = new Set(botones.map((b) => b.color));
  const color = Object.keys(PALETA).find((c) => !usados.has(c)) || "ambar";
  botones.push({ id, nombre: String(nombre || "").trim() || `botón ${botones.length + 1}`,
    color, nodos: nodos.map((n) => n.id) });
  return "b:" + id;
}

/** Cambia nombre, color u oculto de un botón (grupo o propio). */
export function ajustar(props, clave, cambios) {
  if (clave.startsWith("b:")) {
    const b = (props.botones || []).find((x) => "b:" + x.id === clave);
    if (!b) return false;
    if ("nombre" in cambios) b.nombre = cambios.nombre;
    if ("color" in cambios) b.color = cambios.color;
    if ("nodos" in cambios) b.nodos = cambios.nodos.map((n) => n.id);
    return true;
  }
  const ajustes = props.ajustes = props.ajustes || {};
  const a = { ...(ajustes[clave] || {}), ...cambios };
  for (const k of Object.keys(a)) if (a[k] === null || a[k] === false || a[k] === "") delete a[k];
  if (Object.keys(a).length) ajustes[clave] = a; else delete ajustes[clave];
  return true;
}

export function borrarBoton(props, clave) {
  props.botones = (props.botones || []).filter((b) => "b:" + b.id !== clave);
  props.orden = (props.orden || []).filter((c) => c !== clave);
}

/** Sube (-1) o baja (+1) un botón entre los visibles; fija el orden completo. */
export function mover(graph, props, clave, delta) {
  const claves = botonesDe(graph, props).filter((b) => !b.oculto).map((b) => b.clave);
  const i = claves.indexOf(clave), j = i + delta;
  if (i < 0 || j < 0 || j >= claves.length) return false;
  [claves[i], claves[j]] = [claves[j], claves[i]];
  props.orden = claves;
  return true;
}

/** Cómo va el interruptor: los botones con su estado y el dato de la cabecera. */
export function resumen(graph, prefijo, props = null) {
  const p = props || { prefijo };
  const ramas = botonesDe(graph, { ...p, prefijo: prefijo || p.prefijo })
    .filter((b) => !b.oculto)
    .map((b) => ({ ...b, nodos: b.nodos.length, estado: estadoRama(b.nodos) }));
  const encendidas = ramas.filter((r) => r.estado === "encendida");
  let cabecera = null;
  if (ramas.length && encendidas.length === 1) {
    const t = encendidas[0].titulo;
    cabecera = { texto: t, corto: t.split(" · ")[0], punto: VERDE };
  } else if (ramas.length && !encendidas.length) {
    cabecera = { texto: "NINGUNA ENCENDIDA", corto: "NINGUNA", punto: TENUE };
  } else if (encendidas.length > 1) {
    cabecera = p.modo === "varias"
      ? { texto: encendidas.map((r) => r.titulo).join(" + "), corto: `${encendidas.length} ENCENDIDAS`, punto: VERDE }
      : { texto: `${encendidas.length} ENCENDIDAS`, corto: "VARIAS", punto: AMBAR };
  }
  return { ramas, cabecera };
}

export function altoPara(numRamas) {
  return CAB + Math.max(1, numRamas) * (FILA + HUECO) + PIE;
}

// --- dibujo -------------------------------------------------------------------

const ESTADO = {
  encendida: ["ENCENDIDA", VERDE],
  mixta: ["MIXTA", AMBAR],
  vacia: ["SIN NODOS", TENUE],
};

const colorDe = (nombre) => PALETA[nombre]?.[1] || AMBAR;

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

function dibujar(ctx, width, y, props, ramas, rects, seleccion) {
  const prefijo = props?.prefijo || PREFIJO;
  const varias = props?.modo === "varias";
  const [, , apagadoTxt, apagadoColor] = apagadoDe(props);
  ctx.save();
  ctx.textBaseline = "middle";

  ctx.font = "9px " + MONO;
  ctx.textAlign = "left";
  ctx.fillStyle = ETQ;
  const etq = varias ? "BOTONES · CLIC PARA ENCENDER O APAGAR" : "RAMAS · CLIC PARA ENCENDER UNA";
  ctx.fillText(etq, PAD, y + 8);
  const tw = ctx.measureText(etq).width;
  ctx.strokeStyle = LINEA;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD + tw + 8, y + 8.5);
  ctx.lineTo(width - PAD, y + 8.5);
  ctx.stroke();

  let yy = y + CAB;
  if (!ramas.length) {
    ctx.font = "11px " + MONO;
    ctx.fillStyle = TENUE;
    ctx.fillText(recortar(ctx, `No hay grupos cuyo título empiece por "${prefijo}".`, width - PAD * 2), PAD, yy + FILA / 2);
    yy += FILA + HUECO;
  }
  for (const r of ramas) {
    const on = r.estado === "encendida";
    const c = colorDe(r.color);
    const x = PAD, w = width - PAD * 2;
    ctx.fillStyle = FONDO_FILA;
    ctx.beginPath(); ctx.roundRect(x, yy, w, FILA, 6); ctx.fill();
    if (on) {
      // ámbar sin elegir conserva el fondo de siempre
      ctx.fillStyle = r.color ? tinte(c, 0.14) : FONDO_ON;
      ctx.beginPath(); ctx.roundRect(x, yy, w, FILA, 6); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x + 0.75, yy + 0.75, w - 1.5, FILA - 1.5, 6); ctx.stroke();
    } else if (r.color) {
      // pestaña de color: el botón se reconoce aunque esté apagado
      ctx.fillStyle = tinte(c, 0.85);
      ctx.beginPath(); ctx.roundRect(x, yy + 7, 3, FILA - 14, 1.5); ctx.fill();
    }
    // indicador: radio para una sola, casilla para varias
    const cx = x + 17, cy = yy + FILA / 2;
    ctx.strokeStyle = on ? c : TENUE; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (varias) ctx.roundRect(cx - 6.5, cy - 6.5, 13, 13, 3); else ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.stroke();
    if (on) {
      ctx.fillStyle = c; ctx.beginPath();
      if (varias) ctx.roundRect(cx - 3.5, cy - 3.5, 7, 7, 1.5); else ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // estado a la derecha
    const [nombre, color] = r.estado === "apagada" ? [apagadoTxt, apagadoColor] : ESTADO[r.estado];
    ctx.font = "600 10px " + MONO;
    ctx.textAlign = "right";
    const cuenta = `${r.nodos} ${r.nodos === 1 ? "nodo" : "nodos"}`;
    ctx.fillStyle = TENUE;
    ctx.fillText(cuenta, x + w - 10, cy);
    const anchoCuenta = ctx.measureText(cuenta).width;
    ctx.fillStyle = color;
    ctx.fillText(nombre, x + w - 10 - anchoCuenta - 10, cy);
    const anchoEstado = ctx.measureText(nombre).width;

    // título del botón
    ctx.font = (on ? "600 " : "") + "12px " + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = on ? TEXTO : "#b9c4c3";
    const libre = w - 34 - anchoCuenta - anchoEstado - 34;
    ctx.fillText(recortar(ctx, r.titulo, libre), x + 32, cy + 0.5);

    rects.push({ x, y: yy, w, h: FILA, clave: r.clave });
    yy += FILA + HUECO;
  }

  // pie: de dónde salen los botones y el atajo para crear uno
  ctx.font = "10px " + MONO;
  ctx.textAlign = "left";
  ctx.fillStyle = TENUE;
  ctx.fillText(recortar(ctx, `Grupos "${prefijo}…" y botones propios · clic derecho: nombre, color, orden`,
    width - PAD * 2), PAD, yy + 7);
  const by = yy + 17;
  if (seleccion.length) {
    const texto = `+ botón con ${seleccion.length} ${seleccion.length === 1 ? "nodo seleccionado" : "nodos seleccionados"}`;
    ctx.font = "600 11px " + MONO;
    const bw = Math.min(width - PAD * 2, ctx.measureText(texto).width + 20);
    ctx.fillStyle = AMBAR;
    ctx.beginPath(); ctx.roundRect(PAD, by, bw, 22, 5); ctx.fill();
    ctx.fillStyle = CHIP_ON_FG;
    ctx.fillText(recortar(ctx, texto, bw - 20), PAD + 10, by + 11.5);
    rects.push({ x: PAD, y: by, w: bw, h: 22, crear: true });
  } else {
    ctx.fillText(recortar(ctx, "Selecciona nodos en el lienzo para crear un botón propio.", width - PAD * 2),
      PAD, by + 11);
  }
  ctx.restore();
}

// --- el nodo --------------------------------------------------------------------

function grafoDe(node) {
  return node?.graph || app.canvas?.graph || app.graph;
}

/** Nodos seleccionados en el lienzo, sin interruptores. */
function seleccionados() {
  const sel = app.canvas?.selected_nodes;
  const lista = sel instanceof Map ? [...sel.values()] : Object.values(sel || {});
  return lista.filter((n) => n && n.type !== TIPO && n.comfyClass !== TIPO);
}

async function pedirTexto(titulo, valor) {
  const dialogo = app.extensionManager?.dialog;
  if (dialogo?.prompt) return dialogo.prompt({ title: titulo, message: "Nombre del botón", defaultValue: valor });
  return globalThis.prompt?.(titulo, valor) ?? null;
}

function crearClase() {
  const Base = globalThis.LGraphNode || globalThis.LiteGraph?.LGraphNode;
  class Interruptor extends Base {
    constructor(title) {
      super(title);
      this.comfyClass = TIPO;
      this.isVirtualNode = true;
      this.serialize_widgets = false;
      this.color = COLOR_BASE;
      this.bgcolor = "#172123";
      this.properties = this.properties || {};
      if (!this.properties.prefijo) this.properties.prefijo = PREFIJO;
      const nodo = this;

      const campo = this.addWidget("text", "prefijo", this.properties.prefijo, (v) => {
        nodo.properties.prefijo = String(v ?? "").trim() || PREFIJO;
        campo.value = nodo.properties.prefijo;
        nodo.setDirtyCanvas(true, true);
      }, { serialize: false });
      campo.label = "grupos que empiezan por";
      campo.serialize = false;
      this.__campo = campo;

      // La selección se recuerda mientras no sea solo este nodo: pulsar el
      // interruptor lo selecciona, y el botón tiene que saber qué había antes.
      const estado = { rects: [], ramas: 0, seleccion: [] };
      this.__estado = estado;
      const widget = this.addCustomWidget({
        type: "cineconia_interruptor",
        name: "__interruptor",
        value: null,
        options: { serialize: false },
        serialize: false,
        computeSize(width) { return [width, altoPara(estado.ramas)]; },
        draw(ctx, n, width, y) {
          const { ramas } = resumen(grafoDe(n), n.properties?.prefijo || PREFIJO, n.properties);
          const rects = [];
          dibujar(ctx, width, y, n.properties, ramas, rects, estado.seleccion);
          // las zonas de clic, solo del lienzo del grafo (no del panel lateral)
          if (!esLienzoPrincipal(ctx)) return;
          estado.rects = rects;
          const sel = seleccionados();
          if (sel.length) estado.seleccion = sel;
          else if (!n.selected) estado.seleccion = [];
          // crece o encoge con el número de ramas
          if (ramas.length !== estado.ramas) {
            estado.ramas = ramas.length;
            const alto = n.computeSize()[1];
            if (Math.abs(n.size[1] - alto) > 1) n.setSize?.([n.size[0], alto]);
          }
        },
        mouse(event, pos, n) {
          if (event.type !== "pointerdown" && event.type !== "mousedown") return false;
          const r = estado.rects.find((q) => pos[0] >= q.x && pos[0] <= q.x + q.w && pos[1] >= q.y && pos[1] <= q.y + q.h);
          if (!r) return false;
          if (r.crear) { n.crearConSeleccion(); return true; }
          pulsar(grafoDe(n), n.properties, r.clave);
          n.refrescar();
          return true;
        },
      });
      anchoFijoAlNodo(widget);
      this.size = [440, this.computeSize()[1]];
      // La cápsula de la cabecera (cineconia_cabecera.js) lee este dato. Se
      // calcula al pedirlo: la cabecera se pinta antes que el cuerpo y así no
      // queda un cuadro atrás después de un clic.
      Object.defineProperty(this, "__cabeceraDato", {
        configurable: true,
        enumerable: false,
        get() { return resumen(grafoDe(nodo), nodo.properties?.prefijo || PREFIJO, nodo.properties).cabecera; },
      });
    }

    refrescar() {
      const graph = grafoDe(this);
      graph?.setDirtyCanvas?.(true, true);
      app.canvas?.setDirty?.(true, true);
      // marca el workflow como modificado: properties viaja en el JSON guardado
      graph?.change?.();
    }

    async crearConSeleccion() {
      const nodos = this.__estado?.seleccion || [];
      if (!nodos.length) return;
      const nombre = await pedirTexto("Nuevo botón del interruptor",
        `botón ${(this.properties.botones || []).length + 1}`);
      if (nombre === null || nombre === undefined) return;
      crearBoton(this.properties, nodos, nombre);
      this.refrescar();
    }

    async renombrar(b) {
      const nombre = await pedirTexto("Renombrar botón", b.titulo);
      if (nombre === null || nombre === undefined) return;
      ajustar(this.properties, b.clave, { nombre: String(nombre).trim() || null });
      this.refrescar();
    }

    getExtraMenuOptions(canvas, options) {
      const props = this.properties;
      const graph = grafoDe(this);
      const botones = botonesDe(graph, props);
      const hecho = (fn) => () => { fn(); this.refrescar(); };
      const marca = (si, txt) => (si ? "✓ " : "   ") + txt;
      const sel = this.__estado?.seleccion || [];
      const menu = [
        { content: "Interruptor · modo", has_submenu: true, submenu: { options:
          Object.entries(MODOS).map(([v, txt]) => ({ content: marca((props.modo || "una") === v, txt),
            callback: hecho(() => { props.modo = v; }) })) } },
        { content: "Interruptor · al apagar", has_submenu: true, submenu: { options:
          Object.entries(APAGADOS).map(([v, [txt]]) => ({ content: marca((props.apagar || "bypass") === v, txt),
            callback: hecho(() => { props.apagar = v; }) })) } },
      ];
      if (sel.length) {
        menu.push({ content: `Interruptor · + botón con ${sel.length} nodos seleccionados`,
          callback: () => this.crearConSeleccion() });
      }
      for (const b of botones.filter((x) => !x.oculto)) {
        const sub = [
          { content: "Renombrar…", callback: () => this.renombrar(b) },
          { content: "Color", has_submenu: true, submenu: { options:
            Object.entries(PALETA).map(([v, [txt]]) => ({ content: marca((b.color || "ambar") === v, txt),
              callback: hecho(() => ajustar(props, b.clave, { color: v === "ambar" && b.origen === "grupo" ? null : v })) })) } },
          { content: "Subir", callback: hecho(() => mover(graph, props, b.clave, -1)) },
          { content: "Bajar", callback: hecho(() => mover(graph, props, b.clave, +1)) },
        ];
        if (b.origen === "propio") {
          sub.push({ content: `Usar los ${sel.length} nodos seleccionados`, disabled: !sel.length,
            callback: hecho(() => ajustar(props, b.clave, { nodos: sel })) });
          sub.push({ content: "Borrar botón", callback: hecho(() => borrarBoton(props, b.clave)) });
        } else {
          sub.push({ content: "Ocultar (sus nodos no se tocan)", callback: hecho(() => ajustar(props, b.clave, { oculto: true })) });
          if (props.ajustes?.[b.clave]) {
            sub.push({ content: "Volver al nombre y color del grupo",
              callback: hecho(() => ajustar(props, b.clave, { nombre: null, color: null })) });
          }
        }
        menu.push({ content: `Botón · ${b.titulo}`, has_submenu: true, submenu: { options: sub } });
      }
      const ocultos = botones.filter((x) => x.oculto);
      if (ocultos.length) {
        menu.push({ content: "Botones ocultos", has_submenu: true, submenu: { options:
          ocultos.map((b) => ({ content: "Mostrar " + b.titulo, callback: hecho(() => ajustar(props, b.clave, { oculto: null })) })) } });
      }
      options.push(null, ...menu);
    }

    onConfigure() {
      if (!this.properties?.prefijo) this.properties.prefijo = PREFIJO;
      if (this.__campo) this.__campo.value = this.properties.prefijo;
    }

    onPropertyChanged(name, value) {
      if (name === "prefijo" && this.__campo) this.__campo.value = String(value ?? "").trim() || PREFIJO;
      return true;
    }
  }
  Interruptor.title = "Cine con IA · Interruptor";
  Interruptor.category = "Cine con IA";
  Interruptor.collapsable = true;
  Interruptor.__cineCabecera = true;
  Interruptor.title_text_color = "#f3f6f5";
  Object.defineProperty(Interruptor.prototype, "titleFontStyle", {
    configurable: true,
    get() {
      const L = globalThis.LiteGraph;
      return `600 ${L?.NODE_TEXT_SIZE ?? 14}px ${L?.NODE_FONT ?? "Inter"}`;
    },
  });
  Interruptor.prototype.onDrawTitleBar = pintarCabecera;
  return Interruptor;
}

app.registerExtension({
  name: "cineconia.interruptor",
  registerCustomNodes() {
    globalThis.LiteGraph.registerNodeType(TIPO, crearClase());
  },
});
