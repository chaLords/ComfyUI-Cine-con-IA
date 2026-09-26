import { app } from "../../scripts/app.js";
import { pintarCabecera, COLOR_BASE, anchoFijoAlNodo, esLienzoPrincipal } from "./cineconia_cabecera.js";

/**
 * Cine con IA · Interruptor
 *
 * Nodo solo de interfaz (no va al servidor). Lista los grupos del workflow cuyo
 * título empieza por un prefijo ("RAMA" por defecto) y deja encendido uno solo:
 * al hacer clic en una rama, sus nodos pasan a modo normal y los de las demás
 * ramas a bypass (violeta), que ComfyUI no ejecuta. Es un selector de una sola
 * opción, como una radio.
 *
 * Un nodo pertenece a un grupo si su centro cae dentro del grupo. El estado que
 * se ve sale siempre de los nodos (su modo real), así que un bypass puesto a mano
 * también se refleja. Solo cambia el modo de los nodos de esas ramas: lo demás
 * del workflow no se toca.
 */

export const TIPO = "CineInterruptor";
export const PREFIJO = "RAMA";
export const MODO_NORMAL = 0;
export const MODO_BYPASS = 4;

const MONO = "'IBM Plex Mono', Consolas, monospace";
const PAD = 10;
const CAB = 18;
const FILA = 34;
const HUECO = 6;
const PIE = 30;
const AMBAR = "#f0a154";
const VERDE = "#3f8e63";
const VIOLETA = "#c85bd6";
const TENUE = "#8b9a9b";
const TEXTO = "#e3edec";
const ETQ = "#6f7d7e";
const LINEA = "#394446";
const FONDO_FILA = "#20282a";
const FONDO_ON = "#2b2419";

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

