import { app } from "../../scripts/app.js";

/**
 * Interfaz de los nodos H3 nuevos: logo, chips, faders y barra de carga.
 *
 * Archivo aparte a proposito: no toca cineconia.js. ComfyUI carga todos los
 * .js de WEB_DIRECTORY, asi que esta extension se registra sola. Como las
 * constantes y helpers de cineconia.js son de modulo y no se exportan, aqui
 * se repiten los pocos que hacen falta, con los mismos valores.
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
const ROJO = "#ff0033";
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
  "CineCameraDirectorH3",
];

// Copia de profiles.py y de memory_planner.py. Si se toca una, se toca la otra.
const PERFILES = {
  // Los pasos valen 20 en todos los perfiles a proposito: son secuenciales,
  // asi que no suben el pico de VRAM. Lo que cambia con la tarjeta es el
  // troceo, si hay segundo pase y con que escala.
  "8 GB":  { pasos: 20, troceo: 32, escala: 1.00, refinar: false, cap: 0.75 },
  "12 GB": { pasos: 20, troceo: 24, escala: 1.15, refinar: true,  cap: 1.10 },
  "16 GB": { pasos: 20, troceo: 20, escala: 1.20, refinar: true,  cap: 1.55 },
  "24 GB": { pasos: 20, troceo: 16, escala: 1.25, refinar: true,  cap: 2.45 },
  "32 GB": { pasos: 20, troceo: 8,  escala: 1.50, refinar: true,  cap: 3.35 },
};
const ORDEN_PERFILES = ["AUTO", "8 GB", "12 GB", "16 GB", "24 GB", "32 GB"];

// Donde deja cada preset los cuatro faders. Propuesta coherente con los
// perfiles, no una medicion: se ajusta aqui cuando haya benchmarks reales.
const PRESETS = {
  // El perfil solo mueve lo que afecta al pico de memoria: el ahorro, la
  // escala del segundo pase y si lo hay. La calidad y el detalle son tiempo,
  // no memoria, y los decide el usuario: el preset no los toca.
  "8 GB":  { resolucion: 35, ahorro_vram: 90, refinar: false },
  "12 GB": { resolucion: 50, ahorro_vram: 70, refinar: true },
  "16 GB": { resolucion: 60, ahorro_vram: 50, refinar: true },
  "24 GB": { resolucion: 70, ahorro_vram: 30, refinar: true },
  "32 GB": { resolucion: 80, ahorro_vram: 10, refinar: true },
};

const MODOS = [["auto", "Auto"], ["manual", "Manual"], ["avanzado", "Advanced"]];

const findWidget = (node, name) => node?.widgets?.find((w) => w.name === name);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const valor = (node, name, porDefecto = 0) => Number(findWidget(node, name)?.value ?? porDefecto);

/** round() de Python: los empates van al par. Math.round(0.5) da 1, Python da 0. */
function redondear(v) {
  const abajo = Math.floor(v);
  if (Math.abs(v - abajo - 0.5) > 1e-9) return Math.round(v);
  return abajo % 2 === 0 ? abajo : abajo + 1;
}

const encajar = (v, mult = 32) => Math.max(mult, Math.round(v / mult) * mult);

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

/**
 * LiteGraph guarda por el indice completo del widget pero al restaurar
 * consume los valores seguidos saltando los que llevan serialize:false. Si
 * nuestros widgets visuales van delante, eso deja huecos y desplaza todos los
 * controles reales. Esta funcion quita esos huecos usando la lista de widgets
 * como mapa, sin tocar el valor de ningun control. Es la misma reparacion que
 * compactarValoresWidgets() hace en cineconia.js.
 */
