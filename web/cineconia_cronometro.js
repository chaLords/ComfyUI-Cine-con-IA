import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { pintarCabecera, COLOR_BASE, anchoFijoAlNodo, esLienzoPrincipal } from "./cineconia_cabecera.js";

/**
 * Cine con IA · Cronómetro
 *
 * Nodo solo de interfaz: no se envía con el prompt ni cambia el render. Mide cada
 * ejecución: reloj en vivo, el paso del muestreo, cuánto tardó cada nodo y un
 * historial de las últimas corridas para comparar, por ejemplo, el render normal
 * contra el progresivo. El historial se guarda con el workflow.
 *
 * El total sale de las marcas de tiempo del servidor (inicio y fin de la
 * ejecución); el desglose por nodo, de los avisos "executing" que ComfyUI manda
 * al pasar de un nodo al siguiente. Los nodos en caché no cuentan: no corrieron.
 *
 * Cada corrida del historial guarda también con qué se hizo (modelo de
 * cualquier cargador, LoRA, pasos, sampler, progresivo, refinado, semilla,
 * resolución final, duración, rama del Interruptor o del Selector) y
 * su desglose por nodo: un clic en la corrida lo vuelve a mostrar. "Copiar
 * tabla" deja todo el historial listo para pegar en una planilla.
 *
 * Los modelos y LoRA conocidos se anotan con su nombre oficial (MiniMax H3
 * Ref2VA, Singularity Ref2VA v1.3, TaoMate-H3...). Y cada corrida que termina
 * con un Cronómetro en el lienzo se suma a un registro permanente que guarda
 * el servidor (user/default/cineconia/registro_cronometro.csv): no se borra
 * con "Borrar historial" ni al cambiar de workflow.
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

/** [{nombre: "TAO", fuerza: 1}] -> "TAO ×1"; varias LoRA van unidas con "+". */
export function textoLoras(loras) {
  return (loras || []).map((l) => `${l.nombre} ×${l.fuerza}`).join(" + ");
}

/**
 * Una fila del historial en dos partes: lo que distingue la corrida (modelo,
 * pasos, LoRA, progresivo, resolución) a la izquierda y el total a la
 * derecha, para que el tiempo no se corte aunque la fila sea larga.
 */
export function partesHistorial(e) {
  const estado = e.estado && e.estado !== "listo" ? e.estado : "";
  const d = e.detalle;
  if (d) {
    const partes = [e.cuando];
    const modelo = modeloDe(d);
    if (modelo) partes.push(modelo);
    if (d.pasos) partes.push(`${d.pasos}p`);
    const loras = textoLoras(lorasDe(d));
    if (loras) partes.push(loras);
    if (d.progresivo === "sí") partes.push("progresivo");
    else if (d.progresivo) partes.push(`progresivo ${d.progresivo}`);
    if (d.resolucion) partes.push(d.resolucion);
    return { texto: partes.join(" · "), total: [formatoCorto(e.total), estado].filter(Boolean).join(" · ") };
  }
  const partes = [e.cuando, `total ${formatoCorto(e.total)}`];
  for (const r of e.renders || []) partes.push(`${r.modo} ${formatoCorto(r.ms)}`);
  if (estado) partes.push(estado);
  return { texto: partes.join(" · "), total: "" };
}

export function textoHistorial(e) {
  const p = partesHistorial(e);
  return p.total ? `${p.texto} · ${p.total}` : p.texto;
}

/**
 * El resto de lo que distingue una corrida, para la línea bajo el reloj:
 * sampler, LoRA, progresivo, refinado, semilla y lo que marcaba el Selector.
 */
export function lineaDetalle(d) {
  if (!d) return "";
  const partes = [];
  if (d.sampler) partes.push(d.scheduler ? `${d.sampler}/${d.scheduler}` : String(d.sampler));
  if (d.acelerador) partes.push(`acelerador ${d.acelerador}`);
  if (d.tarea) partes.push(`${d.tarea}${d.referencias ? ` · ${d.referencias}` : ""}`);
  if (Array.isArray(d.loras)) partes.push(d.loras.length ? "LoRA " + textoLoras(lorasDe(d)) : "sin LoRA");
  if (d.progresivo === "sí") partes.push("progresivo" + (d.progresivo_paso ? " " + d.progresivo_paso : ""));
  else if (d.progresivo) partes.push(`progresivo ${d.progresivo}`);
  if (d.refinado) partes.push(d.refinado === "no" ? "sin refinado" : `refina ${d.refinado}`);
  if (d.semilla != null && d.semilla !== "") partes.push(`semilla ${d.semilla}`);
  if (d.rama) partes.push(`Selector: ${d.rama}`);
  return partes.join(" · ");
}

