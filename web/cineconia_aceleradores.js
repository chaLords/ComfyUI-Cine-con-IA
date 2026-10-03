import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * Cine con IA · compatibilidad de aceleradores H3
 *
 * Las reglas viven en Python (nodes.py y acc_pdd.py) y llegan por
 * /cineconia/aceleradores. Aquí solo se evalúan, para que Cargar modelo y el
 * Optimizador muestren opacas y sin clic las opciones que el servidor
 * rechazaría al encolar. Nada se cambia solo: lo ya elegido se marca en rojo
 * con el motivo, y ajustarlo es un clic del usuario.
 */

// --- lógica (sin DOM: se prueba en tests/test_aceleradores.cjs) ---------------

const nombre = (s) => String(s ?? "").split(/[\\/]/).pop();
const tipoDe = (n) => n?.comfyClass || n?.type;
const widgetDe = (n, name) => n?.widgets?.find((w) => w.name === name);
const valorDe = (n, name) => widgetDe(n, name)?.value;

export function igual(a, b) {
  if (typeof b === "boolean") return Boolean(a) === b;
  if (typeof b === "number") return Math.abs(Number(a) - b) < 1e-6;
  return String(a) === String(b);
}

/** Ref2VA o FL2VA, como _variant() de acc_pdd.py; "" si no hay una sola. */
export function variante(archivo) {
  const hallado = new Set(String(archivo ?? "").toLowerCase().match(/ref2va|fl2va/g) || []);
  return hallado.size === 1 ? [...hallado][0] : "";
}

/** LoRA de las ranuras normales que ya son aceleradores (TaoMate, lightx2v…). */
export function lorasAceleradoras(c, loras) {
  const patron = new RegExp(c.lora_aceleradora);
  return (loras || []).filter((l) => l && l !== "ninguno" && patron.test(String(l).toLowerCase()));
}

/** Lo que importa del Cargar modelo para decidir. */
export function lecturaCargador(n) {
  return {
    perfil: String(valorDe(n, "perfil") ?? ""),
    modelo: String(valorDe(n, "modelo") ?? ""),
    loras: ["lora", "lora_2", "lora_3", "lora_4"].map((x) => valorDe(n, x)),
    acelerador: String(valorDe(n, "acelerador") ?? ""),
    acc_lora: String(valorDe(n, "acc_lora") ?? "ninguno"),
    vdn_lora: String(valorDe(n, "vdn_lora") ?? "ninguno"),
    shift: [Number(valorDe(n, "shift_video")), Number(valorDe(n, "shift_audio"))],
  };
}

/** Por qué no se puede elegir ese acelerador con lo que hay puesto, o null. */
export function bloqueoAcelerador(c, acelerador, cargador) {
  const reglas = c?.reglas?.[acelerador];
  if (!reglas) return null;
  // "Personalizado" deduce la familia por el nombre de los archivos en Python.
  if (cargador.perfil && cargador.perfil !== c.perfil && cargador.perfil !== "Personalizado") {
    return `solo funciona con el perfil ${c.perfil}`;
  }
  const otra = lorasAceleradoras(c, cargador.loras)[0];
  if (otra) return `quita ${nombre(otra)} de las LoRA: ya es un acelerador`;
  if (reglas.sin_gguf && /\.gguf$/i.test(cargador.modelo)) return "no admite modelos GGUF";
  if (reglas.exige_variante && !variante(nombre(cargador.modelo))) {
    return "el nombre del modelo debe decir Ref2VA o FL2VA";
  }
  return null;
}

/** Lo que el servidor rechazaría con el acelerador elegido, sin apagar nada. */
export function avisosAcelerador(c, cargador) {
  const reglas = c?.reglas?.[cargador.acelerador];
  if (!reglas) return [];
  const avisos = [];
  const bloqueo = bloqueoAcelerador(c, cargador.acelerador, cargador);
  if (bloqueo) avisos.push(bloqueo);
  const archivo = cargador[reglas.archivo];
  if (!archivo || archivo === "ninguno") {
    avisos.push(`falta elegir el archivo ${reglas.corto}`);
  } else {
    const vm = variante(nombre(cargador.modelo)), va = variante(nombre(archivo));
    if (vm && va && vm !== va) avisos.push(`el archivo es ${va} y el modelo ${vm}`);
    if (reglas.mismo_pruned && /pruned/i.test(cargador.modelo) !== /pruned/i.test(archivo)) {
      avisos.push("modelo y archivo deben ser ambos pruned o ambos completos");
    }
  }
  if (!igual(cargador.shift[0], c.shift[0]) || !igual(cargador.shift[1], c.shift[1])) {
    avisos.push(`usa shift ${c.shift[0]}/${c.shift[1]}`);
  }
  return avisos;
}

