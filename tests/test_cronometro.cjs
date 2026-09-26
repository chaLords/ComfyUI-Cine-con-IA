const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
// Cronómetro: tramos por nodo, total, historial y dato de la cabecera.
const source = fs.readFileSync(path.join(__dirname, '../web/cineconia_cronometro.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
function setup() {
  let extension;
  const context = vm.createContext({
    app: {registerExtension(e) { extension = e; }, graph: null, canvas: {}},
    api: {addEventListener() {}},
    pintarCabecera() {}, COLOR_BASE: '#283436', anchoFijoAlNodo: (w) => w, esLienzoPrincipal: () => true,
    performance: {now: () => 0}, setInterval() { return 1; }, clearInterval() {},
  });
  vm.runInContext(source, context);
  return {extension, fn: n => vm.runInContext(n, context)};
}
const titulos = {1: 'Escena', 2: '04A · Render normal', 3: 'Salida A'};
// los objetos creados dentro del vm tienen otro Array: se comparan en plano
const plano = (x) => JSON.parse(JSON.stringify(x));

test('el reloj se lee como en un cronómetro', () => {
  const {fn} = setup();
  assert.equal(fn('formatoReloj')(212400), '3:32.4');
  assert.equal(fn('formatoReloj')(5000), '0:05.0');
  assert.equal(fn('formatoCorto')(212400), '3:32');
  assert.equal(fn('formatoReloj')(3723000), '1:02:03');
});

test('cada nodo cuenta desde que empieza hasta que empieza el siguiente', () => {
  const {fn} = setup();
  const M = fn('Medidor'); const m = new M(id => titulos[id]);
  m.empezar(1000, {timestamp: 50000});
  m.cache({nodes: ['7', '8']});
  m.ejecutando(1010, '1');
  m.ejecutando(4010, '2');
  m.progreso({value: 7, max: 20});
  assert.deepEqual({...m.paso}, {value: 7, max: 20});
  m.ejecutando(216410, '3');
  const r = m.terminar(226410, 'listo', {timestamp: 275500});
  assert.deepEqual(plano(r.tramos.map(t => [t.titulo, t.ms])), [['Escena', 3000], ['04A · Render normal', 212400], ['Salida A', 10000]]);
  assert.equal(r.total, 225500);          // marcas del servidor
  assert.equal(r.enCache, 2);
  assert.equal(m.paso, null);
});

test('si no llega el aviso de éxito, el executing vacío cierra la corrida', () => {
  const {fn} = setup();
  const M = fn('Medidor'); const m = new M(id => titulos[id]);
  m.empezar(0);
  m.ejecutando(0, '1');
  m.ejecutando(500, null);
  assert.equal(m.estado, 'listo');
  assert.equal(m.total(), 500);
  // y no se cierra dos veces
  assert.equal(m.terminar(900, 'listo'), null);
});

test('con muchos nodos quedan los que más tardaron y el resto se suma', () => {
  const {fn} = setup();
  const M = fn('Medidor'); const m = new M(id => 'n' + id);
  m.empezar(0);
  let t = 0;
  for (let i = 1; i <= 10; i++) { m.ejecutando(t, String(i)); t += i * 100; }
  m.terminar(t, 'listo');
  const v = m.tramosVisibles(t, 4);
  assert.equal(v.length, 4);
  assert.deepEqual(plano(v.slice(0, 3).map(x => x.titulo)), ['n8', 'n9', 'n10']);
  assert.equal(v[3].titulo, 'otros 7 nodos');
  assert.equal(v[3].ms, (1 + 2 + 3 + 4 + 5 + 6 + 7) * 100);
});

test('el historial guarda el total y el muestreo de cada Render optimizado', () => {
  const {fn} = setup();
  const e = fn('entradaHistorial')({estado: 'listo', total: 760400}, [{modo: 'normal', ms: 312000}, {modo: 'progresivo', ms: 212400}], new Date(2026, 8, 24, 19, 42));
  assert.equal(fn('textoHistorial')(e), '24/09 19:42 · total 12:40 · normal 5:12 · progresivo 3:32');
  const f = fn('entradaHistorial')({estado: 'interrumpido', total: 60000}, [], new Date(2026, 8, 24, 20, 5));
  assert.equal(fn('textoHistorial')(f), '24/09 20:05 · total 1:00 · interrumpido');
});

test('la cabecera dice si está corriendo o cómo terminó', () => {
  const {fn} = setup();
  const M = fn('Medidor'); const m = new M(() => 'x');
  assert.equal(fn('datoCabecera')(m, 0), null);
  m.empezar(0);
  assert.equal(fn('datoCabecera')(m, 65000).texto, 'EN CURSO · 1:05');
  m.terminar(90000, 'listo');
  assert.equal(fn('datoCabecera')(m, 999999).texto, 'LISTO · 1:30');
  m.empezar(0); m.terminar(1000, 'error');
  assert.equal(fn('datoCabecera')(m, 0).punto, '#ed6976');
});

test('el nombre del modelo se lee corto', () => {
  const {fn} = setup();
  const nm = fn('nombreModelo');
  assert.equal(nm('minimax\\Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors'), 'Singularity v1.3');
  assert.equal(nm('minimax\\minimax_h3_ref2va_pruned_int8_convrot.safetensors'), 'H3 oficial');
  assert.equal(nm('otro/modelo.gguf'), 'modelo');
  assert.equal(nm(''), '');
});

// un grafo como el del 047/048: cargador, optimizador, selector
function grafo(config, extra = {}) {
  const w = (name, value) => ({name, value});
  return {_nodes: [
    {type: 'CineCargarH3', mode: 0, widgets: [w('modelo', 'minimax\\Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors')]},
    {type: 'CineCargarH3', mode: 4, widgets: [w('modelo', 'minimax\\minimax_h3_ref2va_pruned_int8_convrot.safetensors')]},
    {type: 'CineH3Optimizer', mode: 0, __h3Preview: {config}},
    {type: 'CineSelector', mode: 0, __cabeceraDato: {texto: 'Singularity v1.3 · 20 · final'}},
    ...(extra.nodos || []),
  ]};
}
const CONFIG = {steps: 20, sampler: 'res_multistep', scheduler: 'simple', width: 544, height: 928,
  frames: 124, refine: true, refine_scale: 1.27};

test('cada corrida sabe con qué se hizo', () => {
  const {fn} = setup();
  const d = plano(fn('detalleCorrida')(grafo(CONFIG)));
  assert.deepEqual(d, {modelo: 'Singularity v1.3', archivo: 'Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors',
    pasos: 20, sampler: 'res_multistep', scheduler: 'simple', resolucion: '704×1184', segundos: 5.2,
    rama: 'Singularity v1.3 · 20 · final'});
  // la config que manda el servidor manda sobre la vista previa
  const d2 = plano(fn('detalleCorrida')(grafo(CONFIG), {...CONFIG, steps: 8, sampler: 'er_sde', refine: false}));
  assert.equal(d2.pasos, 8);
  assert.equal(d2.resolucion, '544×928');
});

test('el historial guarda el detalle y el desglose por nodo, y se copia como tabla', () => {
  const {fn} = setup();
  const M = fn('Medidor'); const m = new M(id => ({1: '06 · Render', 2: '07 · Escalar'})[id]);
  m.empezar(0); m.ejecutando(0, '1'); m.ejecutando(654000, '2');
  const r = m.terminar(866000, 'listo');
  const d = fn('detalleCorrida')(grafo(CONFIG));
  const e = fn('entradaHistorial')(r, [], new Date(2026, 8, 26, 13, 57), d);
  assert.equal(fn('textoHistorial')(e), '26/09 13:57 · Singularity v1.3 · 20p · 704×1184 · 14:26');
  assert.deepEqual(plano(e.tramos), [{titulo: '06 · Render', ms: 654000}, {titulo: '07 · Escalar', ms: 212000}]);
  const tabla = fn('tablaHistorial')([e]).split('\n');
  assert.equal(tabla.length, 2);
  assert.ok(tabla[0].startsWith('fecha\testado\ttotal\tmodelo\tpasos'));
  assert.ok(tabla[1].includes('Singularity v1.3\t20\tres_multistep\tsimple\t704×1184\t5.2'));
  assert.ok(tabla[1].endsWith('06 · Render 10:54 | 07 · Escalar 3:32'));
});

test('las corridas viejas, sin detalle, se siguen leyendo igual', () => {
  const {fn} = setup();
  const vieja = {cuando: '26/09 12:51', estado: 'listo', total: 656000, renders: [{modo: 'normal', ms: 490000}]};
  assert.equal(fn('textoHistorial')(vieja), '26/09 12:51 · total 10:56 · normal 8:10');
  assert.ok(fn('tablaHistorial')([vieja]).split('\n')[1].startsWith('26/09 12:51\tlisto\t10:56'));
});