// Etiquetas de precisión y empaquetado que no ayudan a distinguir un archivo.
const RUIDO_NOMBRE = /^(bf16|fp16|fp32|fp8|e4m3fn|e5m2|int4|int8|nvfp4|awq|scaled|pruned|convrot|comfyui|comfy|rank\d+)$/i;

/**
 * Nombre corto y legible de cualquier archivo de modelo o LoRA:
 * "wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors" -> "wan2.2 i2v high noise 14B".
 * Si no entra, se corta entre palabras.
 */
export function nombreCorto(archivo, max = 28, quitar = []) {
  let base = String(archivo || "").split(/[\\/]/).pop().replace(/\.(safetensors|gguf|ckpt|pt|pth|bin|sft)$/i, "");
  if (!base) return "";
  base = base.replace(/Q(\d)_K_([SML])/gi, "Q$1K$2");      // cuantización GGUF: Q4_K_M -> Q4KM
  const fuera = quitar.map((q) => q.toLowerCase());
  let partes = base.split(/[_\-\s]+/).filter((t) => t && !RUIDO_NOMBRE.test(t) && !fuera.includes(t.toLowerCase()));
  if (!partes.length) partes = [base];
  if (partes.join(" ").length <= max) return partes.join(" ");
  while (partes.length > 1 && partes.join(" ").length + 1 > max) partes = partes.slice(0, -1);
  const s = partes.join(" ");
  return (s.length > max - 1 ? s.slice(0, max - 1) : s) + "…";
}

/** El nombre del archivo sin carpeta ni extensión. */
function baseDe(archivo) {
  return String(archivo || "").split(/[\\/]/).pop().replace(/\.(safetensors|gguf|ckpt|pt|pth|bin|sft)$/i, "");
}

/** "..._v1.3_int8" -> "1.3"; "" si el archivo no trae versión. */
const versionDe = (base) => base.match(/[_\-\s]v(\d+(?:\.\d+)*)/i)?.[1] || "";

/**
 * Lo que cambia la calidad dentro de un mismo modelo y conviene ver: pesos
 * w4a8 o nvfp4, o la cuantización de un GGUF (Q4_K_M -> Q4KM).
 */
function varianteDe(base, gguf) {
  const out = [];
  const w = base.match(/(?:^|[_\-.])(w4a8|nvfp4)(?=$|[_\-.])/i);
  if (w) out.push(w[1].toLowerCase());
  const q = gguf ? base.match(/(?:^|[_\-.])(Q\d(?:_K)?(?:_[SML0-9])?)(?=$|[_\-.])/) : null;
  if (q) out.push(q[1].replace("_K", "K").replace(/K_([SML])/, "K$1"));
  return out.join(" ");
}

/**
 * Nombres oficiales, como los publica cada autor, para que el historial y el
 * registro distingan de verdad un modelo de otro. Cada regla: el patrón del
 * archivo y cómo armar el nombre.
 */
