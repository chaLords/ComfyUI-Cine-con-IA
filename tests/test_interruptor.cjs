const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
// Interruptor: qué grupos lista, qué nodos caen en cada uno y el encendido de una sola rama.
const source = fs.readFileSync(path.join(__dirname, '../web/cineconia_interruptor.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
function setup() {
  let extension;
  const context = vm.createContext({
    app: {registerExtension(e) { extension = e; }, graph: null, canvas: {}},
    pintarCabecera() {}, COLOR_BASE: '#283436',
  });
  vm.runInContext(source, context);
  return {extension, fn: n => vm.runInContext(n, context)};
}
const plano = (x) => JSON.parse(JSON.stringify(x));

// el 045 en miniatura: dos ramas, un grupo compartido y nodos sueltos
function grafo() {
  const nodo = (id, pos, mode = 0, type = 'X') => ({id, type, pos, size: [400, 200], mode});
  const nodes = [
    nodo(504, [1660, 0]),                       // compartido
    nodo(515, [2200, 0]), nodo(516, [2740, 0]), nodo(34003, [3740, 0]),        // borrador
    nodo(513, [2200, 1400], 4), nodo(514, [2740, 1400], 4), nodo(34000, [3740, 1400], 4),  // final
    nodo(521, [2170, 100], 0, 'CineInterruptor'),   // aunque caiga en una rama, no se apaga
    nodo(900, [9000, 9000]),                   // fuera de todo
  ];
  const groups = [
    {title: 'RAMA · 20 pasos · final', _bounding: [2170, 1335, 2060, 1330]},
    {title: 'GENERACIÓN · escena', _bounding: [1630, -65, 520, 1290]},
    {title: 'rama · 8 pasos · borrador', pos: [2170, -65], size: [2060, 1330]},   // otra versión de LiteGraph
  ];
  return {_nodes: nodes, _groups: groups, byId: (id) => nodes.find(n => n.id === id)};
}

test('lista solo los grupos del prefijo, de arriba abajo, sin importar mayúsculas', () => {
  const {fn} = setup();
  const g = grafo();
  assert.deepEqual(plano(fn('gruposDe')(g, 'RAMA').map(x => x.title)), ['rama · 8 pasos · borrador', 'RAMA · 20 pasos · final']);
  assert.deepEqual(plano(fn('gruposDe')(g, '  generación ').map(x => x.title)), ['GENERACIÓN · escena']);
  assert.equal(fn('gruposDe')(g, '').length, 0);
});

test('un nodo es de un grupo si su centro cae dentro', () => {
  const {fn} = setup();
  const g = grafo();
  const [borrador, final] = fn('gruposDe')(g, 'RAMA');
  assert.deepEqual(plano(fn('nodosDe')(g, borrador).map(n => n.id)), [515, 516, 34003]);
  assert.deepEqual(plano(fn('nodosDe')(g, final).map(n => n.id)), [513, 514, 34000]);
  // borde exacto: cuenta como dentro
  assert.equal(fn('dentro')([2170, -65], [2170, -65, 10, 10]), true);
  assert.equal(fn('rectGrupo')({}), null);
});

test('el título de la rama se lee sin el prefijo', () => {
  const {fn} = setup();
  assert.equal(fn('etiqueta')('RAMA · 8 pasos · borrador', 'RAMA'), '8 pasos · borrador');
  assert.equal(fn('etiqueta')('rama: final', 'RAMA'), 'final');
  assert.equal(fn('etiqueta')('RAMA', 'RAMA'), 'RAMA');
});

test('encender una rama pasa las otras a bypass y no toca lo demás', () => {
  const {fn} = setup();
  const g = grafo();
  const grupos = fn('gruposDe')(g, 'RAMA');
  const cambios = fn('encender')(g, grupos, grupos[1]);
  assert.equal(cambios, 6);
  for (const id of [513, 514, 34000]) assert.equal(g.byId(id).mode, 0, id);
  for (const id of [515, 516, 34003]) assert.equal(g.byId(id).mode, 4, id);
  for (const id of [504, 521, 900]) assert.equal(g.byId(id).mode, 0, id);
  // volver a pulsar la misma no cambia nada
  assert.equal(fn('encender')(g, grupos, grupos[1]), 0);
});

test('un nodo silenciado dentro de la rama elegida vuelve a normal', () => {
  const {fn} = setup();
  const g = grafo();
  g.byId(516).mode = 2;
  const grupos = fn('gruposDe')(g, 'RAMA');
  assert.equal(fn('estadoRama')(fn('nodosDe')(g, grupos[0])), 'mixta');
  fn('encender')(g, grupos, grupos[0]);
  assert.equal(g.byId(516).mode, 0);
});

test('un nodo que cae en dos ramas queda encendido con la elegida', () => {
  const {fn} = setup();
  const g = grafo();
  g._groups.push({title: 'RAMA · extra', _bounding: [2700, -65, 600, 400]});   // se solapa con el borrador
  const grupos = fn('gruposDe')(g, 'RAMA');
  const borrador = grupos.find(x => x.title.startsWith('rama'));
  fn('encender')(g, grupos, borrador);
  assert.equal(g.byId(516).mode, 0);
  const extra = grupos.find(x => x.title === 'RAMA · extra');
  fn('encender')(g, grupos, extra);
  assert.equal(g.byId(516).mode, 0);
  assert.equal(g.byId(515).mode, 4);
});

test('el estado sale del modo real de los nodos y va a la cabecera', () => {
  const {fn} = setup();
  const g = grafo();
  let r = fn('resumen')(g, 'RAMA');
  assert.deepEqual(plano(r.ramas.map(x => [x.titulo, x.estado, x.nodos])),
    [['8 pasos · borrador', 'encendida', 3], ['20 pasos · final', 'apagada', 3]]);
  assert.deepEqual(plano(r.cabecera), {texto: '8 pasos · borrador', corto: '8 pasos', punto: '#3f8e63'});
  // bypass a mano de todo: ninguna encendida
  for (const n of g._nodes) if (n.type !== 'CineInterruptor') n.mode = 4;
  r = fn('resumen')(g, 'RAMA');
  assert.equal(r.cabecera.corto, 'NINGUNA');
  // todo encendido: varias
  for (const n of g._nodes) n.mode = 0;
  assert.equal(fn('resumen')(g, 'RAMA').cabecera.texto, '2 ENCENDIDAS');
  // sin ramas: sin cápsula
  assert.equal(fn('resumen')(g, 'NADA').cabecera, null);
  assert.equal(fn('estadoRama')([]), 'vacia');
});

test('el alto del nodo crece con las ramas', () => {
  const {fn} = setup();
  assert.ok(fn('altoPara')(3) > fn('altoPara')(2));
  assert.equal(fn('altoPara')(0), fn('altoPara')(1));
});

test('se registra como nodo virtual de la categoría Cine con IA', () => {
  let registrado;
  class LGraphNode {
    constructor(title) { this.title = title; this.widgets = []; this.properties = {}; this.size = [0, 0]; }
    addWidget(type, name, value, cb, opts) { const w = {type, name, value, callback: cb, options: opts}; this.widgets.push(w); return w; }
    addCustomWidget(w) { this.widgets.push(w); return w; }
    computeSize() { return [440, this.widgets.reduce((s, w) => s + (w.computeSize ? w.computeSize(440)[1] : 20), 0)]; }
    setDirtyCanvas() {}
  }
  let extension;
  const context = vm.createContext({
    app: {registerExtension(e) { extension = e; }, graph: null, canvas: {}},
    pintarCabecera() {}, COLOR_BASE: '#283436',
    LGraphNode, LiteGraph: {registerNodeType(tipo, clase) { registrado = [tipo, clase]; }},
  });
  vm.runInContext(source, context);
  extension.registerCustomNodes();
  assert.equal(registrado[0], 'CineInterruptor');
  const Clase = registrado[1];
  assert.equal(Clase.title, 'Cine con IA · Interruptor');
  assert.equal(Clase.category, 'Cine con IA');
  const n = new Clase('x');
  assert.equal(n.isVirtualNode, true);
  assert.equal(n.serialize_widgets, false);
  assert.equal(n.properties.prefijo, 'RAMA');
  // el campo del prefijo escribe en properties (lo que se guarda)
  const campo = n.widgets.find(w => w.name === 'prefijo');
  campo.callback('  Toma ');
  assert.equal(n.properties.prefijo, 'Toma');
  campo.callback('');
  assert.equal(n.properties.prefijo, 'RAMA');
  // al cargar un workflow, el campo recupera el prefijo guardado
  n.properties.prefijo = 'PLANO';
  n.onConfigure();
  assert.equal(campo.value, 'PLANO');
});

test('el clic en una fila enciende esa rama', () => {
  let registrado;
  class LGraphNode {
    constructor() { this.widgets = []; this.properties = {}; this.size = [440, 200]; }
    addWidget(type, name, value, cb, opts) { const w = {type, name, value, callback: cb, options: opts}; this.widgets.push(w); return w; }
    addCustomWidget(w) { this.widgets.push(w); return w; }
    computeSize() { return [440, 200]; }
    setSize(s) { this.size = s; }
    setDirtyCanvas() {}
  }
  const g = grafo();
  let extension;
  const lienzo = {fill() {}, stroke() {}, beginPath() {}, roundRect() {}, arc() {}, moveTo() {}, lineTo() {},
    fillText() {}, save() {}, restore() {}, measureText: (s) => ({width: String(s).length * 6})};
  const context = vm.createContext({
    app: {registerExtension(e) { extension = e; }, graph: g, canvas: {graph: g, setDirty() {}}},
    pintarCabecera() {}, COLOR_BASE: '#283436',
    LGraphNode, LiteGraph: {registerNodeType(tipo, clase) { registrado = [tipo, clase]; }},
  });
  vm.runInContext(source, context);
  extension.registerCustomNodes();
  const n = new registrado[1]();
  n.graph = g;
  const w = n.widgets.find(x => x.name === '__interruptor');
  w.draw(lienzo, n, 440, 40);
  assert.equal(n.__cabeceraDato.corto, '8 pasos');
  // la segunda fila es la del final
  const y = 40 + 18 + 34 + 6 + 10;
  assert.equal(w.mouse({type: 'pointerdown'}, [100, y], n), true);
  assert.equal(g.byId(513).mode, 0);
  assert.equal(g.byId(515).mode, 4);
  // fuera de las filas no hace nada
  assert.equal(w.mouse({type: 'pointerdown'}, [100, 5], n), false);
  assert.equal(w.mouse({type: 'pointermove'}, [100, y], n), false);
  w.draw(lienzo, n, 440, 40);
  assert.equal(n.__cabeceraDato.texto, '20 pasos · final');
});