const LEGIBLE = {
  modo: "modo", pasos_advanced: "pasos", sampler_advanced: "sampler",
  scheduler_advanced: "scheduler", denoise_advanced: "denoise", muestreo: "muestreo",
  refinar: "segundo pase",
};

export function textoRegla(campo, valor) {
  const v = typeof valor === "boolean" ? (valor ? "sí" : "no") : String(valor);
  return `${LEGIBLE[campo] || campo} ${v}`;
}

/** Valores que el acelerador fija en el Optimizador, o null si no fija nada. */
export function reglasOptimizador(c, acelerador) {
  return c?.reglas?.[acelerador]?.optimizador || null;
}

/** Campos que hoy no cumplen las reglas: [[campo, actual, pedido], ...]. */
export function conflictos(reglas, leer) {
  return Object.entries(reglas || {})
    .filter(([campo, valor]) => !igual(leer(campo), valor))
    .map(([campo, valor]) => [campo, leer(campo), valor]);
}

/**
 * Motivo para no aceptar `nuevo` en `campo`, o null. Solo impide salir del
 * valor fijado: si ya estaba mal (workflow viejo), cualquier cambio vale.
 */
export function rechazo(reglas, campo, previo, nuevo) {
  if (!reglas || !(campo in reglas)) return null;
  const fijo = reglas[campo];
  return igual(previo, fijo) && !igual(nuevo, fijo) ? textoRegla(campo, fijo) : null;
}

function enlace(graph, id) {
  if (id == null || !graph) return null;
  return graph.links?.get?.(id) ?? graph.links?.[id] ?? graph.getLink?.(id) ?? null;
}

function nodoPorId(graph, id) {
  return graph?.getNodeById?.(id) ?? (graph?._nodes || graph?.nodes || []).find((n) => n.id === id) ?? null;
}

/**
 * El Cargar modelo que alimenta al Render de este Optimizador: config -> Render,
 * y de su entrada model hacia arriba. Si no hay cable, el único Cargar activo.
 */
export function cargadorDe(graph, optimizador) {
  for (const id of optimizador?.outputs?.[0]?.links || []) {
    let n = nodoPorId(graph, enlace(graph, id)?.target_id);
    for (let paso = 0; n && paso < 12; paso++) {
      const entrada = (n.inputs || []).find((i) => i.link != null && (i.name === "model" || i.type === "MODEL"));
      n = nodoPorId(graph, enlace(graph, entrada?.link)?.origin_id);
      if (tipoDe(n) === "CineCargarH3") return n;
    }
  }
  const activos = (graph?._nodes || graph?.nodes || [])
    .filter((n) => tipoDe(n) === "CineCargarH3" && (n.mode ?? 0) === 0);
  return activos.length === 1 ? activos[0] : null;
}

// --- contrato del servidor y avisos ------------------------------------------

let contrato = null;
let pedido = null;

/** Pide el contrato una vez. Con un Python viejo no llega y no se apaga nada. */
export function cargarContrato() {
  pedido ??= api.fetchApi("/cineconia/aceleradores")
    .then((r) => (r.ok ? r.json() : null))
    .then((c) => {
      contrato = c;
      app.graph?.setDirtyCanvas?.(true, true);
      return c;
    })
    .catch(() => null);
  return pedido;
}

export const contratoActual = () => contrato;

let ultimoAviso = { texto: "", t: 0 };

/** Explica por qué no se pudo; el mismo texto no se repite en ráfaga. */
export function avisar(texto) {
  const ahora = Date.now();
  if (texto === ultimoAviso.texto && ahora - ultimoAviso.t < 2000) return;
  ultimoAviso = { texto, t: ahora };
  console.warn("[Cine con IA]", texto);
  app?.extensionManager?.toast?.add?.({ severity: "warn", summary: "Combinación no compatible",
    detail: texto, life: 6000 });
}