const MODELOS_OFICIALES = [
  // Singularity (WarmBloodAban): un ajuste fino de MiniMax H3
  [/singularity/i, (b) => "Singularity" + (/ref2va/i.test(b) ? " Ref2VA" : /fl2va/i.test(b) ? " FL2VA" : "")
    + (versionDe(b) ? " v" + versionDe(b) : "")],
  // MiniMax H3: las dos variantes que publica MiniMax
  [/minimax[_\-]?h3[_\-]?ref2va/i, () => "MiniMax H3 Ref2VA"],
  [/minimax[_\-]?h3[_\-]?fl2va/i, () => "MiniMax H3 FL2VA"],
  // Wan 2.2 (Wan-AI): Wan2.2-I2V-A14B, Wan2.2-T2V-A14B, Wan2.2-TI2V-5B, Wan2.2-Animate-14B...
  // Las dos mitades (high y low noise) son un solo modelo.
  [/wan2\.?2[_\-](i2v|t2v|ti2v|s2v|animate)(?=$|[_\-.])/i, (b, m) => {
    const modo = /^animate$/i.test(m[1]) ? "Animate" : m[1].toUpperCase();
    const t = b.match(/[_\-](\d+)B(?=$|[_\-.])/i)?.[1];
    const tam = !t ? "" : /^[it]2v$/i.test(m[1]) && t === "14" ? " A14B" : ` ${t}B`;
    return `Wan2.2 ${modo}${tam}`;
  }],
  // LTX-2.5 (Lightricks): el destilado o el dev
  [/ltx[_\-]?2\.5[_\-](?:(\d+)b[_\-])?(distilled|dev)/i, (b, m) =>
    `LTX-2.5${m[1] ? ` ${m[1]}B` : ""} ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}`],
  // HunyuanVideo 1.5 (Tencent): resolución, tarea y si viene destilado
  [/hunyuanvideo[_\-]?1\.5[_\-](\d+p)[_\-](i2v|t2v|sr)(?:[_\-](cfg|step))?(?:[_\-](distilled))?/i, (b, m) =>
    `HunyuanVideo 1.5 ${m[1].toLowerCase()} ${m[2].toUpperCase()}`
    + (m[4] ? ` ${m[3] ? m[3].toLowerCase() + "-" : ""}distilled` : "")],
];

/** Las LoRA de velocidad conocidas, con el nombre de quien las publica. */
const LORAS_OFICIALES = [
  // TaoMate-H3 (TaoLive AIGC, Alibaba): la "TAO" de 3 pasos
  [/taomate[_\-]?h3[_\-]?(\d+)[_\-]?step/i, (b, m) => `TaoMate-H3 ${m[1]} pasos`],
  // turbo de MiniMax: minimax_h3_ref2v_turbo_4step_v0.1, minimax_h3_fl2v_turbo_4step_v1.0_768p
  [/minimax[_\-]?h3[_\-](ref2v|fl2v)a?[_\-]turbo[_\-](\d+)[_\-]?steps?/i, (b, m) => {
    const res = b.match(/[_\-](\d+p)(?=$|[_\-.])/i)?.[1];
    return `H3 ${/^ref/i.test(m[1]) ? "Ref2V" : "FL2V"} Turbo ${m[2]} pasos`
      + (versionDe(b) ? " v" + versionDe(b) : "") + (res ? " " + res.toLowerCase() : "");
  }],
  // lightx2v de Wan 2.2: una para la mitad high noise y otra para la low
  [/wan2\.?2[_\-](i2v|t2v)[_\-]lightx2v[_\-](\d+)[_\-]?steps?/i, (b, m) =>
    `Wan2.2 ${m[1].toUpperCase()} Lightx2v ${m[2]} pasos` + (versionDe(b) ? " v" + versionDe(b) : "")
    + (/high[_\-]noise/i.test(b) ? " high" : /low[_\-]noise/i.test(b) ? " low" : "")],
  [/hunyuanvideo[_\-]?1\.5[_\-](i2v|t2v)[_\-](\d+p)[_\-]lightx2v[_\-](\d+)[_\-]?steps?/i, (b, m) =>
    `HunyuanVideo 1.5 ${m[1].toUpperCase()} ${m[2].toLowerCase()} Lightx2v ${m[3]} pasos`],
  [/ltx[_\-]?2\.5[_\-](\d+)b[_\-]distilled[_\-]lora(?:[_\-](\d+))?/i, (b, m) =>
    `LTX-2.5 ${m[1]}B Distilled LoRA${m[2] ? " " + m[2] : ""}`],
];

function nombreSegun(reglas, base) {
  for (const [rx, nombre] of reglas) {
    const m = base.match(rx);
    if (m) return nombre(base, m);
  }
  return "";
}

/**
 * El nombre oficial del modelo de un archivo:
 * "minimax\\Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors" -> "Singularity Ref2VA v1.3",
 * "minimax_h3_ref2va_pruned_int8_convrot.safetensors" -> "MiniMax H3 Ref2VA".
 * Si no es uno conocido, un nombre corto sacado del archivo.
 */
