import { app } from "../../scripts/app.js";

/**
 * Rotulos que ComfyUI no dibuja en los nodos de Cine con IA.
 *
 * Archivo aparte a proposito: no toca cineconia.js. ComfyUI carga todos los
 * .js de WEB_DIRECTORY, asi que esta extension se registra sola.
 *
 * 1. Una caja de texto grande que recibe un cable se esconde, y su punto de
 *    conexion queda sin nombre: parece que la entrada no existe. Aqui se
 *    escribe el nombre al lado del punto.
 * 2. Las salidas del nodo Escena se llaman "positive · render" y "positive ·
 *    escalar" al crearlo, pero al abrir un workflow ComfyUI restaura las
 *    salidas guardadas en el archivo, sin esas etiquetas. Se reponen al cargar.
 * 3. La caja del prompt del nodo Escena dice que es la misma entrada que puede
 *    llegar por cable desde el Director, para que no parezca otra version.
 */

// Nombre para el punto cuando la caja recibe un cable. Sin entrada aqui se
// usa el nombre del campo, que coincide con la salida del otro extremo
// ("prompt" en el Director y en el Prompt simple): el cable se lee prompt -> prompt.
const ROTULOS_ENTRADA = {};

const ROTULOS_SALIDA = {
  CineEscenaH3: ["positive · render", "positive · escalar"],
};

const GUIAS = {
  CineEscenaH3: {
    prompt: "Escribe aquí tu prompt, o conecta el Director de cámara:\n" +
            "es la misma entrada. Si llega por cable, esta caja se oculta.",
  },
};

const findWidget = (node, name) => node?.widgets?.find((w) => w.name === name);

/** Caja de texto de varias lineas: la que ComfyUI esconde al conectarla. */
function esCajaDeTexto(w) {
  return Boolean(w && (w.options?.multiline || w.inputEl?.tagName === "TEXTAREA"
    || w.element?.tagName === "TEXTAREA"));
}

function posicionEntrada(node, i) {
  if (typeof node.getInputPos === "function") return node.getInputPos(i);
  if (typeof node.getConnectionPos === "function") return node.getConnectionPos(true, i);
  return null;
}

/** Dibuja el nombre junto al punto de cada caja de texto conectada. */
function dibujarRotulos(node, ctx) {
  if (node.flags?.collapsed || !node.inputs) return;
  const clase = node.comfyClass || node.type;
  node.inputs.forEach((input, i) => {
    if (input.link == null || !input.widget) return;
    const w = findWidget(node, input.widget.name);
    if (!esCajaDeTexto(w)) return;
    const pos = posicionEntrada(node, i);
    if (!pos) return;
    const texto = ROTULOS_ENTRADA[clase]?.[input.name] || input.label || input.name;
    const LG = globalThis.LiteGraph;
    ctx.save();
    ctx.font = app.canvas?.inner_text_font || `normal ${LG?.NODE_SUBTEXT_SIZE || 14}px Arial`;
    ctx.fillStyle = LG?.NODE_TEXT_COLOR || "#bbbbbb";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, pos[0] - node.pos[0] + 12, pos[1] - node.pos[1]);
    ctx.restore();
  });
}

function reponerSalidas(node) {
  const et = ROTULOS_SALIDA[node.comfyClass || node.type];
  if (!et) return;
  (node.outputs || []).forEach((o, i) => { if (et[i]) o.label = et[i]; });
}

function ponerGuias(node) {
  const guias = GUIAS[node.comfyClass || node.type];
  if (!guias) return true;
  let listas = true;
  for (const [nombre, texto] of Object.entries(guias)) {
    const w = findWidget(node, nombre);
    const el = w?.inputEl || w?.element;
    if (el && "placeholder" in el) el.placeholder = texto;
    else listas = false;           // el textarea puede crearse tarde
  }
  return listas;
}

app.registerExtension({
  name: "cineconia.etiquetas",

  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (!String(nodeData?.name || "").startsWith("Cine")) return;

    const dibujar = nodeType.prototype.onDrawForeground;
    nodeType.prototype.onDrawForeground = function (ctx) {
      const r = dibujar?.apply(this, arguments);
      try {
        dibujarRotulos(this, ctx);
        if (!this.__cineGuias) this.__cineGuias = ponerGuias(this);
      } catch (e) { console.error("[CineConIA etiquetas]", e); }
      return r;
    };

    const configurar = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function () {
      const r = configurar?.apply(this, arguments);
      try { reponerSalidas(this); } catch (e) { console.error("[CineConIA etiquetas]", e); }
      return r;
    };
  },

  async nodeCreated(node) {
    if (!String(node?.comfyClass || "").startsWith("Cine")) return;
    reponerSalidas(node);
    node.__cineGuias = ponerGuias(node);
  },
});
