const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
// Selector: filas de botones que ponen valores en otros nodos (modelo, pasos...).
const source = fs.readFileSync(path.join(__dirname, '../web/cineconia_selector.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
function setup(extra = {}) {
  let extension;
  const context = vm.createContext({
    app: {registerExtension(e) { extension = e; }, graph: null, canvas: {}},
    pintarCabecera() {}, COLOR_BASE: '#283436', anchoFijoAlNodo: (w) => w, esLienzoPrincipal: () => true, ...extra,
  });
  vm.runInContext(source, context);
  return {extension, context, fn: n => vm.runInContext(n, context)};
}
const plano = (x) => JSON.parse(JSON.stringify(x));

const OFICIAL = 'minimax\\minimax_h3_ref2va_pruned_int8_convrot.safetensors';
const SINGULARITY = 'minimax\\Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors';

// el 048 en miniatura: cargador, optimizador, video y la tercera referencia
function grafo() {
  const w = (name, value, values) => ({name, value, options: values ? {values} : {}, llamadas: 0,
    callback() { this.llamadas++; }});
  const nodes = [
    {id: 500, type: 'CineCargarH3', title: '03 · Modelo', mode: 0, widgets: [
      w('modelo', SINGULARITY, [OFICIAL, SINGULARITY, 'otro.safetensors'])]},
    {id: 515, type: 'CineH3Optimizer', title: '05 · Memoria', mode: 0, widgets: [
      w('modo', 'Auto', ['Auto', 'Advanced']), w('pasos_advanced', 20),
      w('sampler_advanced', 'res_multistep', ['res_multistep', 'er_sde', 'euler'])]},
    {id: 34003, type: 'VHS_VideoCombine', title: 'Vídeo', mode: 0, widgets: [w('filename_prefix', 'x')]},
    {id: 541, type: 'LoadImage', title: 'Expresiones', mode: 4, widgets: []},
  ];
  return {_nodes: nodes, byId: (id) => nodes.find(n => n.id === id),
    w: (id, name) => nodes.find(n => n.id === id).widgets.find(x => x.name === name)};
}
function filas() {
  return [
    {nombre: 'MODELO', clave: 'modelo', opciones: [
      {etiqueta: 'oficial', clave: 'oficial', valores: [{nodo: 500, widget: 'modelo', valor: OFICIAL}]},
      {etiqueta: 'Singularity', clave: 'singularity', valores: [{nodo: 500, widget: 'modelo', valor: SINGULARITY}]},
    ]},
    {nombre: 'PASOS', clave: 'pasos', opciones: [
      {etiqueta: '8 · borrador', clave: '8p', valores: [
        {nodo: 515, widget: 'modo', valor: 'Advanced'}, {nodo: 515, widget: 'pasos_advanced', valor: 8},
        {nodo: 515, widget: 'sampler_advanced', valor: 'er_sde'}]},
      {etiqueta: '20 · final', clave: '20p', valores: [{nodo: 515, widget: 'modo', valor: 'Auto'}]},
    ]},
  ];
}
const SALIDA = {nodo: 34003, widget: 'filename_prefix', plantilla: 'CineConIA/048_{modelo}_{pasos}_%date:yyyyMMdd%'};

test('un modelo en otra subcarpeta se encuentra por su nombre', () => {
  const {fn} = setup();
  const lista = {options: {values: ['a\\uno.safetensors', 'dos.safetensors']}};
  assert.deepEqual(plano(fn('valorPara')(lista, 'dos.safetensors')), {ok: true, valor: 'dos.safetensors'});
  assert.deepEqual(plano(fn('valorPara')(lista, 'minimax/UNO.safetensors')), {ok: true, valor: 'a\\uno.safetensors'});
  assert.deepEqual(plano(fn('valorPara')(lista, 'tres.safetensors')), {ok: false, motivo: 'no está en la lista: tres.safetensors'});
  // números y textos libres pasan tal cual
  assert.deepEqual(plano(fn('valorPara')({options: {}}, 8)), {ok: true, valor: 8});
  assert.deepEqual(plano(fn('valorPara')(undefined, 'x')), {ok: true, valor: 'x'});
});

test('la fila marca la opción que ya está puesta en los nodos', () => {
  const {fn} = setup();
  const g = grafo();
  assert.deepEqual(plano(fn('estado')(g, filas())), [1, 1]);
  g.w(500, 'modelo').value = OFICIAL;
  assert.deepEqual(plano(fn('estado')(g, filas())), [0, 1]);
  // a mano, un modelo que no es ninguno de los dos: personalizado
  g.w(500, 'modelo').value = 'otro.safetensors';
  assert.equal(fn('estado')(g, filas())[0], -1);
  // Advanced con otros pasos tampoco es el borrador
  g.w(515, 'modo').value = 'Advanced';
  assert.equal(fn('estado')(g, filas())[1], -1);
  g.w(515, 'pasos_advanced').value = 8;
  g.w(515, 'sampler_advanced').value = 'er_sde';
  assert.equal(fn('estado')(g, filas())[1], 0);
  assert.equal(fn('coincide')(g, {valores: []}), false);
});

test('aplicar pone los valores en orden y llama al callback de cada widget', () => {
  const {fn} = setup();
  const g = grafo();
  const ocho = filas()[1].opciones[0];
  assert.deepEqual(plano(fn('aplicar')(g, ocho)), []);
  assert.equal(g.w(515, 'modo').value, 'Advanced');
  assert.equal(g.w(515, 'pasos_advanced').value, 8);
  assert.equal(g.w(515, 'sampler_advanced').value, 'er_sde');
  assert.equal(g.w(515, 'modo').llamadas, 1);
  assert.equal(fn('coincide')(g, ocho), true);
  // el modelo se pone con el nombre que tiene en la lista
  fn('aplicar')(g, {valores: [{nodo: 500, widget: 'modelo', valor: 'minimax_h3_ref2va_pruned_int8_convrot.safetensors'}]});
  assert.equal(g.w(500, 'modelo').value, OFICIAL);
});

test('aplicar también enciende o apaga nodos', () => {
  const {fn} = setup();
  const g = grafo();
  const encender = {valores: [{nodo: 541, modo: 0}]};
  assert.equal(fn('coincide')(g, encender), false);
  fn('aplicar')(g, encender);
  assert.equal(g.byId(541).mode, 0);
  assert.equal(fn('coincide')(g, encender), true);
});

test('lo que falta se salta y se avisa, sin romper lo demás', () => {
  const {fn} = setup();
  const g = grafo();
  const mala = {valores: [
    {nodo: 999, widget: 'modelo', valor: 'x'},
    {nodo: 500, widget: 'no_existe', valor: 1},
    {nodo: 500, widget: 'modelo', valor: 'no_descargado.safetensors'},
    {nodo: 515, widget: 'pasos_advanced', valor: 12},
  ]};
  const esperado = ['falta el nodo 999', '03 · Modelo: no tiene "no_existe"',
    '03 · Modelo: no está en la lista: no_descargado.safetensors'];
  assert.deepEqual(plano(fn('problemas')(g, mala)), esperado);
  assert.deepEqual(plano(fn('aplicar')(g, mala)), esperado);
  assert.equal(g.w(500, 'modelo').value, SINGULARITY);   // no se tocó
  assert.equal(g.w(515, 'pasos_advanced').value, 12);    // lo válido sí
  assert.deepEqual(plano(fn('problemas')(g, filas()[0].opciones[0])), []);
  // un callback que falla no deja el valor a medias
  g.w(515, 'modo').callback = () => { throw new Error('x'); };
  fn('aplicar')(g, filas()[1].opciones[0]);
  assert.equal(g.w(515, 'sampler_advanced').value, 'er_sde');
});

test('el nombre del video sale de lo elegido en cada fila', () => {
  const {fn} = setup();
  const g = grafo();
  assert.equal(fn('nombreSalida')(SALIDA.plantilla, filas(), [1, 0]), 'CineConIA/048_singularity_8p_%date:yyyyMMdd%');
  assert.equal(fn('nombreSalida')(SALIDA.plantilla, filas(), [-1, 1]), 'CineConIA/048_personalizado_20p_%date:yyyyMMdd%');
  const props = {filas: filas(), salida: SALIDA};
  assert.equal(fn('actualizarSalida')(g, props), 'CineConIA/048_singularity_20p_%date:yyyyMMdd%');
  assert.equal(g.w(34003, 'filename_prefix').value, 'CineConIA/048_singularity_20p_%date:yyyyMMdd%');
  assert.equal(g.w(34003, 'filename_prefix').llamadas, 1);
  // sin cambios no vuelve a escribir
  fn('actualizarSalida')(g, props);
  assert.equal(g.w(34003, 'filename_prefix').llamadas, 1);
  assert.equal(fn('actualizarSalida')(g, {filas: filas()}), null);
  assert.equal(fn('actualizarSalida')(g, {filas: filas(), salida: {nodo: 1, widget: 'x'}}), null);
});

test('la cabecera dice lo elegido y avisa si algo está a mano', () => {
  const {fn} = setup();
  assert.deepEqual(plano(fn('cabeceraDe')(filas(), [1, 0])),
    {texto: 'Singularity · 8 · borrador', corto: 'Singularity', punto: '#3f8e63'});
  assert.deepEqual(plano(fn('cabeceraDe')(filas(), [0, -1])),
    {texto: 'oficial · personalizado', corto: 'oficial', punto: '#f0a154'});
  assert.equal(fn('cabeceraDe')([], []), null);
  assert.ok(fn('altoPara')(3) > fn('altoPara')(2));
  assert.equal(fn('altoPara')(0), fn('altoPara')(1));
});

test('se registra como nodo virtual de la categoría Cine con IA', () => {
  let registrado;
  class LGraphNode {
    constructor() { this.widgets = []; this.properties = {}; this.size = [0, 0]; }
    addCustomWidget(w) { this.widgets.push(w); return w; }
    computeSize() { return [460, 100]; }
  }
  let extension;
  const context = vm.createContext({
    app: {registerExtension(e) { extension = e; }, graph: null, canvas: {}},
    pintarCabecera() {}, COLOR_BASE: '#283436', anchoFijoAlNodo: (w) => w, esLienzoPrincipal: () => true,
    LGraphNode, LiteGraph: {registerNodeType(tipo, clase) { registrado = [tipo, clase]; }},
  });
  vm.runInContext(source, context);
  extension.registerCustomNodes();
  assert.equal(registrado[0], 'CineSelector');
  const Clase = registrado[1];
  assert.equal(Clase.title, 'Cine con IA · Selector');
  assert.equal(Clase.category, 'Cine con IA');
  const n = new Clase();
  assert.equal(n.isVirtualNode, true);
  assert.equal(n.serialize_widgets, false);
  assert.deepEqual(plano(n.properties.filas), []);
  assert.equal(n.__cabeceraDato, null);
});

test('el clic en un botón pone sus valores y renombra el video', () => {
  let registrado;
  class LGraphNode {
    constructor() { this.widgets = []; this.properties = {}; this.size = [460, 200]; }
    addCustomWidget(w) { this.widgets.push(w); return w; }
    computeSize() { return [460, this.widgets.reduce((s, w) => s + w.computeSize(460)[1], 0)]; }
    setSize(s) { this.size = s; }
    setDirtyCanvas() {}
  }
  const g = grafo();
  let extension;
  const lienzo = {fill() {}, stroke() {}, beginPath() {}, roundRect() {}, moveTo() {}, lineTo() {},
    fillText() {}, save() {}, restore() {}, measureText: (s) => ({width: String(s).length * 6})};
  const context = vm.createContext({
    app: {registerExtension(e) { extension = e; }, graph: g, canvas: {graph: g, setDirty() {}}},
    pintarCabecera() {}, COLOR_BASE: '#283436', anchoFijoAlNodo: (w) => w, esLienzoPrincipal: (ctx) => ctx.canvas !== 'panel',
    LGraphNode, LiteGraph: {registerNodeType(tipo, clase) { registrado = [tipo, clase]; }},
  });
  vm.runInContext(source, context);
  extension.registerCustomNodes();
  const n = new registrado[1]();
  n.graph = g;
  n.properties.filas = filas();
  n.properties.salida = SALIDA;
  const w = n.widgets.find(x => x.name === '__selector');
  w.draw(lienzo, n, 460, 40);
  assert.equal(n.size[1], w.computeSize(460)[1]);   // crece con las filas
  assert.equal(n.__cabeceraDato.texto, 'Singularity · 20 · final');
  // fila PASOS (la segunda), botón de la izquierda: 8 pasos
  const y = 40 + 18 + 30 + 8 + 15;
  assert.equal(w.mouse({type: 'pointerdown'}, [10 + 96 + 20, y], n), true);
  assert.equal(g.w(515, 'modo').value, 'Advanced');
  assert.equal(g.w(515, 'pasos_advanced').value, 8);
  assert.equal(g.w(34003, 'filename_prefix').value, 'CineConIA/048_singularity_8p_%date:yyyyMMdd%');
  // fila MODELO, botón de la izquierda: oficial
  assert.equal(w.mouse({type: 'pointerdown'}, [10 + 96 + 20, 40 + 18 + 15], n), true);
  assert.equal(g.w(500, 'modelo').value, OFICIAL);
  assert.equal(g.w(34003, 'filename_prefix').value, 'CineConIA/048_oficial_8p_%date:yyyyMMdd%');
  assert.equal(n.__cabeceraDato.texto, 'oficial · 8 · borrador');
  // el panel lateral lo pinta más angosto y más arriba: los clics en el nodo siguen igual
  w.draw({...lienzo, canvas: 'panel'}, n, 298, 1);
  assert.equal(w.mouse({type: 'pointerdown'}, [10 + 96 + 20, y], n), true);
  assert.equal(g.w(515, 'modo').value, 'Advanced');
  assert.equal(n.__cabeceraDato.texto, 'oficial · 8 · borrador');
  // en la columna de los nombres o fuera de las filas no hace nada
  assert.equal(w.mouse({type: 'pointerdown'}, [30, y], n), false);
  assert.equal(w.mouse({type: 'pointerdown'}, [200, 5], n), false);
  assert.equal(w.mouse({type: 'pointermove'}, [10 + 96 + 20, y], n), false);
});

test('un modelo guardado con barras de Windows cuenta como elegido en Linux', () => {
  const {fn} = setup();
  const g = grafo();
  const w = g.w(500, 'modelo');
  w.options.values = ['minimax/minimax_h3_ref2va_pruned_int8_convrot.safetensors',
    'minimax/Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors'];
  w.value = SINGULARITY;   // tal como viene en el JSON, con "\\"
  assert.deepEqual(plano(fn('estado')(g, filas())), [1, 1]);
  fn('aplicar')(g, filas()[0].opciones[0]);
  assert.equal(w.value, 'minimax/minimax_h3_ref2va_pruned_int8_convrot.safetensors');
  assert.deepEqual(plano(fn('estado')(g, filas())), [0, 1]);
});