export function nombreModelo(archivo) {
  const base = baseDe(archivo);
  if (!base) return "";
  const oficial = nombreSegun(MODELOS_OFICIALES, base);
  if (!oficial) return nombreCorto(base);
  const v = varianteDe(base, /\.gguf$/i.test(String(archivo)));
  return v ? `${oficial} ${v}` : oficial;
}

/**
 * El nombre oficial de una LoRA: "TaoMate-H3-3step-ComfyUI.safetensors" -> "TaoMate-H3 3 pasos",
 * "minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors" -> "H3 Ref2V Turbo 4 pasos v0.1".
 */
export function nombreLora(archivo) {
  return nombreSegun(LORAS_OFICIALES, baseDe(archivo))
    || nombreCorto(archivo, 24, ["minimax", "h3", "lora", "ref2v", "ref2va"]);
}

/**
 * El modelo de una corrida, sacado otra vez de sus archivos: así las corridas
 * guardadas antes también salen con el nombre oficial. Los archivos que son un
 * mismo modelo (las dos mitades de Wan) cuentan una vez.
 */
export function modeloDe(d) {
  if (!d) return "";
  if (!d.archivo) return d.modelo || "";
  const nombres = [...new Set(String(d.archivo).split(" + ").map(nombreModelo).filter(Boolean))];
  if (!nombres.length) return d.modelo || "";
  return nombres[0] + (nombres.length > 1 ? ` +${nombres.length - 1}` : "");
}

/** Las LoRA de una corrida, con el nombre oficial si se sabe el archivo. */
export function lorasDe(d) {
  return (d?.loras || []).map((l) => (l.archivo ? { ...l, nombre: nombreLora(l.archivo) } : l));
}

/** El redondeo de MinimaxH3LatentUpscaler3D (align 32, VAE 16). */
export function ladoEscalado(px, escala) {
  return Math.round(Math.round((px * escala) / 32) * 32 / 16) * 16;
}

const activo = (n) => (n?.mode ?? 0) === 0;
const claseDe = (n) => n?.comfyClass || n?.type;
const valorWidget = (n, name) => n?.widgets?.find((w) => w.name === name)?.value;
const tieneWidget = (n, name) => (n?.widgets || []).some((w) => w.name === name);
const round2 = (x) => Math.round(Number(x) * 100) / 100;
const entradaCon = (n, name) => (n?.inputs || []).find((i) => (i.name === name || i.widget?.name === name) && i.link != null);

/** El valor de una entrada: el del nodo del otro lado del cable, o el de su widget. */
function valorEntrada(graph, n, name) {
  const entrada = entradaCon(n, name);
  let fuente = n;
  if (entrada) {
    const links = graph?.links;
    const link = links?.get?.(entrada.link) ?? links?.[entrada.link];
    const id = link?.origin_id ?? (Array.isArray(link) ? link[1] : undefined);
    fuente = graph?.getNodeById?.(id) ?? (graph?._nodes || graph?.nodes || []).find((x) => x.id === id);
    if (!fuente) return {};
  }
  return { valor: entrada ? fuente.widgets?.[0]?.value : valorWidget(n, name), control: valorWidget(fuente, "control_after_generate") };
}

/**
 * Los archivos de modelo de los cargadores encendidos, sin repetir: el Cargar
 * H3 primero y después los UNET, GGUF y checkpoints de cualquier workflow
 * (Wan, LTX, Hunyuan...).
 */
export function modelosDelGrafo(nodos) {
  const cine = nodos.filter((n) => claseDe(n) === "CineCargarH3").map((n) => valorWidget(n, "modelo"));
  const otros = nodos.filter((n) => claseDe(n) !== "CineCargarH3")
    .map((n) => valorWidget(n, "unet_name") ?? valorWidget(n, "ckpt_name"));
  return [...new Set([...cine, ...otros].filter(Boolean).map(String))];
}