function compactarValores(node, valores) {
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
        const on = String(target.value) === String(val);
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

function perfilDe(node) {
  const nombre = String(findWidget(node, "perfil")?.value || "AUTO");
  return PERFILES[nombre] || PERFILES["16 GB"];
}
const esAuto = (node) => String(findWidget(node, "perfil")?.value || "AUTO") === "AUTO";

function pasosDe(node) {
  return clamp(perfilDe(node).pasos + redondear((valor(node, "calidad") - 60) / 10), 4, 30);
}
function escalaDe(node) {
  if (!findWidget(node, "refinar")?.value) return 1.0;
  return Math.round(clamp(perfilDe(node).escala + (valor(node, "resolucion") - 60) / 200, 1.0, 2.0) * 100) / 100;
}
function troceoDe(node) {
  return clamp(perfilDe(node).troceo + redondear((valor(node, "ahorro_vram") / 100) * 12), 1, 64);
}

const leerCalidad = (n) => pasosDe(n) + " pasos" + (esAuto(n) ? " ·auto" : "");
function leerDetalle(n, v) {
  if (!findWidget(n, "refinar")?.value) return "sin refinado";
  if (v >= 82) return "5 pasos · máxima";
  if (v >= 48) return "4 pasos · recom.";
  return "3 pasos · rápido";
}
function leerResolucion(n) {
  if (!findWidget(n, "refinar")?.value) return "sin refinado";
  const e = escalaDe(n);
  const an = valor(n, "width"), al = valor(n, "height");
  if (!an || !al) return "x" + e.toFixed(2);
  return "x" + e.toFixed(2) + " → " + encajar(an * e) + "x" + encajar(al * e);
}
const leerAhorro = (n) => "troceo " + troceoDe(n) + "/" + troceoDe(n);

// --- barra de carga (espejo de memory_planner.py) --------------------------

function planificar(node) {
  const an = Math.max(32, valor(node, "width", 416));
  const al = Math.max(32, valor(node, "height", 736));
  const fr = Math.max(1, valor(node, "frames", 192));
  const ah = clamp(valor(node, "ahorro_vram"), 0, 100);
  const refinar = !!findWidget(node, "refinar")?.value;

  const base = ((an * al) / (416 * 736)) * (fr / 192);
  // espejo de memory_planner.py: calidad, detalle y movimiento no entran,
  // porque los pasos son secuenciales y no suben el pico de memoria
  const controles = 1.0;
  const segundo = refinar ? base * Math.pow(Math.max(1, escalaDe(node)), 2) * 0.34 : 0;
  const ahorro = 1 - (ah / 100) * 0.18;
  const carga = (base * controles + segundo) * ahorro;
  const ratio = carga / perfilDe(node).cap;

  let estado = "SAFE", color = VERDE;
  if (ratio > 1.0) { estado = "RISKY"; color = ROJO; }
  else if (ratio > 0.76) { estado = "TIGHT"; color = ACCENT; }

  // El consejo tiene que servir para algo: si el ahorro ya esta al tope,
  // pedir mas troceo es pedir algo que el usuario ya hizo. Lo unico que
  // queda entonces es pedir menos video.
  let consejo = "mantener los valores del perfil";
  if (estado !== "SAFE") {
    if (ah >= 80) consejo = "reduce la duración o la resolución: no cabe en este perfil";
    else consejo = "aumentar troceo de atención/FFN";
  }
  if (estado === "RISKY" && refinar && ah < 80) {
    consejo = "reducir la escala del segundo pase o apagarlo";
  }
  return { estado, color, ratio, consejo };
}

function addBarra(node) {
  const ALTO = CAB + 20 + 16;
  const w = {
    type: "cineconia_barra",
    name: "__barra",
    value: null,
    options: { serialize: false },
    serialize: false,
    computeSize(width) { return [width, ALTO]; },
    draw(ctx, n, width, y) {
      const p = planificar(n);
      ctx.save();
      ctx.textBaseline = "middle";
      cabecera(ctx, "carga estimada", width, y + 8);

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
      const nota = esAuto(n) ? p.consejo + "  ·  estimado sobre 16 GB" : p.consejo;
      ctx.fillText(nota, PAD, by + 22);
      ctx.restore();
    },
  };
  node.widgets.push(w);
  return w;
}

// --- montaje del Optimizador ----------------------------------------------

function montarOptimizador(node) {
  const faders = {};

  addLogo(node);

  const chipPerfil = addChipsSimple(
    node, "perfil", "perfil de vram",
    ORDEN_PERFILES.map((p) => [p, p]),
    (n, val) => aplicarPreset(n, val),
  );

  addChipsSimple(node, "modo", "modo", MODOS.map(([, v]) => [v.toLowerCase(), v]));

  faders.calidad = addFader(node, "calidad", "calidad", leerCalidad);
  faders.detalle = addFader(node, "detalle", "detalle", leerDetalle);
  faders.resolucion = addFader(node, "resolucion", "resolución", leerResolucion);
  faders.ahorro_vram = addFader(node, "ahorro_vram", "ahorro", leerAhorro);

  addBarra(node);

  // los nativos que reemplazan los faders y los chips se ocultan; el valor
  // sigue en su sitio, asi que los workflows guardados no se enteran
  for (const nombre of ["calidad", "detalle", "resolucion", "ahorro_vram", "perfil", "modo", "movimiento"]) {
    ocultar(findWidget(node, nombre));
  }

  // los nuestros van arriba, en el orden de la maqueta
  const mios = node.widgets.filter((w) => String(w.name || "").startsWith("__"));
  node.widgets = node.widgets.filter((w) => !mios.includes(w));
  node.widgets.unshift(...mios);

  // ...y por eso hay que reparar los valores al abrir un workflow: ver
  // compactarValores(). Sin esto, los controles reales reciben el valor del
  // de al lado y el nodo miente sin avisar.
  const configurarAntes = node.onConfigure;
  node.onConfigure = function (info) {
    if (info && Array.isArray(info.widgets_values)) {
      info.widgets_values = compactarValores(this, info.widgets_values);
    }
    const r = configurarAntes?.apply(this, arguments);
    setTimeout(() => { this.__cineCustom?.(); this.setDirtyCanvas(true, true); }, 0);
    return r;
  };

  function aplicarPreset(n, nombrePerfil) {
    const preset = PRESETS[nombrePerfil];
    if (!preset) return;                 // AUTO no mueve nada: decide Python
    for (const [clave, val] of Object.entries(preset)) {
      if (clave === "refinar") {
        const w = findWidget(n, "refinar");
        if (w) { w.value = val; w.callback?.(val); }
      } else {
        faders[clave]?.animarHacia(val);
      }
    }
    n.__cinePresetAplicado = nombrePerfil;
    n.setDirtyCanvas(true, true);
  }

  // estado CUSTOM: se deduce comparando, no se guarda en el workflow
  node.__cineCustom = () => {
    const p = String(findWidget(node, "perfil")?.value || "");
    const preset = PRESETS[p];
    if (!preset) return;
    const igual = Object.entries(preset).every(([k, v]) =>
      k === "refinar" ? !!findWidget(node, "refinar")?.value === v : valor(node, k) === v);
    node.__cineEsCustom = !igual;
  };

  // el sufijo CUSTOM se pinta sobre el chip de perfil
  const dibujoChip = chipPerfil.draw;
  chipPerfil.draw = function (ctx, n, width, y) {
    dibujoChip.call(this, ctx, n, width, y);
    if (!n.__cineEsCustom) return;
    ctx.save();
    ctx.font = "9px " + MONO;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = ACCENT_CLARO;
    ctx.fillText("• CUSTOM", width - PAD, y + 8);
    ctx.restore();
  };

  node.__cineCustom();
}

app.registerExtension({
  name: "cineconia.faders",

  async nodeCreated(node) {
    const clase = node?.comfyClass;
    if (!NODOS_H3.includes(clase) || !node.widgets) return;
    if (node.widgets.some((w) => String(w.name || "").startsWith("__"))) return;

    if (clase === "CineH3Optimizer") {
      montarOptimizador(node);
      node.setSize([Math.max(node.size?.[0] || 0, 400), node.computeSize()[1]]);
    } else {
      // los otros tres solo reciben la marca, para que no desentonen
      addLogo(node);
      const logo = node.widgets.pop();
      node.widgets.unshift(logo);
      node.setSize([Math.max(node.size?.[0] || 0, 340), node.computeSize()[1]]);
    }
  },
});
