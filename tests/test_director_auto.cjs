const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
// Director: con «texto de cámara automático» los botones escriben la caja de instrucción.
const acel = fs.readFileSync(path.join(__dirname, '../web/cineconia_aceleradores.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const faders = fs.readFileSync(path.join(__dirname, '../web/cineconia_faders.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/import\.meta\.url/g, '"http://localhost/x.js"');

function setup() {
  let extension;
  const pedidos = [], avisos = [];
  const api = {fetchApi: async (url, opciones) => {
    if (url !== '/cineconia/camera_auto') return {ok: true, json: async () => ({})};
    const d = JSON.parse(opciones.body);
    pedidos.push(d);
    return {ok: true, json: async () => ({texto: `CAM ${d.plano} / ${d.angulo} / ${d.movimiento}`, aviso: ''})};
  }};
  const context = vm.createContext({api, Image: class {}, URL, performance: {now: () => 0},
    app: {registerExtension(e) { extension = e; }, graph: {setDirtyCanvas() {}},
      extensionManager: {toast: {add: (t) => avisos.push(t.detail)}}},
    console: {warn() {}}, Date, setTimeout() { return 0; }, clearTimeout() {},
    TOMAS_H3: [['Libre', 'libre', ''], ['Órbita', 'Órbita 360°', 'The camera arcs around {him}.']],
    conjugarTomaH3: (x) => x.replace('{him}', 'them'), PRONOMBRES_H3: {neutro: {}}, huecosH3: () => []});
  vm.runInContext(acel + faders, context);
  return {extension, pedidos, avisos};
}

function director(extra = {}) {
  const values = {plano: 'primer plano', angulo: 'frontal', movimiento: 'fijo', intensidad: 'normal',
    lente: '85 mm', profundidad_campo: 'reducida', instruccion_camara: '', reglas_continuidad: true,
    perfil_modelo: 'MiniMax H3', camara_automatica: false, ...extra};
  return {comfyClass: 'CineCameraDirectorH3', properties: {},
    widgets: Object.entries(values).map(([name, value]) => ({name, value, type: 'combo'})),
    inputs: [], size: [440, 600], computeSize() { return this.size; }, setSize(s) { this.size = s; },
    setDirtyCanvas() {}, serialize() { return {}; },
    addWidget(type, name, value, callback, options) {
      const w = {type, name, value, callback, options}; this.widgets.push(w); return w;
    }};
}
const w = (node, name) => node.widgets.find((x) => x.name === name);
const esperar = () => new Promise((r) => setImmediate(r));
const cambiar = async (node, name, value) => { const x = w(node, name); x.value = value; x.callback?.(value); await esperar(); };

test('apagado por defecto: los botones no tocan la caja', async () => {
  const {extension, pedidos} = setup();
  const node = director({instruccion_camara: 'mi receta'});
  await extension.nodeCreated(node);
  await cambiar(node, 'plano', 'plano general');
  assert.equal(w(node, 'instruccion_camara').value, 'mi receta');
  assert.equal(pedidos.length, 0);
  assert.equal(w(node, '__rehacer_camara').label, 'Rehacer texto automático · actívalo arriba');
});

test('encendido: cada botón reescribe la caja con el texto del servidor', async () => {
  const {extension, pedidos} = setup();
  const node = director();
  await extension.nodeCreated(node);
  await cambiar(node, 'camara_automatica', true);
  assert.equal(w(node, 'instruccion_camara').value, 'CAM primer plano / frontal / fijo');
  assert.equal(node.properties.texto_auto, 'CAM primer plano / frontal / fijo');
  await cambiar(node, 'angulo', 'perfil');
  assert.equal(w(node, 'instruccion_camara').value, 'CAM primer plano / perfil / fijo');
  assert.deepEqual(Object.keys(pedidos.at(-1)),
    ['plano', 'angulo', 'movimiento', 'intensidad', 'lente', 'profundidad_campo', 'perfil_modelo']);
  assert.equal(w(node, '__rehacer_camara').label, 'Texto automático al día · pulsa para rehacer');
});

test('una edición a mano no se pisa; «Rehacer» la reemplaza a pedido', async () => {
  const {extension} = setup();
  const node = director();
  await extension.nodeCreated(node);
  await cambiar(node, 'camara_automatica', true);
  await cambiar(node, 'instruccion_camara', 'CAM primer plano / frontal / fijo. He looks into the lens.');
  assert.equal(w(node, '__rehacer_camara').label, 'Editaste la caja · pulsa para rehacer el texto');
  await cambiar(node, 'movimiento', 'acercarse');
  assert.equal(w(node, 'instruccion_camara').value, 'CAM primer plano / frontal / fijo. He looks into the lens.');
  w(node, '__rehacer_camara').callback();
  await esperar();
  assert.equal(w(node, 'instruccion_camara').value, 'CAM primer plano / frontal / acercarse');
});

test('aplicar una receta H3 la conserva aunque el modo automático siga encendido', async () => {
  const {extension} = setup();
  const node = director();
  await extension.nodeCreated(node);
  await cambiar(node, 'camara_automatica', true);
  w(node, 'Recetas H3 · elegir').value = 'Órbita 360°';
  w(node, 'Aplicar receta a la cámara').callback();
  await esperar();
  assert.equal(w(node, 'instruccion_camara').value, 'The camera arcs around them.');
  assert.equal(w(node, 'plano').value, 'sin especificar');
});

test('al apagarlo se retira el texto que escribió, pero no uno propio', async () => {
  const {extension} = setup();
  const node = director();
  await extension.nodeCreated(node);
  await cambiar(node, 'camara_automatica', true);
  await cambiar(node, 'camara_automatica', false);
  assert.equal(w(node, 'instruccion_camara').value, '');
  const propio = director({instruccion_camara: 'texto mío'});
  await extension.nodeCreated(propio);
  await cambiar(propio, 'camara_automatica', true);
  assert.equal(w(propio, 'instruccion_camara').value, 'texto mío');   // no se pisa
  await cambiar(propio, 'camara_automatica', false);
  assert.equal(w(propio, 'instruccion_camara').value, 'texto mío');
});

test('con un Python anterior (sin el campo) el Director queda como antes', async () => {
  const {extension} = setup();
  const node = director();
  node.widgets = node.widgets.filter((x) => x.name !== 'camara_automatica');
  await extension.nodeCreated(node);
  assert.equal(w(node, '__rehacer_camara'), undefined);
});