/** Las LoRA que de verdad actúan: las cuatro del Cargar H3 y los LoraLoader de ComfyUI. Fuerza 0 no cuenta. */
export function lorasDelGrafo(nodos) {
  const out = [];
  const sumar = (archivo, fuerza) => {
    const f = Number(fuerza);
    if (!archivo || archivo === "ninguno" || archivo === "None" || !Number.isFinite(f) || f === 0) return;
    out.push({ nombre: nombreLora(archivo), fuerza: round2(f), archivo: String(archivo).split(/[\\/]/).pop() });
  };
  for (const n of nodos) {
    if (claseDe(n) === "CineCargarH3") {
      sumar(valorWidget(n, "lora"), valorWidget(n, "lora_fuerza"));
      for (const i of [2, 3, 4]) sumar(valorWidget(n, `lora_${i}`), valorWidget(n, `lora_fuerza_${i}`));
    } else if (tieneWidget(n, "lora_name")) {
      sumar(valorWidget(n, "lora_name"), valorWidget(n, "strength_model"));
    }
  }
  return out;
}

/**
 * Con qué se va a hacer esta corrida, leído del grafo al empezar: el modelo
 * (del Cargar H3 o de cualquier cargador UNET/GGUF/checkpoint), las LoRA,
 * pasos/sampler/resolución del Optimizador (o del Render H3, o del KSampler de
 * cualquier workflow), si el progresivo se aplicó, el refinado, la semilla y
 * la rama del Interruptor o del Selector.
 * config: la del servidor si ya llegó ("executed" del Optimizador).
 */
export function detalleCorrida(graph, config = null) {
  const nodos = (graph?._nodes || graph?.nodes || []).filter(activo);
  const deClase = (c) => nodos.find((n) => claseDe(n) === c);
  const primero = (name) => nodos.find((n) => tieneWidget(n, name));
  const d = {};
  const modelos = modelosDelGrafo(nodos);
  if (modelos.length) {
    d.archivo = modelos.map((m) => m.split(/[\\/]/).pop()).join(" + ");
    d.modelo = modeloDe(d);
  }
  d.loras = lorasDelGrafo(nodos);
  const cargadorCine = deClase("CineCargarH3");
  if (cargadorCine && tieneWidget(cargadorCine, "acelerador")) {
    const tipo = String(valorWidget(cargadorCine, "acelerador") || "Sin acelerador");
    const archivoAcc = tipo.includes("Acc/PDD")
      ? valorWidget(cargadorCine, "acc_lora")
      : tipo.includes("VDN-H3") ? valorWidget(cargadorCine, "vdn_lora") : "";
    const sv = valorWidget(cargadorCine, "shift_video");
    const sa = valorWidget(cargadorCine, "shift_audio");
    d.acelerador = tipo === "Sin acelerador" ? "ninguno" :
      `${tipo}${archivoAcc && archivoAcc !== "ninguno" ? ` (${String(archivoAcc).split(/[\\/]/).pop()})` : ""}`;
    if (sv != null && sa != null) d.shift = `${sv}/${sa}`;
  }
  const escenaCine = deClase("CineEscenaH3");
  if (escenaCine) {
    const refs = [1, 2, 3].filter((i) => entradaCon(escenaCine, `referencia_${i}`)).length;
    const guia = Boolean(entradaCon(escenaCine, "imagen_guia"));
    d.tarea = refs || guia ? "reference-to-video" : "text-to-video";
    d.referencias = `${refs} referencia${refs === 1 ? "" : "s"}${guia ? " + guía" : ""}`;
  }
  const director = deClase("CineCameraDirectorH3");
  if (director && tieneWidget(director, "perfil_modelo")) {
    d.perfil_camara = String(valorWidget(director, "perfil_modelo") || "MiniMax H3");
  }
  const c = config || deClase("CineH3Optimizer")?.__h3Preview?.config;
  const render = deClase("CineRenderH3");
  const refinar = deClase("CineEscalarRefinar");
  // Solo cuenta un Escalar y refinar activo. La config del Optimizador puede
  // pedir refinado aunque el nodo esté omitido o apagado en el grafo.
  // Cuando le llega por cable, el valor sale de esa config.
  const deRefinar = (name, clave) => (c && entradaCon(refinar, name) ? c[clave] : valorWidget(refinar, name));
  const refina = Boolean(refinar) && deRefinar("activar", "refine") !== false;
  const escala = Number(refinar ? deRefinar("escala", "refine_scale") : c?.refine_scale) || 1;
  if (c) {
    d.pasos = c.steps; d.sampler = c.sampler; d.scheduler = c.scheduler;
    if (c.width && c.height) {
      const e = refina ? escala : 1;
      d.resolucion = e > 1 ? `${ladoEscalado(c.width, e)}×${ladoEscalado(c.height, e)}` : `${c.width}×${c.height}`;
    }
    if (c.frames) d.segundos = Math.round((c.frames / 24) * 10) / 10;
    const p = c.progressive;
    if (p?.requested) {
      d.progresivo = p.enabled ? "sí" : "no aplicó";
      if (p.enabled && p.transition_step) d.progresivo_paso = `${p.transition_step}/${p.steps || c.steps}`;
    }
  } else if (render) {
    d.pasos = valorWidget(render, "pasos"); d.sampler = valorWidget(render, "sampler");
    d.scheduler = valorWidget(render, "scheduler");
  } else {
    // cualquier otro workflow: KSampler, o BasicScheduler + KSamplerSelect
    const pasos = primero("steps"), sampler = primero("sampler_name"), scheduler = primero("scheduler");
    if (pasos) d.pasos = valorWidget(pasos, "steps");
    if (sampler) d.sampler = valorWidget(sampler, "sampler_name");
    if (scheduler) d.scheduler = valorWidget(scheduler, "scheduler");
    const lienzo = nodos.find((n) => Number(valorWidget(n, "width")) > 0 && Number(valorWidget(n, "height")) > 0);
    if (lienzo) d.resolucion = `${valorWidget(lienzo, "width")}×${valorWidget(lienzo, "height")}`;
  }
  if (refinar || c) {
    const pasosRef = String((refinar ? deRefinar("pasos", "refine_steps") : c?.refine_steps) ?? "").match(/\d+/)?.[0];
    d.refinado = refina ? `×${round2(escala)}${pasosRef ? ` ${pasosRef}p` : ""}` : "no";
  }
  // La semilla del render. Si cambia sola al encolar (randomize, increment),
  // el número del widget ya es el de la próxima corrida: no se inventa.
  const sembrador = deClase("CineH3OptimizedSampler") || render || primero("seed") || primero("noise_seed");
  const campo = ["semilla", "seed", "noise_seed"].find((x) => tieneWidget(sembrador, x) || entradaCon(sembrador, x));
  if (campo) {
    const { valor, control } = valorEntrada(graph, sembrador, campo);
    if (valor != null && valor !== "") d.semilla = control && control !== "fixed" ? `variable (${control})` : valor;
  }
  const ramas = nodos.filter((n) => ["CineInterruptor", "CineSelector"].includes(claseDe(n)))
    .map((n) => n.__cabeceraDato?.texto).filter(Boolean);
  if (ramas.length) d.rama = ramas.join(" · ");
  return d;
}