/** Nodos cuyo centro cae en el grupo. Los interruptores nunca se apagan a sí mismos. */
export function nodosDe(graph, grupo) {
  const r = rectGrupo(grupo);
  if (!r) return [];
  const todos = graph?._nodes || graph?.nodes || [];
  return todos.filter((n) => n && n.type !== TIPO && dentro(centroNodo(n), r));
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
 * Enciende una rama y pasa a bypass las demás. Un nodo que cae en la elegida y
 * también en otra queda encendido. Devuelve cuántos nodos cambiaron de modo.
 */
export function encender(graph, grupos, elegido) {
  const suyos = new Set(nodosDe(graph, elegido));
  const resto = new Set();
  for (const g of grupos) {
    if (g === elegido) continue;
    for (const n of nodosDe(graph, g)) if (!suyos.has(n)) resto.add(n);
  }
  let cambios = 0;
  // Se asigna el modo directo, como el Ctrl+B de ComfyUI: changeMode() de
  // LiteGraph no acepta el 4 (bypass).
  const poner = (n, modo) => {
    if ((n.mode ?? MODO_NORMAL) === modo) return;
    n.mode = modo;
    cambios++;
  };
  for (const n of suyos) poner(n, MODO_NORMAL);
  for (const n of resto) poner(n, MODO_BYPASS);
  return cambios;
}

/** Cómo va el interruptor: las ramas con su estado y el dato de la cabecera. */
export function resumen(graph, prefijo) {
  const ramas = gruposDe(graph, prefijo).map((g) => {
    const nodos = nodosDe(graph, g);
    return { grupo: g, titulo: etiqueta(g.title, prefijo), nodos: nodos.length, estado: estadoRama(nodos) };
  });
  const encendidas = ramas.filter((r) => r.estado === "encendida");
  let cabecera = null;
  if (ramas.length && encendidas.length === 1) {
    const t = encendidas[0].titulo;
    cabecera = { texto: t, corto: t.split(" · ")[0], punto: VERDE };
  } else if (ramas.length && !encendidas.length) {
    cabecera = { texto: "NINGUNA ENCENDIDA", corto: "NINGUNA", punto: TENUE };
  } else if (encendidas.length > 1) {
    cabecera = { texto: `${encendidas.length} ENCENDIDAS`, corto: "VARIAS", punto: AMBAR };
  }
  return { ramas, cabecera };
}

export function altoPara(numRamas) {
  return CAB + Math.max(1, numRamas) * (FILA + HUECO) + PIE;
}

// --- dibujo -------------------------------------------------------------------

const ESTADO = {
  encendida: ["ENCENDIDA", VERDE],
  apagada: ["BYPASS", VIOLETA],
  mixta: ["MIXTA", AMBAR],
  vacia: ["SIN NODOS", TENUE],
};

function recortar(ctx, texto, ancho) {
  let s = String(texto);
  if (ctx.measureText(s).width <= ancho) return s;
  while (s.length > 1 && ctx.measureText(s + "…").width > ancho) s = s.slice(0, -1);
  return s + "…";
}

function dibujar(ctx, width, y, prefijo, ramas, rects) {
  ctx.save();
  ctx.textBaseline = "middle";

  ctx.font = "9px " + MONO;
  ctx.textAlign = "left";
  ctx.fillStyle = ETQ;
  const etq = "RAMAS · CLIC PARA ENCENDER UNA";
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
    const x = PAD, w = width - PAD * 2;
    ctx.fillStyle = on ? FONDO_ON : FONDO_FILA;
    ctx.beginPath(); ctx.roundRect(x, yy, w, FILA, 6); ctx.fill();
    if (on) {
      ctx.strokeStyle = AMBAR; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x + 0.75, yy + 0.75, w - 1.5, FILA - 1.5, 6); ctx.stroke();
    }
    // botón de radio
    const cx = x + 17, cy = yy + FILA / 2;
    ctx.strokeStyle = on ? AMBAR : TENUE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.stroke();
    if (on) { ctx.fillStyle = AMBAR; ctx.beginPath(); ctx.arc(cx, cy, 3.8, 0, Math.PI * 2); ctx.fill(); }

    // estado a la derecha
    const [nombre, color] = ESTADO[r.estado];
    ctx.font = "600 10px " + MONO;
    ctx.textAlign = "right";
    const cuenta = `${r.nodos} ${r.nodos === 1 ? "nodo" : "nodos"}`;
    ctx.fillStyle = TENUE;
    ctx.fillText(cuenta, x + w - 10, cy);
    const anchoCuenta = ctx.measureText(cuenta).width;
    ctx.fillStyle = color;
    ctx.fillText(nombre, x + w - 10 - anchoCuenta - 10, cy);
    const anchoEstado = ctx.measureText(nombre).width;

    // título de la rama
    ctx.font = (on ? "600 " : "") + "12px " + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = on ? TEXTO : "#b9c4c3";
    const libre = w - 34 - anchoCuenta - anchoEstado - 34;
    ctx.fillText(recortar(ctx, r.titulo, libre), x + 32, cy + 0.5);

    rects.push({ x, y: yy, w, h: FILA, grupo: r.grupo });
    yy += FILA + HUECO;
  }

  ctx.font = "10px " + MONO;
  ctx.textAlign = "left";
  ctx.fillStyle = TENUE;
  ctx.fillText(recortar(ctx, `Grupos cuyo título empieza por "${prefijo}".`, width - PAD * 2), PAD, yy + 7);
  ctx.fillText(recortar(ctx, "Las ramas apagadas quedan en violeta y no se ejecutan.", width - PAD * 2), PAD, yy + 21);
  ctx.restore();
}

// --- el nodo --------------------------------------------------------------------

function grafoDe(node) {
  return node?.graph || app.canvas?.graph || app.graph;
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

      const estado = { rects: [], ramas: 0 };
      const widget = this.addCustomWidget({
        type: "cineconia_interruptor",
        name: "__interruptor",
        value: null,
        options: { serialize: false },
        serialize: false,
        computeSize(width) { return [width, altoPara(estado.ramas)]; },
        draw(ctx, n, width, y) {
          const prefijo = n.properties?.prefijo || PREFIJO;
          const { ramas } = resumen(grafoDe(n), prefijo);
          const rects = [];
          dibujar(ctx, width, y, prefijo, ramas, rects);
          // las zonas de clic, solo del lienzo del grafo (no del panel lateral)
          if (!esLienzoPrincipal(ctx)) return;
          estado.rects = rects;
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
          const graph = grafoDe(n);
          encender(graph, gruposDe(graph, n.properties?.prefijo || PREFIJO), r.grupo);
          graph?.setDirtyCanvas?.(true, true);
          app.canvas?.setDirty?.(true, true);
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
        get() { return resumen(grafoDe(nodo), nodo.properties?.prefijo || PREFIJO).cabecera; },
      });
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
