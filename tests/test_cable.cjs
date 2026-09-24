// Un widget que llega por cable lo decide el nodo conectado: los botones del
// nodo solo lo muestran y no deben poder cambiarlo (el valor propio se ignora).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../web/cineconia.js'), 'utf8')
  .replace(/\r\n/g, '\n');
const cortar = (desde, hasta) => source.slice(source.indexOf(desde), source.indexOf(hasta, source.indexOf(desde)));
const cable = cortar('function cableDe(', '/** Los widgets puramente visuales');
const chips = cortar('function addChips(', '/**\n * Titulo de apartado');

function contexto(graph) {
  const ctx = vm.createContext({
    app: { graph },
    findWidget: (node, name) => node.widgets?.find((w) => w.name === name),
    roundRect() {}, ACCENT: '#e08a3c', CHIP_BG: '#222', CHIP_FG: '#ccc', CHIP_ON_FG: '#111',
    Math, Number, String,
  });
  vm.runInContext(cable + '\n' + chips, ctx);
  return ctx;
}

const lienzo = new Proxy({ measureText: (t) => ({ width: String(t).length * 7 }) },
  { get: (o, k) => (k in o ? o[k] : () => {}) });

function escena(conectado) {
  const optimizador = {
    id: 1, title: '03A · Memoria · nuestro Auto',
    outputs: [{ name: 'config' }, { name: 'escala_refinado' }],
    __h3Preview: { config: { refine: true, refine_scale: 1.27, refine_steps: '4 pasos  ·  recomendado' } },
  };
  const escalar = {
    id: 2, widgets: [{ name: 'escala', value: 1.5 }],
    inputs: [{ name: 'escala', widget: { name: 'escala' }, link: conectado ? 7 : null }],
    setDirtyCanvas() {},
  };
  const graph = {
    links: new Map([[7, { origin_id: 1, origin_slot: 1 }]]),
    getNodeById: (id) => ({ 1: optimizador, 2: escalar })[id],
  };
  escalar.graph = graph;
  return { graph, escalar };
}

test('conectado: el valor que manda es el del Optimizador, no el del widget', () => {
  const { graph, escalar } = escena(true);
  const r = contexto(graph).valorEfectivo(escalar, 'escala');
  assert.equal(r.valor, 1.27);
  assert.equal(r.desde, '03A · Memoria · nuestro Auto');
});

test('suelto: manda el widget del propio nodo', () => {
  const { graph, escalar } = escena(false);
  const r = contexto(graph).valorEfectivo(escalar, 'escala');
  assert.equal(r.valor, 1.5);
  assert.equal(r.desde, null);
});

for (const conectado of [true, false]) {
  test(`los botones ${conectado ? 'no cambian' : 'cambian'} la escala ${conectado ? 'conectada' : 'suelta'}`, () => {
    const { graph, escalar } = escena(conectado);
    const w = contexto(graph).addChips(escalar, 'escala', [['1.5x', 1.5], ['2x', 2.0]], 'escala');
    w.draw(lienzo, escalar, 400, 0);   // coloca los botones
    // el segundo boton (2x) esta a la derecha del primero en la misma fila
    const x = 10 + ('1.5x'.length * 7 + 16) + 5 + 4;
    w.mouse({ type: 'pointerdown' }, [x, 17 + 5 + 4], escalar);
    assert.equal(escalar.widgets[0].value, conectado ? 1.5 : 2.0);
  });
}