const COLUMNAS = ["fecha", "estado", "total", "modelo", "pasos", "sampler", "scheduler",
  "resolucion", "segundos", "lora", "progresivo", "refinado", "semilla", "rama", "archivo", "nodos"];

/** Las celdas de una corrida, en el orden de COLUMNAS. */
function celdas(e) {
  const d = e.detalle || {};
  const receta = [d.tarea, d.referencias, d.acelerador ? `acelerador ${d.acelerador}` : "",
    d.shift ? `shift ${d.shift}` : "", d.perfil_camara ? `cámara ${d.perfil_camara}` : ""]
    .filter(Boolean).join(" · ");
  const tiempos = (e.tramos || []).map((x) => `${x.titulo} ${formatoCorto(x.ms)}`).join(" | ");
  const nodos = [receta ? `receta: ${receta}` : "", tiempos].filter(Boolean).join(" | ");
  const loras = lorasDe(d).map((l) => `${l.nombre} ×${l.fuerza}${l.archivo ? ` (${l.archivo})` : ""}`).join(" + ");
  const progresivo = d.progresivo === "sí" ? `sí${d.progresivo_paso ? " " + d.progresivo_paso : ""}` : d.progresivo || "";
  return [e.cuando, e.estado || "", formatoCorto(e.total), modeloDe(d), d.pasos ?? "",
    d.sampler || "", d.scheduler || "", d.resolucion || "", d.segundos ?? "", loras, progresivo,
    d.refinado || "", d.semilla ?? "", d.rama || "", d.archivo || "", nodos];
}

/** El historial como tabla (separada por tabuladores) para pegar en una planilla. */
export function tablaHistorial(historial) {
  const filas = [COLUMNAS.join("\t")];
  for (const e of historial || []) filas.push(celdas(e).map((v) => String(v).replace(/[\t\n]/g, " ")).join("\t"));
  return filas.join("\n");
}

/** 27 sep 2026, 12:40 -> "2026-09-27 12:40": con año, y ordena bien en cualquier planilla. */
export function fechaRegistro(fecha = new Date()) {
  const p = (x) => String(x).padStart(2, "0");
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())} ${p(fecha.getHours())}:${p(fecha.getMinutes())}`;
}

/**
 * Una corrida para el registro permanente que escribe el servidor
 * (user/default/cineconia/registro_cronometro.csv): las columnas de Copiar
 * tabla, con la fecha completa y el nombre del workflow.
 */
export function filaRegistro(e, fecha = new Date(), workflow = "") {
  const fila = {};
  celdas(e).forEach((v, i) => { fila[COLUMNAS[i]] = String(v ?? ""); });
  fila.fecha = fechaRegistro(fecha);
  fila.workflow = String(workflow || "");
  return fila;
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
  // en curso: el nodo que corre; si no, el resto de la corrida elegida o de la última
  const ahoraTxt = medidor.estado === "corriendo" && medidor.actual ? "ahora: " + medidor.actual.titulo
    : elegida ? lineaDetalle(elegida.detalle)
    : medidor.estado === "espera" ? "Ejecuta el workflow y aquí aparece cuánto tarda cada paso."
    : lineaDetalle(historial[0]?.detalle);
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
    const fila = partesHistorial(e);
    const anchoTotal = fila.total ? ctx.measureText(fila.total).width + 10 : 0;
    ctx.fillText(recortar(ctx, fila.texto, width - PAD * 2 - anchoTotal), PAD, yy);
    if (fila.total) {
      ctx.textAlign = "right";
      ctx.fillText(fila.total, width - PAD, yy);
      ctx.textAlign = "left";
    }
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

/** El nombre del workflow abierto, para el registro. */
function nombreWorkflow() {
  try {
    const w = app.extensionManager?.workflow?.activeWorkflow || app.workflowManager?.activeWorkflow;
    return String(w?.filename || w?.name || w?.path || "").split(/[\\/]/).pop().replace(/\.json$/i, "");
  } catch { return ""; }
}

/**
 * Suma la corrida al registro permanente. El servidor la anota una sola vez
 * aunque haya dos pestañas abiertas; sin servidor (o con una versión vieja del
 * paquete) el historial del nodo sigue igual.
 */
function guardarEnRegistro(entrada, fecha) {
  const cuerpo = { id: corrida.id, fila: filaRegistro(entrada, fecha, corrida.workflow) };
  try {
    api.fetchApi("/cineconia/cronometro/registro", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
    }).catch(() => {});
  } catch { /* sin api */ }
}

function alTerminar(resumen) {
  if (!resumen) return;
  // lo que midió cada Render optimizado en esta misma corrida
  const renders = rendersDelGrafo(app.graph);
  const fecha = new Date();
  const entrada = entradaHistorial(resumen, renders, fecha, corrida.detalle);
  const nodos = cronometros();
  if (nodos.length) guardarEnRegistro(entrada, fecha);
  for (const n of nodos) {
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
    const inicio = { id: e.detail?.prompt_id || null, workflow: nombreWorkflow() };
    try { corrida = { ...inicio, detalle: detalleCorrida(app.graph) }; } catch { corrida = { ...inicio, detalle: null }; }
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
      const bajar = this.addWidget("button", "__registro", null, async () => {
        const aviso = (texto) => { bajar.label = texto; nodo.setDirtyCanvas(true, true);
          setTimeout(() => { bajar.label = "Descargar registro"; nodo.setDirtyCanvas(true, true); }, 2500); };
        try {
          const r = await api.fetchApi("/cineconia/cronometro/registro");
          if (!r.ok) { aviso(r.status === 404 ? "El registro está vacío" : "No se pudo leer el registro"); return; }
          const url = URL.createObjectURL(await r.blob());
          const a = document.createElement("a");
          a.href = url; a.download = "registro_cronometro.csv";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          aviso("Registro descargado");
        } catch { aviso("No se pudo leer el registro"); }
      }, { serialize: false });
      bajar.label = "Descargar registro";
      bajar.serialize = false;
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
